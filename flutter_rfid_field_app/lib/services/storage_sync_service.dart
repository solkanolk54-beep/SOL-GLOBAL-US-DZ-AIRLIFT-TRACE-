import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:csv/csv.dart';
import 'package:path_provider/path_provider.dart';
import '../models/livestock_tag.dart';

/// Storage & Offline Sync Engine for high-speed field operations
class StorageSyncService extends ChangeNotifier {
  final List<LivestockTagScan> _scans = [];
  final Set<String> _seenRfidCache = {};
  final String serverBaseUrl;
  bool _isSyncing = false;
  bool _isOnline = true;
  String _lastSyncMessage = 'جاهز للمسح الميداني';

  StorageSyncService({this.serverBaseUrl = 'http://localhost:3000'}) {
    _seedInitialInventory();
  }

  List<LivestockTagScan> get scans => List.unmodifiable(_scans);
  int get totalScanned => _scans.length;
  int get uniqueHeadsCount => _seenRfidCache.length;
  int get duplicateCount => _scans.where((s) => s.isDuplicate).length;
  int get pendingSyncCount => _scans.where((s) => !s.isSynced && !s.isDuplicate).length;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;
  String get lastSyncMessage => _lastSyncMessage;

  void toggleOnline(bool online) {
    _isOnline = online;
    notifyListeners();
    if (_isOnline && pendingSyncCount > 0) {
      triggerBackgroundSync();
    }
  }

  /// Process incoming tag from RFID Gun trigger or NFC
  LivestockTagScan registerRfidScan({
    required String rfidTag,
    String checkpoint = 'Adrar Quarantine Primary Terminal',
    String operatorId = 'OP-FIELD-01',
  }) {
    final cleanTag = rfidTag.trim().toUpperCase();
    final isAlreadySeen = _seenRfidCache.contains(cleanTag);

    // Build or fetch cattle details
    final scan = LivestockTagScan(
      id: 'scan_${DateTime.now().microsecondsSinceEpoch}',
      rfidTag: cleanTag,
      scannedAt: DateTime.now(),
      checkpoint: checkpoint,
      operatorId: operatorId,
      isSynced: false,
      isDuplicate: isAlreadySeen,
      duplicateCount: isAlreadySeen ? 1 : 0,
      usEarTag: 'USA-TX-2024-${cleanTag.replaceAll(RegExp(r'[^0-9]'), '').padRight(4, '0').substring(0, 4)}',
      dzNationalId: 'DZ-ADR-01-${cleanTag.replaceAll(RegExp(r'[^0-9]'), '').padRight(4, '0').substring(0, 4)}',
      breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
      currentWeightKg: 620.0 + (cleanTag.hashCode % 45),
      geneticMeritTpi: 2920 + (cleanTag.hashCode % 80),
      pregnancyStatus: 'confirmed_pregnant',
      inseminationDate: '2026-08-12',
      averageMilkYieldL: 36.5 + (cleanTag.hashCode % 5),
      quarantineStatus: 'quarantine_holding',
    );

    _seenRfidCache.add(cleanTag);
    _scans.insert(0, scan);
    notifyListeners();

    // Auto trigger sync if online
    if (_isOnline && !scan.isDuplicate) {
      triggerBackgroundSync();
    }

    return scan;
  }

  /// Update veterinary clinical flags or milking note
  void updateCattleStatus(String scanId, {String? urgentFlag, String? vetNote}) {
    final index = _scans.indexWhere((s) => s.id == scanId);
    if (index != -1) {
      _scans[index].urgentFlag = urgentFlag;
      _scans[index].vetNote = vetNote;
      _scans[index].isSynced = false; // Mark for re-sync
      notifyListeners();
      if (_isOnline) {
        triggerBackgroundSync();
      }
    }
  }

  /// Bulk sync queue to Central Platform
  Future<bool> triggerBackgroundSync() async {
    if (_isSyncing || !_isOnline) return false;
    final pending = _scans.where((s) => !s.isSynced && !s.isDuplicate).toList();
    if (pending.isEmpty) return true;

    _isSyncing = true;
    _lastSyncMessage = 'جاري مزامنة ${pending.length} رأس مع الخادم المركزي...';
    notifyListeners();

    try {
      final payload = {
        'timestamp': DateTime.now().toIso8601String(),
        'source': 'FLUTTER_HANDHELD_RFID_GUN',
        'scans': pending.map((s) => s.toJson()).toList(),
      };

      final response = await http.post(
        Uri.parse('$serverBaseUrl/api/livestock/bulk-scan'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        for (var scan in pending) {
          scan.isSynced = true;
        }
        _lastSyncMessage = 'تمت مزامنة ${pending.length} رأس بنجاح مع المركز المركزي';
        _isSyncing = false;
        notifyListeners();
        return true;
      } else {
        _lastSyncMessage = 'فشلت المزامنة (كود الخطأ: ${response.statusCode})، البيانات محفوظة محلياً';
        _isSyncing = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _lastSyncMessage = 'الشبكة غير متاحة: تم الاحتفاظ بالسجلات في طابور الأوفلاين';
      _isSyncing = false;
      notifyListeners();
      return false;
    }
  }

  /// Export scanned dataset as JSON string
  String exportToJson() {
    return jsonEncode({
      'exportTimestamp': DateTime.now().toIso8601String(),
      'totalRecords': _scans.length,
      'uniqueHeads': uniqueHeadsCount,
      'records': _scans.map((s) => s.toJson()).toList(),
    });
  }

  /// Export scanned dataset as CSV string (RFC 4180 standard)
  String exportToCsv() {
    List<List<dynamic>> rows = [
      LivestockTagScan.csvHeaders,
      ..._scans.map((s) => s.toCsvRow()),
    ];
    return const ListToCsvConverter().convert(rows);
  }

  /// Save CSV / JSON file to device storage (Accessible by Termux)
  Future<String> saveExportFile(String format) async {
    final content = format == 'csv' ? exportToCsv() : exportToJson();
    final ext = format == 'csv' ? 'csv' : 'json';
    final fileName = 'sol_rfid_export_${DateTime.now().millisecondsSinceEpoch}.$ext';
    
    // In Android / Termux environment
    Directory dir;
    try {
      dir = await getApplicationDocumentsDirectory();
    } catch (_) {
      dir = Directory.current;
    }
    
    final file = File('${dir.path}/$fileName');
    await file.writeAsString(content);
    return file.path;
  }

  void clearBatch() {
    _scans.clear();
    _seenRfidCache.clear();
    _lastSyncMessage = 'تم تفريغ دفعة المسح الحالية، جاهز لبدء جولة جديدة';
    notifyListeners();
  }

  void _seedInitialInventory() {
    registerRfidScan(rfidTag: 'RFID-CTL-9021');
    registerRfidScan(rfidTag: 'RFID-CTL-9022');
    registerRfidScan(rfidTag: 'RFID-CTL-9023');
    registerRfidScan(rfidTag: 'RFID-CTL-9024');
    for (var s in _scans) {
      s.isSynced = true;
    }
  }
}
