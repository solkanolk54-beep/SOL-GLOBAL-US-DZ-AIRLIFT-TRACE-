import 'package:flutter/material.dart';
import '../services/storage_sync_service.dart';
import '../services/rfid_hardware_service.dart';
import '../models/livestock_tag.dart';
import 'cattle_detail_sheet.dart';

class BulkScanScreen extends StatefulWidget {
  final StorageSyncService storageService;
  final RfidHardwareService hardwareService;

  const BulkScanScreen({
    Key? key,
    required this.storageService,
    required this.hardwareService,
  }) : super(key: key);

  @override
  State<BulkScanScreen> createState() => _BulkScanScreenState();
}

class _BulkScanScreenState extends State<BulkScanScreen> {
  final TextEditingController _manualTagController = TextEditingController();
  bool _sunlightHighContrast = false;

  @override
  void dispose() {
    _manualTagController.dispose();
    super.dispose();
  }

  void _openDetailSheet(LivestockTagScan scan) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CattleDetailSheet(
        scan: scan,
        storageService: widget.storageService,
      ),
    );
  }

  void _handleManualScan() {
    final text = _manualTagController.text.trim();
    if (text.isNotEmpty) {
      widget.hardwareService.onTagReceived(text);
      _manualTagController.clear();
    }
  }

  void _exportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('تصدير بيانات الكسح الميداني', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الرؤوس الممسوحة: ${widget.storageService.uniqueHeadsCount} | إجمالي القراءات: ${widget.storageService.totalScanned}',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 16),
              const Text(
                'اختر الصيغة المطلوبة للحفظ أو النقل إلى بيئة Termux الميدانية:',
                style: TextStyle(color: Colors.white60, fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton.icon(
              onPressed: () async {
                final path = await widget.storageService.saveExportFile('csv');
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('تم تصدير ملف CSV: $path')),
                );
              },
              icon: const Icon(Icons.table_chart_outlined, color: Color(0xFF10B981)),
              label: const Text('تصدير CSV', style: TextStyle(color: Color(0xFF10B981))),
            ),
            TextButton.icon(
              onPressed: () async {
                final path = await widget.storageService.saveExportFile('json');
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('تم تصدير ملف JSON: $path')),
                );
              },
              icon: const Icon(Icons.data_object, color: Colors.blueAccent),
              label: const Text('تصدير JSON', style: TextStyle(color: Colors.blueAccent)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.storageService,
      builder: (context, _) {
        final scans = widget.storageService.scans;
        final bgColor = _sunlightHighContrast ? Colors.black : const Color(0xFF0B1120);
        final cardColor = _sunlightHighContrast ? const Color(0xFF1F2937) : const Color(0xFF1E293B);

        return Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            backgroundColor: bgColor,
            appBar: AppBar(
              backgroundColor: const Color(0xFF0F172A),
              elevation: 4,
              title: Row(
                children: [
                  const Icon(Icons.qr_code_scanner, color: Color(0xFF10B981), size: 24),
                  const SizedBox(width: 8),
                  const Text(
                    'كسح RFID الميداني • SOL Global',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              actions: [
                // Sunlight Mode Toggle
                IconButton(
                  tooltip: 'وضع التباين العالي للشمس',
                  icon: Icon(
                    _sunlightHighContrast ? Icons.light_mode : Icons.dark_mode_outlined,
                    color: _sunlightHighContrast ? Colors.amber : Colors.white70,
                  ),
                  onPressed: () {
                    setState(() {
                      _sunlightHighContrast = !_sunlightHighContrast;
                    });
                  },
                ),
                // Network online/offline toggle
                IconButton(
                  tooltip: widget.storageService.isOnline ? 'متصل بالشبكة (Online)' : 'أوفلاين في الحقل (Offline)',
                  icon: Icon(
                    widget.storageService.isOnline ? Icons.wifi : Icons.wifi_off,
                    color: widget.storageService.isOnline ? const Color(0xFF10B981) : Colors.amber,
                  ),
                  onPressed: () {
                    widget.storageService.toggleOnline(!widget.storageService.isOnline);
                  },
                ),
                // Export Dialog
                IconButton(
                  tooltip: 'تصدير للبيئة الميدانية / Termux',
                  icon: const Icon(Icons.download, color: Colors.white70),
                  onPressed: () => _exportDialog(context),
                ),
              ],
            ),
            body: Column(
              children: [
                // 1. Tactical Sunlight Metric Banners
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.08))),
                  ),
                  child: Row(
                    children: [
                      _buildMetricBox('الرؤوس الفريدة', '${widget.storageService.uniqueHeadsCount}', const Color(0xFF10B981)),
                      const SizedBox(width: 8),
                      _buildMetricBox('إجمالي الكسح', '${widget.storageService.totalScanned}', Colors.white),
                      const SizedBox(width: 8),
                      _buildMetricBox('مكرر محجوب', '${widget.storageService.duplicateCount}', Colors.amber),
                      const SizedBox(width: 8),
                      _buildMetricBox('طابور الأوفلاين', '${widget.storageService.pendingSyncCount}', Colors.cyanAccent),
                    ],
                  ),
                ),

                // 2. Status & Sync Notification Strip
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: widget.storageService.isSyncing
                      ? Colors.blue.withOpacity(0.2)
                      : const Color(0xFF1E293B),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            widget.storageService.isSyncing ? Icons.sync : Icons.satellite_alt_outlined,
                            size: 16,
                            color: widget.storageService.isSyncing ? Colors.blueAccent : const Color(0xFF10B981),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            widget.storageService.lastSyncMessage,
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                        ],
                      ),
                      if (widget.storageService.pendingSyncCount > 0 && widget.storageService.isOnline)
                        GestureDetector(
                          onTap: () => widget.storageService.triggerBackgroundSync(),
                          child: const Text(
                            'مزامنة الآن',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                          ),
                        ),
                    ],
                  ),
                ),

                // 3. Hardware Gun Trigger & Rapid Burst Bar
                Container(
                  padding: const EdgeInsets.all(12),
                  color: const Color(0xFF131C31),
                  child: Row(
                    children: [
                      // Manual Scan Input
                      Expanded(
                        child: TextField(
                          controller: _manualTagController,
                          onSubmitted: (_) => _handleManualScan(),
                          style: const TextStyle(fontFamily: 'monospace', color: Colors.white),
                          decoration: InputDecoration(
                            hintText: 'مسح يدوي أو إدخال RFID (مثال: RFID-CTL-9025)...',
                            hintStyle: const TextStyle(fontSize: 12, color: Colors.white38),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.white12),
                            ),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.arrow_back, color: Color(0xFF10B981)),
                              onPressed: _handleManualScan,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Rapid Burst Trigger Button
                      ElevatedButton.icon(
                        onPressed: () {
                          if (widget.hardwareService.isBurstScanning) {
                            widget.hardwareService.stopBurstSimulation();
                            setState(() {});
                          } else {
                            widget.hardwareService.startBurstSimulation(targetCount: 25, speedMs: 140);
                            setState(() {});
                          }
                        },
                        icon: Icon(
                          widget.hardwareService.isBurstScanning ? Icons.stop : Icons.bolt,
                          color: Colors.black,
                          size: 18,
                        ),
                        label: Text(
                          widget.hardwareService.isBurstScanning ? 'إيقاف النبض' : 'كسح سريع (Burst)',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: widget.hardwareService.isBurstScanning ? Colors.amber : const Color(0xFF10B981),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                ),

                // 4. Live Scanned Feeds List
                Expanded(
                  child: scans.isEmpty
                      ? const Center(
                          child: Text(
                            'بانتظار تلقي إشارات الـ RFID من القارئ المحمول...\nاضغط زر الزناد أو ابدأ الكسح السريع',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white38, fontSize: 14),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: scans.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (ctx, index) {
                            final item = scans[index];
                            return _buildScanListItem(item, cardColor);
                          },
                        ),
                ),

                // 5. Bottom Hardware Trigger Floating Control
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Colors.white10)),
                  ),
                  child: Row(
                    children: [
                      // Trigger Button (Simulates RFID Gun physical trigger key)
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final simulatedTag = 'RFID-CTL-${9020 + (DateTime.now().millisecondsSinceEpoch % 15)}';
                            widget.hardwareService.onTagReceived(simulatedTag);
                          },
                          icon: const Icon(Icons.flash_on, color: Colors.black),
                          label: const Text(
                            'زناد القارئ المحمول (Gun Trigger)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () => widget.storageService.clearBatch(),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white70,
                          side: const BorderSide(color: Colors.white24),
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('تفريغ الدفعة'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetricBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.white60)),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanListItem(LivestockTagScan item, Color cardColor) {
    return GestureDetector(
      onTap: () => _openDetailSheet(item),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: item.isDuplicate
                ? Colors.amber.withOpacity(0.5)
                : item.urgentFlag != null
                    ? Colors.redAccent.withOpacity(0.5)
                    : Colors.white10,
            width: item.isDuplicate || item.urgentFlag != null ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            // Status Icon
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: item.isDuplicate
                    ? Colors.amber.withOpacity(0.15)
                    : const Color(0xFF10B981).withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                item.isDuplicate ? Icons.repeat : Icons.check,
                color: item.isDuplicate ? Colors.amber : const Color(0xFF10B981),
                size: 18,
              ),
            ),
            const SizedBox(width: 12),

            // Tag & Cattle Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        item.rfidTag,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (item.isDuplicate)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'مكرر',
                            style: TextStyle(fontSize: 10, color: Colors.amber, fontWeight: FontWeight.bold),
                          ),
                        ),
                      if (item.urgentFlag != null)
                        Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.urgentFlag!,
                            style: const TextStyle(fontSize: 9, color: Colors.redAccent, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${item.usEarTag} • ${item.currentWeightKg.toStringAsFixed(0)} كغ • TPI +${item.geneticMeritTpi}',
                    style: const TextStyle(fontSize: 12, color: Colors.white60),
                  ),
                ],
              ),
            ),

            // Sync Status & Time
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    Icon(
                      item.isSynced ? Icons.cloud_done : Icons.cloud_off,
                      size: 14,
                      color: item.isSynced ? const Color(0xFF10B981) : Colors.cyanAccent,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      item.isSynced ? 'متزامن' : 'أوفلاين',
                      style: TextStyle(
                        fontSize: 10,
                        color: item.isSynced ? const Color(0xFF10B981) : Colors.cyanAccent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.scannedAt.hour.toString().padLeft(2, '0')}:${item.scannedAt.minute.toString().padLeft(2, '0')}:${item.scannedAt.second.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white38),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
