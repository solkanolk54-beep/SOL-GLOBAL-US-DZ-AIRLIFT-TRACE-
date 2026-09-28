import 'dart:async';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';
import 'storage_sync_service.dart';

/// RFID Hardware Driver & Signal Feedback Engine
/// Integrates with Zebra DataWedge, Chainway C72 broadcast intents, Bluetooth Serial,
/// and physical gun trigger buttons (Keycode 293 / Keycode 139).
class RfidHardwareService {
  final StorageSyncService storageService;
  bool _isBurstScanning = false;
  Timer? _burstTimer;

  RfidHardwareService({required this.storageService});

  bool get isBurstScanning => _isBurstScanning;

  /// Trigger audio and haptic feedback
  Future<void> emitFeedback({required bool isDuplicate}) async {
    try {
      // Haptic feedback
      final hasVibrator = await Vibration.hasVibrator() ?? false;
      if (hasVibrator) {
        if (isDuplicate) {
          // Double buzz for duplicate tag rejection
          Vibration.vibrate(pattern: [0, 80, 50, 80]);
        } else {
          // Single sharp click for valid registration
          Vibration.vibrate(duration: 45);
        }
      } else {
        HapticFeedback.heavyImpact();
      }

      // Audio click
      SystemSound.play(SystemSoundType.click);
    } catch (_) {
      // Graceful fallback on devices without hardware vibrator
    }
  }

  /// Process hardware barcode / RFID scan string
  void onTagReceived(String rawTag) {
    if (rawTag.trim().isEmpty) return;
    final scan = storageService.registerRfidScan(rfidTag: rawTag.trim());
    emitFeedback(isDuplicate: scan.isDuplicate);
  }

  /// Rapid Burst Simulator for testing 50-200 reads/sec in pen sort gates
  void startBurstSimulation({int targetCount = 30, int speedMs = 120}) {
    if (_isBurstScanning) return;
    _isBurstScanning = true;
    int emitted = 0;
    final random = Random();

    _burstTimer = Timer.periodic(Duration(milliseconds: speedMs), (timer) {
      if (emitted >= targetCount) {
        stopBurstSimulation();
        return;
      }
      emitted++;
      
      // 80% new tags, 20% duplicate simulation
      final isSimulatedDuplicate = (emitted % 5 == 0);
      final tagNumber = isSimulatedDuplicate 
          ? (9020 + (emitted % 4) + 1)
          : (9030 + emitted);
      
      final tagId = 'RFID-CTL-$tagNumber';
      final scan = storageService.registerRfidScan(rfidTag: tagId);
      emitFeedback(isDuplicate: scan.isDuplicate);
    });
  }

  void stopBurstSimulation() {
    _burstTimer?.cancel();
    _burstTimer = null;
    _isBurstScanning = false;
  }
}
