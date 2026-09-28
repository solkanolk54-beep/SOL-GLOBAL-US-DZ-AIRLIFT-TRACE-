import 'dart:convert';

/// Represents an individual ISO 11784/11785 FDX-B / HDX Livestock RFID tag
/// scanned in field environments (quarantine barns, airlift tarmac, feedlots).
class LivestockTagScan {
  final String id;
  final String rfidTag; // e.g. "982 000123456789" or "RFID-CTL-9021"
  final DateTime scannedAt;
  final String checkpoint; // e.g. "Adrar Quarantine Barn-A", "Tarmac Gate-4"
  final String operatorId;
  bool isSynced;
  bool isDuplicate;
  int duplicateCount;
  
  // Cattle Clinical & Genetic Profile
  final String usEarTag;
  final String dzNationalId;
  final String breed;
  final double currentWeightKg;
  final int geneticMeritTpi;
  final String pregnancyStatus;
  final String? inseminationDate;
  final double averageMilkYieldL;
  final String quarantineStatus;
  String? vetNote;
  String? urgentFlag; // e.g., 'QUARANTINE_ISOLATE', 'HEAT_STRESS_SEVERE', 'FMD_BOOSTER'

  LivestockTagScan({
    required this.id,
    required this.rfidTag,
    required this.scannedAt,
    this.checkpoint = 'Adrar Quarantine Primary Terminal',
    this.operatorId = 'OP-FIELD-01',
    this.isSynced = false,
    this.isDuplicate = false,
    this.duplicateCount = 0,
    this.usEarTag = '',
    this.dzNationalId = '',
    this.breed = 'Purebred Holstein Friesian (أمريكي أصيل)',
    this.currentWeightKg = 640.0,
    this.geneticMeritTpi = 2950,
    this.pregnancyStatus = 'confirmed_pregnant',
    this.inseminationDate = '2026-08-12',
    this.averageMilkYieldL = 36.5,
    this.quarantineStatus = 'quarantine_holding',
    this.vetNote,
    this.urgentFlag,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rfidTag': rfidTag,
      'scannedAt': scannedAt.toIso8601String(),
      'checkpoint': checkpoint,
      'operatorId': operatorId,
      'isSynced': isSynced,
      'isDuplicate': isDuplicate,
      'duplicateCount': duplicateCount,
      'usEarTag': usEarTag,
      'dzNationalId': dzNationalId,
      'breed': breed,
      'currentWeightKg': currentWeightKg,
      'geneticMeritTpi': geneticMeritTpi,
      'pregnancyStatus': pregnancyStatus,
      'inseminationDate': inseminationDate,
      'averageMilkYieldL': averageMilkYieldL,
      'quarantineStatus': quarantineStatus,
      'vetNote': vetNote,
      'urgentFlag': urgentFlag,
    };
  }

  factory LivestockTagScan.fromJson(Map<String, dynamic> map) {
    return LivestockTagScan(
      id: map['id'] ?? 'scan_${DateTime.now().millisecondsSinceEpoch}',
      rfidTag: map['rfidTag'] ?? '',
      scannedAt: DateTime.tryParse(map['scannedAt'] ?? '') ?? DateTime.now(),
      checkpoint: map['checkpoint'] ?? 'Adrar Quarantine Primary Terminal',
      operatorId: map['operatorId'] ?? 'OP-FIELD-01',
      isSynced: map['isSynced'] ?? false,
      isDuplicate: map['isDuplicate'] ?? false,
      duplicateCount: map['duplicateCount'] ?? 0,
      usEarTag: map['usEarTag'] ?? '',
      dzNationalId: map['dzNationalId'] ?? '',
      breed: map['breed'] ?? 'Purebred Holstein Friesian (أمريكي أصيل)',
      currentWeightKg: (map['currentWeightKg'] as num?)?.toDouble() ?? 640.0,
      geneticMeritTpi: (map['geneticMeritTpi'] as num?)?.toInt() ?? 2950,
      pregnancyStatus: map['pregnancyStatus'] ?? 'confirmed_pregnant',
      inseminationDate: map['inseminationDate'],
      averageMilkYieldL: (map['averageMilkYieldL'] as num?)?.toDouble() ?? 36.5,
      quarantineStatus: map['quarantineStatus'] ?? 'quarantine_holding',
      vetNote: map['vetNote'],
      urgentFlag: map['urgentFlag'],
    );
  }

  List<dynamic> toCsvRow() {
    return [
      rfidTag,
      scannedAt.toIso8601String(),
      usEarTag,
      dzNationalId,
      currentWeightKg,
      geneticMeritTpi,
      pregnancyStatus,
      averageMilkYieldL,
      quarantineStatus,
      urgentFlag ?? 'NONE',
      vetNote ?? '',
      isSynced ? 'SYNCED' : 'PENDING_OFFLINE',
    ];
  }

  static List<String> get csvHeaders => [
    'RFID_TAG',
    'SCANNED_AT',
    'US_EAR_TAG',
    'DZ_NATIONAL_ID',
    'WEIGHT_KG',
    'GENETIC_TPI',
    'PREGNANCY_STATUS',
    'MILK_YIELD_L',
    'QUARANTINE_STATUS',
    'URGENT_FLAG',
    'VET_NOTE',
    'SYNC_STATUS'
  ];
}
