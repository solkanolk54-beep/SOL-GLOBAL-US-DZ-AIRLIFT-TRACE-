import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'services/storage_sync_service.dart';
import 'services/rfid_hardware_service.dart';
import 'views/bulk_scan_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storageService = StorageSyncService(
    serverBaseUrl: 'http://localhost:3000',
  );

  final hardwareService = RfidHardwareService(
    storageService: storageService,
  );

  runApp(LivestockFieldApp(
    storageService: storageService,
    hardwareService: hardwareService,
  ));
}

class LivestockFieldApp extends StatelessWidget {
  final StorageSyncService storageService;
  final RfidHardwareService hardwareService;

  const LivestockFieldApp({
    Key? key,
    required this.storageService,
    required this.hardwareService,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SOL Global RFID Field Scanner',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar', 'DZ'),
      supportedLocales: const [
        Locale('ar', 'DZ'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B1120),
        primaryColor: const Color(0xFF10B981),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFF06B6D4),
          surface: Color(0xFF0F172A),
          background: Color(0xFF0B1120),
        ),
        fontFamily: 'sans-serif',
      ),
      home: BulkScanScreen(
        storageService: storageService,
        hardwareService: hardwareService,
      ),
    );
  }
}
