import React, { useState } from 'react';
import { LivestockCow } from '../types';
import {
  Tag,
  Scan,
  Activity,
  Dna,
  ShieldCheck,
  Milk,
  Syringe,
  Scale,
  Calendar,
  HeartPulse,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface Props {
  livestock: LivestockCow[];
  selectedCow: LivestockCow | null;
  onSelectCow: (cow: LivestockCow) => void;
  onScanTag: (tag: string) => Promise<void>;
  onRecordYield: (
    rfid: string,
    yields: { morning: number; noon: number; evening: number; fatPct?: number; proteinPct?: number }
  ) => Promise<void>;
  soundEnabled: boolean;
}

export const RfidQuarantineModule: React.FC<Props> = ({
  livestock,
  selectedCow,
  onSelectCow,
  onScanTag,
  onRecordYield,
  soundEnabled,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Quick milk yield entry state
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [morningYield, setMorningYield] = useState('14.5');
  const [noonYield, setNoonYield] = useState('10.5');
  const [eveningYield, setEveningYield] = useState('11.5');
  const [fatPct, setFatPct] = useState('3.85');
  const [proteinPct, setProteinPct] = useState('3.28');
  const [isSubmittingYield, setIsSubmittingYield] = useState(false);

  // Play audio chirp simulation
  const playChirp = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio not permitted without user gesture
    }
  };

  const handleScanSubmit = async (tagToScan?: string) => {
    const target = (tagToScan || tagInput).trim();
    if (!target) return;
    setIsScanning(true);
    playChirp();
    try {
      await onScanTag(target);
      setScanMessage(`تم مسح وتأكيد الشريحة: ${target.toUpperCase()}`);
      setTagInput('');
      setTimeout(() => setScanMessage(null), 4000);
    } catch (err: any) {
      setScanMessage(`خطأ في المسح: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitYield = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCow) return;
    setIsSubmittingYield(true);
    try {
      await onRecordYield(selectedCow.rfidTag, {
        morning: parseFloat(morningYield) || 0,
        noon: parseFloat(noonYield) || 0,
        evening: parseFloat(eveningYield) || 0,
        fatPct: parseFloat(fatPct) || 3.85,
        proteinPct: parseFloat(proteinPct) || 3.28,
      });
      setShowYieldModal(false);
      playChirp();
    } finally {
      setIsSubmittingYield(false);
    }
  };

  const activeCow = selectedCow || livestock[0] || null;

  return (
    <div className="space-y-6">
      {/* Tactical RFID Gun Scanner Terminal */}
      <div className="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-400">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-slate-100">
                محطة ماسح الأذن الذكي RFID (ISO 11784/11785 FDX-B / HDX 134.2 kHz)
              </h2>
              <p className="text-xs text-slate-400">
                استقبال إشارات قارئ RFID المحمول باليد (RFID Gun) أو بوابات الحجر الصحي التلقائية
              </p>
            </div>
          </div>

          {/* Quick Mock Scan Buttons */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">شرائح سريعة:</span>
            {['RFID-CTL-9021', 'RFID-CTL-9022', 'RFID-CTL-9023', 'RFID-CTL-9024'].map((sample) => (
              <button
                key={sample}
                onClick={() => handleScanSubmit(sample)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-slate-300 cursor-pointer transition text-[11px]"
              >
                {sample.replace('RFID-CTL-', '#')}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="امسح بالماسح أو أدخل رقم شريحة الأذن (مثال: RFID-CTL-9021)..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
              className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg pr-9 pl-4 py-2.5 text-sm font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <button
            onClick={() => handleScanSubmit()}
            disabled={isScanning || !tagInput.trim()}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs uppercase px-5 py-2.5 rounded-lg transition cursor-pointer shadow-lg shadow-emerald-950/50 whitespace-nowrap"
          >
            <Scan className="w-4 h-4" />
            <span>{isScanning ? 'جارٍ المسح...' : 'إطلاق المسح (SCAN)'}</span>
          </button>
        </div>

        {scanMessage && (
          <div className="mt-3 p-2.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{scanMessage}</span>
          </div>
        )}
      </div>

      {/* Main Herd Table & Detailed Card Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left/Main Column: Detailed Cow Dossier */}
        {activeCow ? (
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 relative">
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                      {activeCow.rfidTag}
                    </span>
                    <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      {activeCow.breed}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>المعرف الأمريكي: <strong className="text-slate-200">{activeCow.usEarTag}</strong></span>
                    <span>الرقم الوطني الجزائري: <strong className="text-slate-200">{activeCow.dzNationalId}</strong></span>
                    <span>رحلة الوصول: <strong className="text-emerald-400">{activeCow.flightNumber}</strong> ({activeCow.originState})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-left font-mono">
                    <div className="text-[10px] text-slate-500">حالة الحجر البيطري</div>
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-950 text-amber-400 border border-amber-500/50 inline-block">
                      {activeCow.quarantineStatus === 'quarantine_holding'
                        ? `اليوم ${activeCow.quarantineDay} من 30 (حجر المزرعة)`
                        : 'تم التطهير والدمج'}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowYieldModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs font-mono transition cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل إدرار الحليب</span>
                  </button>
                </div>
              </div>

              {/* Pedigree & Genetics Blueprint */}
              <div className="mt-5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 mb-3">
                  <Dna className="w-4 h-4 text-emerald-400" />
                  <span>المخطط الجيني والنسب (Holstein Genomic Pedigree)</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 text-xs font-mono">
                  <div>
                    <div className="text-slate-500 text-[10px]">الأب (Sire Pedigree)</div>
                    <div className="font-bold text-slate-200 truncate mt-0.5">
                      {activeCow.geneticMerit?.sireName || 'Pine-Tree Dairy Kingpin'}
                    </div>
                    <div className="text-[10px] text-slate-400">{activeCow.geneticMerit?.sireRegistration || 'HOUSA72851652'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">الأم (Dam Line)</div>
                    <div className="font-bold text-slate-200 truncate mt-0.5">
                      {activeCow.geneticMerit?.damName || 'Lone-Star Superstition 4402'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">معامل الجدارة TPI</div>
                    <div className="font-bold text-emerald-400 text-sm mt-0.5">
                      +{activeCow.geneticMerit?.geneticMeritTpi || 2950} TPI
                    </div>
                    <div className="text-[10px] text-slate-400">Total Performance Index</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">القدرة الإنتاجية المتوقعة</div>
                    <div className="font-bold text-cyan-400 text-sm mt-0.5">
                      {(activeCow.geneticMerit?.milkYieldGenomicPotentialL || 14000).toLocaleString()} L
                    </div>
                    <div className="text-[10px] text-slate-400">لكل دورة (305 أيام)</div>
                  </div>
                </div>
              </div>

              {/* Milk Production HUD vs Global Standard */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-3">
                  <div className="flex items-center gap-2">
                    <Milk className="w-4 h-4 text-cyan-400" />
                    <span>مؤشرات إنتاج الحليب اليومي (الهدف: 30 - 40 لتر/يوم)</span>
                  </div>
                  <span className="text-emerald-400">
                    المعدل الفعلي: <strong>{activeCow.averageMilkYieldL} L/Day</strong> (
                    {activeCow.averageMilkYieldL >= activeCow.targetMilkYieldL ? 'فوق المعيار العالمي' : 'مطابق'})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-mono">الإنتاج اليومي المتوسط</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                      {activeCow.averageMilkYieldL} <span className="text-xs text-slate-500">لتر/يوم</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-1">
                      الهدف: {activeCow.targetMilkYieldL} L/يوم
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-mono">نسبة الدهن والبروتين</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      3.86% <span className="text-xs text-slate-400 font-normal">دهن</span> • 3.28%{' '}
                      <span className="text-xs text-slate-400 font-normal">بروتين</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-1">
                      معايير صناعة الأجبان والحليب المبستر
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-mono">الخلايا الجسدية (SCC)</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      ~108,000 <span className="text-xs text-slate-500">/ مل</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-sans mt-1">
                      جودة فائقة (خالٍ من التهاب الضرع)
                    </div>
                  </div>
                </div>

                {/* Recent Milking Records Table */}
                {activeCow.recentMilkYields.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-right text-xs font-mono border border-slate-800 rounded-lg overflow-hidden">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">حلب الصباح</th>
                          <th className="p-2">حلب الظهيرة</th>
                          <th className="p-2">حلب المساء</th>
                          <th className="p-2">المجموع اليومي</th>
                          <th className="p-2">الدهن %</th>
                          <th className="p-2">الخلايا الجسدية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                        {activeCow.recentMilkYields.map((rec, i) => (
                          <tr key={i} className="hover:bg-slate-900/60">
                            <td className="p-2 text-slate-300">{rec.date}</td>
                            <td className="p-2 text-cyan-300">{rec.morningYieldL} L</td>
                            <td className="p-2 text-cyan-300">{rec.noonYieldL} L</td>
                            <td className="p-2 text-cyan-300">{rec.eveningYieldL} L</td>
                            <td className="p-2 font-bold text-emerald-400">{rec.totalDailyYieldL} L</td>
                            <td className="p-2 text-slate-300">{rec.fatPct}%</td>
                            <td className="p-2 text-emerald-300">{rec.somaticCellCountK}k /ml</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Weight Progression & Veterinary Health Records */}
              <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weight Log */}
                <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      منحنى الوزن الحي
                    </span>
                    <span className="text-emerald-400">{activeCow.currentWeightKg} kg</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    {(activeCow.weightHistory || []).map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-900 text-slate-400">
                        <span>{w.date}</span>
                        <strong className="text-slate-200">{w.weightKg} kg</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vaccination History */}
                <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Syringe className="w-4 h-4 text-emerald-400" />
                      سجل التحصينات المعتمدة
                    </span>
                    <span className="text-emerald-400 text-[11px]">مكتمل</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    {(activeCow.vaccinations || []).map((vac) => (
                      <div key={vac.id} className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="font-bold text-slate-200 text-xs">{vac.vaccineName}</div>
                        <div className="text-[10px] text-slate-400 flex justify-between mt-1">
                          <span>طبيب: {vac.veterinarian}</span>
                          <span className="text-emerald-400">تاريخ: {vac.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-2 p-12 text-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-400 font-mono">
            يرجى اختيار بقرة من القائمة أو مسح شريحة RFID لعرض الملف البيطري
          </div>
        )}

        {/* Right Column: Herd RFID Roster */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>سجل قطيع الأبقار الممسوحة ({livestock.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              أدرار / بسكرة / ميلة
            </span>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {livestock.map((cow) => {
              const isSelected = activeCow?.id === cow.id;
              return (
                <div
                  key={cow.id}
                  onClick={() => onSelectCow(cow)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 text-slate-100 shadow'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-400 text-sm">{cow.rfidTag}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {cow.currentWilaya}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>الإنتاج: <strong className="text-cyan-400">{cow.averageMilkYieldL} L/D</strong></span>
                    <span>الوزن: {cow.currentWeightKg} kg</span>
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500 truncate">
                    {cow.farmName} • {cow.barnNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Record Milk Yield Modal */}
      {showYieldModal && activeCow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl font-mono text-slate-100">
            <h3 className="text-base font-bold text-emerald-400 mb-1">
              تسجيل إدرار الحليب اليومي (3 نوبات حلب)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              البقرة: {activeCow.rfidTag} • المعرف: {activeCow.dzNationalId}
            </p>

            <form onSubmit={handleSubmitYield} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">حلبة الصباح (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={morningYield}
                    onChange={(e) => setMorningYield(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-cyan-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">حلبة الظهيرة (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={noonYield}
                    onChange={(e) => setNoonYield(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-cyan-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">حلبة المساء (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={eveningYield}
                    onChange={(e) => setEveningYield(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-cyan-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">نسبة الدهن %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fatPct}
                    onChange={(e) => setFatPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">نسبة البروتين %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={proteinPct}
                    onChange={(e) => setProteinPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">إجمالي الحلب المسجل:</span>
                <strong className="text-emerald-400 text-sm">
                  {(
                    (parseFloat(morningYield) || 0) +
                    (parseFloat(noonYield) || 0) +
                    (parseFloat(eveningYield) || 0)
                  ).toFixed(1)}{' '}
                  لتر/اليوم
                </strong>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingYield}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded text-xs transition cursor-pointer"
                >
                  {isSubmittingYield ? 'جارٍ الحفظ...' : 'تأكيد وحفظ الإنتاج'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowYieldModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
