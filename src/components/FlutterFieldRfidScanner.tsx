import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Scan,
  Zap,
  Repeat,
  Cloud,
  CloudOff,
  Download,
  Terminal,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  FileSpreadsheet,
  FileCode,
  Play,
  Square,
  RefreshCw,
  X,
  Stethoscope,
  Info,
  ExternalLink,
} from 'lucide-react';

interface ScannedTagRecord {
  id: string;
  rfidTag: string;
  scannedAt: string;
  isDuplicate: boolean;
  isSynced: boolean;
  usEarTag: string;
  dzNationalId: string;
  breed: string;
  weightKg: number;
  geneticTpi: number;
  pregnancyStatus: string;
  inseminationDate: string;
  milkYieldL: number;
  quarantineStatus: string;
  urgentFlag?: string | null;
  vetNote?: string | null;
}

export const FlutterFieldRfidScanner: React.FC = () => {
  // Sunlight High-Contrast mode toggle
  const [sunlightMode, setSunlightMode] = useState<boolean>(false);
  // Audio chirp toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Offline / Online network simulation
  const [isOnline, setIsOnline] = useState<boolean>(true);
  // Manual text input for tag gun
  const [manualTag, setManualTag] = useState<string>('');
  // Burst mode state
  const [isBurstActive, setIsBurstActive] = useState<boolean>(false);
  // Sync status message
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('نظام الكسح الميداني جاهز للعمل');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Selected tag for clinical detail modal
  const [selectedTag, setSelectedTag] = useState<ScannedTagRecord | null>(null);
  const [modalVetNote, setModalVetNote] = useState<string>('');
  const [modalUrgentFlag, setModalUrgentFlag] = useState<string | null>(null);

  // Active tab inside view (Scanner vs Termux CLI Helper)
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'termux' | 'code'>('scanner');

  // Scanned tags state
  const [scans, setScans] = useState<ScannedTagRecord[]>([
    {
      id: 'scan-1',
      rfidTag: 'RFID-CTL-9021',
      scannedAt: new Date(Date.now() - 360000).toISOString(),
      isDuplicate: false,
      isSynced: true,
      usEarTag: 'USA-TX-2024-9021',
      dzNationalId: 'DZ-ADR-01-9021',
      breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
      weightKg: 642.5,
      geneticTpi: 2950,
      pregnancyStatus: 'confirmed_pregnant',
      inseminationDate: '2026-08-12',
      milkYieldL: 38.5,
      quarantineStatus: 'quarantine_holding',
      urgentFlag: 'HEAT_STRESS_SEVERE',
      vetNote: 'تنفس سريع ملحوظ بسبب حرارة الظهيرة، تم توجيهها لمرشات التبريد الإجباري.',
    },
    {
      id: 'scan-2',
      rfidTag: 'RFID-CTL-9022',
      scannedAt: new Date(Date.now() - 240000).toISOString(),
      isDuplicate: false,
      isSynced: true,
      usEarTag: 'USA-TX-2024-9022',
      dzNationalId: 'DZ-ADR-01-9022',
      breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
      weightKg: 618.0,
      geneticTpi: 2910,
      pregnancyStatus: 'confirmed_pregnant',
      inseminationDate: '2026-08-10',
      milkYieldL: 34.0,
      quarantineStatus: 'quarantine_holding',
    },
    {
      id: 'scan-3',
      rfidTag: 'RFID-CTL-9023',
      scannedAt: new Date(Date.now() - 120000).toISOString(),
      isDuplicate: false,
      isSynced: true,
      usEarTag: 'USA-TX-2024-9023',
      dzNationalId: 'DZ-ADR-01-9023',
      breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
      weightKg: 655.0,
      geneticTpi: 2980,
      pregnancyStatus: 'confirmed_pregnant',
      inseminationDate: '2026-08-05',
      milkYieldL: 39.2,
      quarantineStatus: 'quarantine_holding',
    },
  ]);

  const seenTagsRef = useRef<Set<string>>(new Set(['RFID-CTL-9021', 'RFID-CTL-9022', 'RFID-CTL-9023']));
  const burstTimerRef = useRef<any>(null);

  // Web Audio Synthesizer for high-pitch scanner chirp and duplicate error tone
  const playChirp = (isDuplicate: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (isDuplicate) {
        // Low pitch double buzz (400Hz -> 300Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.setValueAtTime(320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // High pitch tactical laser chirp (2200Hz -> 1800Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {
      // Audio not permitted without user gesture or unsupported
    }

    // Trigger haptic vibration if supported on mobile
    if (navigator.vibrate) {
      if (isDuplicate) {
        navigator.vibrate([40, 40, 40]);
      } else {
        navigator.vibrate(30);
      }
    }
  };

  // Process a newly received RFID tag
  const handleTagIngestion = (rawTag: string) => {
    const clean = rawTag.trim().toUpperCase();
    if (!clean) return;

    const isDuplicate = seenTagsRef.current.has(clean);
    seenTagsRef.current.add(clean);

    playChirp(isDuplicate);

    const newRecord: ScannedTagRecord = {
      id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rfidTag: clean,
      scannedAt: new Date().toISOString(),
      isDuplicate,
      isSynced: false,
      usEarTag: `USA-TX-2024-${clean.replace(/[^0-9]/g, '').padEnd(4, '0').slice(-4)}`,
      dzNationalId: `DZ-ADR-01-${clean.replace(/[^0-9]/g, '').padEnd(4, '0').slice(-4)}`,
      breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
      weightKg: Math.round(620 + Math.random() * 45),
      geneticTpi: Math.round(2910 + Math.random() * 85),
      pregnancyStatus: 'confirmed_pregnant',
      inseminationDate: '2026-08-12',
      milkYieldL: Math.round((35 + Math.random() * 5) * 10) / 10,
      quarantineStatus: 'quarantine_holding',
    };

    setScans((prev) => [newRecord, ...prev]);

    // Automatically attempt sync if online and not a duplicate
    if (isOnline && !isDuplicate) {
      syncSingleTag(newRecord);
    } else if (!isOnline) {
      setSyncStatusMsg('وضع الحقل أوفلاين: تم تخزين الشريحة محلياً في طابور المزامنة');
    }
  };

  // Sync a single record to the server
  const syncSingleTag = async (record: ScannedTagRecord) => {
    try {
      const res = await fetch('/api/livestock/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfidTag: record.rfidTag,
          checkpointLocation: 'Adrar Quarantine Primary Terminal',
          operatorId: 'OP-FIELD-GUN-01',
          source: 'FLUTTER_WEB_GUN',
        }),
      });
      if (res.ok) {
        setScans((prev) =>
          prev.map((s) => (s.id === record.id ? { ...s, isSynced: true } : s))
        );
        setSyncStatusMsg(`تمت مزامنة الشريحة ${record.rfidTag} مع الخادم المركزي`);
      }
    } catch {
      setSyncStatusMsg('فشل الاتصال: الشريحة محفوظة في طابور المزامنة المحلي');
    }
  };

  // Bulk flush offline queue
  const flushOfflineQueue = async () => {
    const pending = scans.filter((s) => !s.isSynced && !s.isDuplicate);
    if (pending.length === 0) {
      setSyncStatusMsg('طابور الأوفلاين فارغ، لا توجد قراءات بحاجة لمزامنة');
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(`جاري مزامنة ${pending.length} رأس مع الخادم المركزي...`);

    try {
      const res = await fetch('/api/livestock/bulk-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'FLUTTER_BULK_FLUSH',
          scans: pending.map((s) => ({
            rfidTag: s.rfidTag,
            usEarTag: s.usEarTag,
            dzNationalId: s.dzNationalId,
            breed: s.breed,
            currentWeightKg: s.weightKg,
            geneticMeritTpi: s.geneticTpi,
            pregnancyStatus: s.pregnancyStatus,
            inseminationDate: s.inseminationDate,
            averageMilkYieldL: s.milkYieldL,
            quarantineStatus: s.quarantineStatus,
            urgentFlag: s.urgentFlag,
            vetNote: s.vetNote,
          })),
        }),
      });

      if (res.ok) {
        setScans((prev) => prev.map((s) => ({ ...s, isSynced: true })));
        setSyncStatusMsg(`نجحت مزامنة ${pending.length} رأس مع المنظومة المركزية!`);
      } else {
        setSyncStatusMsg('تعذر قبول الدفعة من الخادم، تم الإبقاء عليها محلياً');
      }
    } catch {
      setSyncStatusMsg('خطأ في الاتصال بالشبكة، الدفعة محفوظة في ذاكرة الهاتف');
    } finally {
      setIsSyncing(false);
    }
  };

  // Rapid Burst Simulator (simulates cattle herd rushing through RFID chute)
  const toggleBurstSimulation = () => {
    if (isBurstActive) {
      clearInterval(burstTimerRef.current);
      setIsBurstActive(false);
      setSyncStatusMsg('تم إيقاف الكسح السريع (Burst Stopped)');
    } else {
      setIsBurstActive(true);
      setSyncStatusMsg('جاري الكسح السريع: استقبال نبضات RFID عالية التردد...');
      let count = 0;
      burstTimerRef.current = setInterval(() => {
        count++;
        // 80% new tags, 20% duplicate tags
        const isDupe = count % 4 === 0;
        const tagNum = isDupe ? 9020 + (count % 3) + 1 : 9025 + count;
        handleTagIngestion(`RFID-CTL-${tagNum}`);
        if (count >= 20) {
          clearInterval(burstTimerRef.current);
          setIsBurstActive(false);
          setSyncStatusMsg(`اكتملت دفعة الكسح السريع (20 رأس)`);
        }
      }, 220);
    }
  };

  // Keyboard shortcut listener: Spacebar fires gun trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        const randTag = `RFID-CTL-${9020 + Math.floor(Math.random() * 20)}`;
        handleTagIngestion(randTag);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(burstTimerRef.current);
    };
  }, [isOnline, soundEnabled]);

  // Export dataset to CSV
  const exportToCSV = () => {
    const headers = [
      'RFID_TAG',
      'SCANNED_AT',
      'US_EAR_TAG',
      'DZ_NATIONAL_ID',
      'WEIGHT_KG',
      'TPI_GENETIC_SCORE',
      'PREGNANCY_STATUS',
      'MILK_YIELD_L',
      'QUARANTINE_STATUS',
      'URGENT_FLAG',
      'VET_NOTE',
      'SYNC_STATUS',
      'IS_DUPLICATE',
    ];

    const rows = scans.map((s) => [
      s.rfidTag,
      s.scannedAt,
      s.usEarTag,
      s.dzNationalId,
      s.weightKg,
      s.geneticTpi,
      s.pregnancyStatus,
      s.milkYieldL,
      s.quarantineStatus,
      s.urgentFlag || 'NONE',
      `"${(s.vetNote || '').replace(/"/g, '""')}"`,
      s.isSynced ? 'SYNCED' : 'PENDING_OFFLINE',
      s.isDuplicate ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sol_livestock_rfid_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export dataset to JSON
  const exportToJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sol_livestock_rfid_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Open modal detail sheet for a cattle
  const openCattleDetail = (tag: ScannedTagRecord) => {
    setSelectedTag(tag);
    setModalVetNote(tag.vetNote || '');
    setModalUrgentFlag(tag.urgentFlag || null);
  };

  // Save clinical update
  const saveCattleUpdate = async () => {
    if (!selectedTag) return;
    const updated = {
      ...selectedTag,
      urgentFlag: modalUrgentFlag,
      vetNote: modalVetNote,
      isSynced: false,
    };

    setScans((prev) => prev.map((s) => (s.id === selectedTag.id ? updated : s)));
    setSelectedTag(null);

    // Call server API
    if (isOnline) {
      try {
        await fetch('/api/livestock/vet-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rfidTag: updated.rfidTag,
            urgentFlag: modalUrgentFlag,
            vetNote: modalVetNote,
          }),
        });
        setScans((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, isSynced: true } : s))
        );
      } catch {
        // Will sync later
      }
    }
  };

  // Metrics computation
  const uniqueHeadsCount = seenTagsRef.current.size;
  const totalScanned = scans.length;
  const duplicateCount = scans.filter((s) => s.isDuplicate).length;
  const pendingSyncCount = scans.filter((s) => !s.isSynced && !s.isDuplicate).length;

  return (
    <div className={`space-y-4 ${sunlightMode ? 'bg-black text-amber-300' : 'text-slate-100'}`} dir="rtl">
      {/* 1. Top Bar: Title, Sunlight Mode, Audio, Offline Mode, Subtabs */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-lg ${
        sunlightMode ? 'bg-neutral-900 border-amber-500' : 'bg-slate-900/90 border-slate-800 backdrop-blur'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Scan className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">قارئ RFID الميداني • الكسح الجماعي (Flutter & Termux HUD)</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ISO 11784/11785 FDX-B
              </span>
            </div>
            <p className="text-xs text-slate-400">
              دعم الكسح التكتيكي السريع لشرائح القطيع الحيوية بالأجهزة المحمولة (RFID Guns) ومحاكاة بيئات Termux
            </p>
          </div>
        </div>

        {/* View Switches & Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Subtabs */}
          <div className="flex bg-slate-950/80 rounded-lg p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('scanner')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              لوحة الكسح الميداني
            </button>
            <button
              onClick={() => setActiveSubTab('termux')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'termux' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              أداة Termux CLI
            </button>
            <button
              onClick={() => setActiveSubTab('code')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'code' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              أكواد تطبيق Flutter
            </button>
          </div>

          {/* Sunlight Mode Toggle */}
          <button
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-bold transition ${
              sunlightMode
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="وضع التباين العالي للشمس (OLED Sunlight Mode)"
          >
            {sunlightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{sunlightMode ? 'وضع الشمس مفعل' : 'الوضع التكتيكي'}</span>
          </button>

          {/* Sound Chirp Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-bold transition ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="الصوت الرنيني للكسح (Audio Chirp)"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'الصوت مفعّل' : 'صامت'}</span>
          </button>

          {/* Offline / Online Network Toggle */}
          <button
            onClick={() => {
              const nextState = !isOnline;
              setIsOnline(nextState);
              if (nextState) flushOfflineQueue();
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-bold transition ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
            title="تبديل وضع الاتصال بالشبكة للمعاينة الميدانية"
          >
            {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            <span>{isOnline ? 'شبكة متصلة' : 'أوفلاين في الحقل'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'scanner' && (
        <>
          {/* 2. Tactical Metrics Counter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${
              sunlightMode ? 'bg-neutral-900 border-emerald-500 text-emerald-300' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>الرؤوس الفريدة الممسوحة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-400">{uniqueHeadsCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">رؤوس هولشتاين مسجلة دون تكرار</div>
            </div>

            <div className={`p-4 rounded-xl border ${
              sunlightMode ? 'bg-neutral-900 border-amber-500 text-white' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>إجمالي نبضات الكسح</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-mono font-bold text-slate-100">{totalScanned}</div>
              <div className="text-[11px] text-slate-400 mt-1">معدل نبض القارئ المحمول</div>
            </div>

            <div className={`p-4 rounded-xl border ${
              sunlightMode ? 'bg-neutral-900 border-amber-500 text-amber-300' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>البطاقات المكررة المحجوبة</span>
                <Repeat className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-mono font-bold text-amber-400">{duplicateCount}</div>
              <div className="text-[11px] text-amber-400/80 mt-1">تصفية تلقائية لمنع الازدواجية</div>
            </div>

            <div className={`p-4 rounded-xl border ${
              sunlightMode ? 'bg-neutral-900 border-cyan-500 text-cyan-300' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>طابور الأوفلاين المعلق</span>
                <CloudOff className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-mono font-bold text-cyan-400">{pendingSyncCount}</div>
                {pendingSyncCount > 0 && isOnline && (
                  <button
                    onClick={flushOfflineQueue}
                    disabled={isSyncing}
                    className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    مزامنة الآن
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">محفوظ في ذاكرة الهاتف المحلية</div>
            </div>
          </div>

          {/* 3. Hardware Trigger & Live Scanning Controller */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            sunlightMode ? 'bg-neutral-950 border-amber-500' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Manual input simulation */}
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualTag}
                    onChange={(e) => setManualTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTagIngestion(manualTag);
                        setManualTag('');
                      }
                    }}
                    placeholder="إدخال يدوي أو قراءة Barcode / RFID (مثال: RFID-CTL-9030)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-3 text-[10px] font-mono text-slate-500">FDX-B</span>
                </div>
                <button
                  onClick={() => {
                    handleTagIngestion(manualTag);
                    setManualTag('');
                  }}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition"
                >
                  تسجيل
                </button>
              </div>

              {/* Physical Gun Trigger simulation & Burst trigger */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const tagNumber = 9020 + Math.floor(Math.random() * 25);
                    handleTagIngestion(`RFID-CTL-${tagNumber}`);
                  }}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95 ${
                    sunlightMode
                      ? 'bg-amber-400 text-black hover:bg-amber-300'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                  title="محاكاة ضغط زناد القارئ المادي المحمول أو زر المسافة في الكيبورد"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>زناد القارئ الميداني (Gun Trigger)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono">Spacebar</span>
                </button>

                <button
                  onClick={toggleBurstSimulation}
                  className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    isBurstActive
                      ? 'bg-amber-500 text-black hover:bg-amber-400 animate-pulse'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isBurstActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isBurstActive ? 'إيقاف النبض' : 'كسح سريع (Burst 20)'}</span>
                </button>

                {/* Export Dropdown / Buttons */}
                <div className="flex items-center gap-1 border-r border-slate-800 pr-2 mr-1">
                  <button
                    onClick={exportToCSV}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
                    title="تصدير كملف CSV المعتمد في التحليل والـ Termux"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden lg:inline">CSV</span>
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
                    title="تصدير كملف JSON لبيئات البرمجة والأتمتة"
                  >
                    <FileCode className="w-4 h-4" />
                    <span className="hidden lg:inline">JSON</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Strip */}
            <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>الحالة الميدانية:</span>
                <span className="text-slate-200">{syncStatusMsg}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>نقطة الفحص: محطة الحجر الصحي الأولية - أدرار</span>
                <span>المشغل: OP-FIELD-GUN-01</span>
              </div>
            </div>
          </div>

          {/* 4. Live Scanned Feed Table */}
          <div className={`rounded-xl border overflow-hidden shadow-md ${
            sunlightMode ? 'bg-black border-amber-500' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">سجل الكسح المباشر (اضغط على السطر لتعديل الملف البيطري)</h3>
              </div>
              <div className="text-xs text-slate-400">
                إجمالي السجلات: <span className="font-mono font-bold text-slate-200">{scans.length}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto">
              {scans.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  لا توجد شرائح ممسوحة حالياً. اضغط على "زناد القارئ الميداني" لبدء التسجيل.
                </div>
              ) : (
                scans.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => openCattleDetail(scan)}
                    className={`p-3.5 hover:bg-slate-800/50 cursor-pointer transition flex items-center justify-between gap-3 ${
                      scan.isDuplicate
                        ? 'bg-amber-500/5 border-l-4 border-amber-500'
                        : scan.urgentFlag
                        ? 'bg-red-500/5 border-l-4 border-red-500'
                        : ''
                    }`}
                  >
                    {/* Left details */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        scan.isDuplicate
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {scan.isDuplicate ? <Repeat className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-100">{scan.rfidTag}</span>
                          <span className="text-xs text-slate-400 font-mono">({scan.usEarTag})</span>
                          {scan.isDuplicate && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              شريحة مكررة (تم الحجب)
                            </span>
                          )}
                          {scan.urgentFlag && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {scan.urgentFlag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>{scan.breed}</span>
                          <span>•</span>
                          <span>الوزن: <strong className="text-slate-300 font-mono">{scan.weightKg} كغ</strong></span>
                          <span>•</span>
                          <span>الجدارة الوراثية: <strong className="text-emerald-400 font-mono">+{scan.geneticTpi} TPI</strong></span>
                          <span>•</span>
                          <span>إنتاج الحليب: <strong className="text-slate-300 font-mono">{scan.milkYieldL} لتر/يوم</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right status & time */}
                    <div className="text-left flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs">
                        {scan.isSynced ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                            <Cloud className="w-3 h-3" />
                            متزامن
                          </span>
                        ) : (
                          <span className="text-cyan-400 flex items-center gap-1 font-semibold text-[11px]">
                            <CloudOff className="w-3 h-3" />
                            محفوظ أوفلاين
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(scan.scannedAt).toLocaleTimeString('ar-DZ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. Subtab: Termux & Android CLI Companion */}
      {activeSubTab === 'termux' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Terminal className="w-5 h-5" />
              <span>دليل تشغيل أداة Termux CLI للهواتف الذكية وقارئات الباركود المحمولة</span>
            </div>
            <a
              href="/flutter_rfid_field_app/termux_sync.sh"
              download="termux_sync.sh"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل سكريبت termux_sync.sh
            </a>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            تم تجهيز سكريبت Bash مخصص للتشغيل الفوري داخل تطبيق <strong>Termux</strong> على الهواتف الذكية وأجهزة الـ Android الميدانية (مثل هواتف الحظائر وقارئات Zebra / Chainway). يدعم السكريبت تخزين القراءات محلياً في حال انقطاع الشبكة وإرسالها عند توفر الاتصال عبر cURL.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto space-y-2">
            <div className="text-slate-500"># 1. تحديث الحزم وتثبيت أدوات cURL و jq في Termux:</div>
            <div className="text-slate-200 font-bold">pkg update && pkg install curl jq -y</div>
            <div className="text-slate-500 mt-2"># 2. تشغيل الوضع التفاعلي لزناد القارئ المحمول (Interactive Gun Mode):</div>
            <div className="text-slate-200 font-bold">./termux_sync.sh</div>
            <div className="text-slate-500 mt-2"># 3. كسح شريحة واحدة وتحديد الحظيرة فوراً:</div>
            <div className="text-slate-200 font-bold">./termux_sync.sh --scan RFID-CTL-9025 "Adrar Quarantine Barn-A"</div>
            <div className="text-slate-500 mt-2"># 4. مزامنة طابور البيانات المخزنة محلياً عند العودة لتغطية الشبكة:</div>
            <div className="text-slate-200 font-bold">./termux_sync.sh --sync</div>
          </div>
        </div>
      )}

      {/* 6. Subtab: Flutter Full Code Tree */}
      {activeSubTab === 'code' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <FileCode className="w-5 h-5" />
              <span>هيكلية مشروع تطبيق Flutter الميداني المتكامل (lib/)</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">/flutter_rfid_field_app/</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>lib/models/livestock_tag.dart</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                نموذج بيانات الشريحة الذكية (ISO 11784/11785 FDX-B) وسجلات الأبقار الوراثية (TPI، السلالة، الأوزان، وملاحظات الفحص البيطري).
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>lib/services/storage_sync_service.dart</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                محرك التخزين المحلي وقاعدة بيانات الـ Offline وطابور المزامنة الخلفي الذي يرسل الدفعات لـ <code>/api/livestock/bulk-scan</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>lib/services/rfid_hardware_service.dart</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                برامج التشغيل للاتصال بقارئات Zebra و Chainway عبر البلوتوث و Keycode الزناد المادي مع إشارات الصوت والاهتزاز.
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>lib/views/bulk_scan_screen.dart</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                واجهة الكسح التكتيكية الداكنة (Sunlight RTL UI) ذات التباين العالي مع عدادات الرؤوس الفورية وتصفية البطاقات المكررة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Clinical Veterinary Detail Modal (Cattle Detail Sheet) */}
      {selectedTag && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">الملف الفردي للبقرة • الفحص البيطري اللحظي</h3>
                  <div className="font-mono text-xs text-emerald-400">{selectedTag.rfidTag}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTag(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Quick Genetics & ID grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">الرقم الوطني الجزائري</div>
                  <div className="font-mono font-bold text-xs text-slate-200 mt-0.5">{selectedTag.dzNationalId}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">الوزن اللحظي</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">{selectedTag.weightKg} كغ</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">الجدارة الوراثية</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">+{selectedTag.geneticTpi} TPI</div>
                </div>
              </div>

              {/* Status details */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">السلالة:</span>
                  <span className="text-slate-200 font-semibold">{selectedTag.breed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الحمل:</span>
                  <span className="text-emerald-400 font-semibold">عشار مؤكد (حامل) • تلقيح 2026-08-12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الحجر الصحي:</span>
                  <span className="text-amber-400 font-semibold">حجر صحي وقائي (30 يوماً)</span>
                </div>
              </div>

              {/* Urgent Flag Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  بروتوكول التنبيه البيطري العاجل (Urgent Flags):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalUrgentFlag(modalUrgentFlag === 'QUARANTINE_ISOLATE' ? null : 'QUARANTINE_ISOLATE')}
                    className={`p-2 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      modalUrgentFlag === 'QUARANTINE_ISOLATE'
                        ? 'bg-red-500/20 text-red-300 border-red-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>عزل صحي فوري</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalUrgentFlag(modalUrgentFlag === 'HEAT_STRESS_SEVERE' ? null : 'HEAT_STRESS_SEVERE')}
                    className={`p-2 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      modalUrgentFlag === 'HEAT_STRESS_SEVERE'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-orange-400" />
                    <span>طوارئ إجهاد حراري</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalUrgentFlag(modalUrgentFlag === 'FMD_BOOSTER' ? null : 'FMD_BOOSTER')}
                    className={`p-2 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      modalUrgentFlag === 'FMD_BOOSTER'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>تطعيم FMD/حمى</span>
                  </button>
                </div>
              </div>

              {/* Veterinary notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ملاحظات الطبيب البيطري الميداني:</label>
                <textarea
                  value={modalVetNote}
                  onChange={(e) => setModalVetNote(e.target.value)}
                  placeholder="أضف ملاحظات الفحص، الأعراض السريرية، أو توصيات التغذية الإضافية..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition"
              >
                إلغاء
              </button>
              <button
                onClick={saveCattleUpdate}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                حفظ التحديث وتوثيق السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
