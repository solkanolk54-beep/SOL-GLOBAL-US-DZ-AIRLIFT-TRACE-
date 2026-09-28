# SOL Global • Tactical Handheld RFID Field Scanner (Flutter & Termux)

تطبيق ميداني تكتيكي عالي السرعة لدعم الكسح الجماعي لشرائح الأبقار الذكية **ISO 11784/11785 FDX-B / HDX** عبر القارئات المحمولة (RFID Guns / Zebra / Chainway / Honeywell)، الهواتف الذكية بنظام أندرويد، وبيئات **Termux CLI**.

---

## 🎯 الميزات الرئيسية
1. **الكسح السريع الجماعي (Bulk RFID Scanning)**:
   - واجهة داكنة عالية التباين (Sunlight OLED High-Contrast Mode) للرؤية بوضوح تحت شمس الصحراء والهضاب.
   - استقبال مئات الشرائح في ثوانٍ معدودة عبر زناد القارئ المادي (Hardware Trigger) أو محاكاة الـ Burst.
   - خوارزمية ذكية لاكتشاف البطاقات المكررة (Duplicate Rejection Cache) فوراً مع نغمات تنبيه واهتزاز (Audio/Haptic Chirp).
2. **معمارية العمل بدون إنترنت (Offline-First Architecture)**:
   - حفظ فوري لكافة القراءات في الذاكرة التخزينية المحلية وقواعد البيانات السريعة.
   - طابور مزامنة خلفي تلقائي (Background Sync Queue) يدفع البيانات إلى الخادم المركزي `POST /api/livestock/bulk-scan` فور استعادة التغطية.
3. **الملف الوراثي والبيطري الفوري**:
   - معاينة سريعة لسلالة الهولشتاين الأصيلة، معامل الجدارة الوراثية الأمريكية (TPI 2900+)، والوزن اللحظي.
   - أزرار تسجيل سريعة لنوبات الحلب وأعلام الطوارئ البيطرية (حجر صحي عاجل، إجهاد حراري، تطعيم FMD/Brucellosis).
4. **تكامل كامل مع Termux وتصدير البيانات**:
   - تصدير بضغطة زر إلى ملفات **CSV** و **JSON**.
   - سكريبت تشغيل تفاعلي مخصص لبيئة **Termux Bash CLI** (`termux_sync.sh`).

---

## 🚀 التشغيل الميداني

### 1. تشغيل تطبيق Flutter على الأجهزة المحمولة:
```bash
cd flutter_rfid_field_app
flutter pub get
flutter run
```

### 2. التشغيل في بيئة Termux (Android CLI):
```bash
# تثبيت المتطلبات في Termux:
pkg update && pkg install curl jq -y

# تشغيل القارئ التفاعلي لزناد الـ RFID Gun:
./termux_sync.sh

# أو مسح شريحة واحدة مباشرة:
./termux_sync.sh --scan RFID-CTL-9025 "Adrar Barn-A"

# مزامنة الطابور المخزن محلياً إلى الخادم المركزي:
./termux_sync.sh --sync
```
