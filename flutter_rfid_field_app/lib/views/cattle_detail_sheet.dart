import 'package:flutter/material.dart';
import '../models/livestock_tag.dart';
import '../services/storage_sync_service.dart';

class CattleDetailSheet extends StatefulWidget {
  final LivestockTagScan scan;
  final StorageSyncService storageService;

  const CattleDetailSheet({
    Key? key,
    required this.scan,
    required this.storageService,
  }) : super(key: key);

  @override
  State<CattleDetailSheet> createState() => _CattleDetailSheetState();
}

class _CattleDetailSheetState extends State<CattleDetailSheet> {
  late TextEditingController _noteController;
  String? _selectedFlag;

  @override
  void initState() {
    super.initState();
    _noteController = TextEditingController(text: widget.scan.vetNote ?? '');
    _selectedFlag = widget.scan.urgentFlag;
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _saveUpdates() {
    widget.storageService.updateCattleStatus(
      widget.scan.id,
      urgentFlag: _selectedFlag,
      vetNote: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A), // Dark slate
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: Color(0xFF10B981), width: 2)),
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.scan.rfidTag,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF10B981), // Emerald
                        ),
                      ),
                      Text(
                        '${widget.scan.usEarTag} • ${widget.scan.breed}',
                        style: const TextStyle(fontSize: 13, color: Colors.white70),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: widget.scan.isDuplicate ? Colors.amber.withOpacity(0.2) : Colors.emerald.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: widget.scan.isDuplicate ? Colors.amber : const Color(0xFF10B981),
                      ),
                    ),
                    child: Text(
                      widget.scan.isDuplicate ? 'بطاقة مكررة' : 'رأس مسجل بنجاح',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: widget.scan.isDuplicate ? Colors.amber : const Color(0xFF10B981),
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(color: Colors.white12, height: 28),

              // Tactical Stats Grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.4,
                children: [
                  _buildStatTile('الوزن اللحظي', '${widget.scan.currentWeightKg.toStringAsFixed(1)} كغ', Icons.monitor_weight_outlined),
                  _buildStatTile('الاستحقاق الوراثي', '+${widget.scan.geneticMeritTpi} TPI', Icons.science_outlined),
                  _buildStatTile('متوسط الحليب', '${widget.scan.averageMilkYieldL} لتر/يوم', Icons.water_drop_outlined),
                ],
              ),
              const SizedBox(height: 16),

              // Reproduction & Quarantine row
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'حالة الحمل: ${widget.scan.pregnancyStatus == 'confirmed_pregnant' ? 'عشار مؤكد (حامل)' : 'غير ملقحة'}',
                          style: const TextStyle(fontSize: 13, color: Colors.white),
                        ),
                      ],
                    ),
                    Text(
                      'التلقيح: ${widget.scan.inseminationDate ?? 'غير محدد'}',
                      style: const TextStyle(fontSize: 12, color: Colors.white60),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Urgent Veterinary Flag Buttons
              const Text(
                'بروتوكول التنبيه البيطري العاجل (Urgent Flags):',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildFlagChip(
                    'عزل حجر صحي فوري',
                    'QUARANTINE_ISOLATE',
                    Colors.redAccent,
                    Icons.warning_amber_rounded,
                  ),
                  _buildFlagChip(
                    'طوارئ إجهاد حراري',
                    'HEAT_STRESS_SEVERE',
                    Colors.orangeAccent,
                    Icons.thermostat_outlined,
                  ),
                  _buildFlagChip(
                    'تطعيم FMD/Brucellosis',
                    'FMD_VACCINE_REQUIRED',
                    Colors.blueAccent,
                    Icons.vaccines_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Vet notes input
              TextField(
                controller: _noteController,
                maxLines: 2,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'أضف ملاحظة بيطرية أو تقرير فحص للحقل...',
                  hintStyle: const TextStyle(color: Colors.white38),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Colors.white12),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Colors.white12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF10B981)),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _saveUpdates,
                      icon: const Icon(Icons.check, color: Colors.black),
                      label: const Text(
                        'حفظ وتحديث السجل الميداني',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('إغلاق', style: TextStyle(color: Colors.white70)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatTile(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: const Color(0xFF10B981)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 10, color: Colors.white60),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlagChip(String label, String flagCode, Color color, IconData icon) {
    final isSelected = _selectedFlag == flagCode;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFlag = isSelected ? null : flagCode;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.2) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : Colors.white12, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: isSelected ? color : Colors.white60),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? color : Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
