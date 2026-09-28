import React, { useState } from 'react';
import { ClimateTelemetry, FeedRationRecipe, WilayaLocation } from '../types';
import { apiService } from '../services/apiService';
import {
  SunMedium,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  Zap,
  Wheat,
  Activity,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  climates: ClimateTelemetry[];
}

export const MicroclimateFeedCalculator: React.FC<Props> = ({ climates }) => {
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaLocation>('Adrar');
  const [customTemp, setCustomTemp] = useState<number>(38.5);
  const [customHumidity, setCustomHumidity] = useState<number>(18);
  const [targetYield, setTargetYield] = useState<number>(38);

  const activeClimate = climates.find((c) => c.wilaya === selectedWilaya) || climates[0];

  // Calculate dynamic recipe
  const recipe: FeedRationRecipe = apiService.calculateAdaptiveRation(
    selectedWilaya,
    customTemp,
    customHumidity,
    targetYield
  );

  const thi = recipe.thiIndex;

  const getStressInfo = (thiVal: number) => {
    if (thiVal < 68) {
      return {
        level: 'نطاق الراحة الطبيعي (Normal Comfort)',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/60 border-emerald-500/40',
        advice: 'الظروف المناخية مثالية للأبقار الهولشتاين. لا يوجد فقدان في الإنتاجية.',
        dropLiters: 0,
      };
    }
    if (thiVal < 72) {
      return {
        level: 'إجهاد حراري خفيف (Mild Stress)',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-950/60 border-yellow-500/40',
        advice: 'بدء تأثير الحرارة على سرعة التنفس. تشغيل مراوح الهواء ذات السرعة المتوسطة.',
        dropLiters: 0.8,
      };
    }
    if (thiVal < 79) {
      return {
        level: 'إجهاد حراري متوسط (Moderate Stress)',
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/60 border-amber-500/50',
        advice: 'تراجع الشهية واستهلاك المادة الجافة. تفعيل الرشاشات الرذاذية وزيادة بيكربونات الصوديوم.',
        dropLiters: 2.2,
      };
    }
    return {
      level: 'إجهاد حراري حاد / صحراوي (Severe Heat Stress)',
      color: 'text-red-400',
      bgColor: 'bg-red-950/80 border-red-500/70 animate-pulse',
      advice: 'خطر هبوط إدرار الحليب بمقدار 3-5 لترات يومياً. تفعيل بروتوكول الدهون المحمية والتهوية النفقية القصوى 24/7.',
      dropLiters: 4.1,
    };
  };

  const stressInfo = getStressInfo(thi);

  // Sync sliders when selecting a Wilaya preset
  const handleSelectPresetWilaya = (w: WilayaLocation) => {
    setSelectedWilaya(w);
    const found = climates.find((c) => c.wilaya === w);
    if (found) {
      setCustomTemp(found.ambientTempC);
      setCustomHumidity(found.relativeHumidityPct);
    }
  };

  return (
    <div className="space-y-6">
      {/* Algerian Wilayas Climate Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {climates.map((c) => {
          const isSelected = selectedWilaya === c.wilaya;
          return (
            <div
              key={c.wilaya}
              onClick={() => handleSelectPresetWilaya(c.wilaya)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-slate-900 shadow-lg shadow-emerald-950/40'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold font-mono text-slate-100 text-sm">
                  ولاية {c.wilaya === 'Adrar' ? 'أدرار (الصحراء الكبرى)' : c.wilaya === 'Biskra' ? 'بسكرة (الزيبان)' : c.wilaya === 'Mila' ? 'ميلة (الهضاب العليا)' : c.wilaya}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  THI {c.thi}
                </span>
              </div>

              <div className="flex items-baseline justify-between font-mono">
                <div className="text-xl font-bold text-slate-200">
                  {c.ambientTempC}°C
                </div>
                <div className="text-xs text-slate-400">
                  رطوبة {c.relativeHumidityPct}%
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 font-sans flex items-center justify-between">
                <span>سرعة الرياح: {c.windSpeedKmh} كم/س</span>
                <span className={c.thi > 78 ? 'text-red-400 font-bold' : c.thi > 72 ? 'text-amber-400' : 'text-emerald-400'}>
                  {c.thi > 78 ? 'إجهاد حاد' : c.thi > 72 ? 'إجهاد متوسط' : 'معتدل'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Microclimate THI Simulation Console */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold font-mono text-emerald-400 flex items-center gap-2">
              <SunMedium className="w-5 h-5 text-amber-400" />
              <span>محاكي مؤشر الإجهاد الحراري (THI) وتغذية الهولشتاين المتكيفة</span>
            </h3>
            <p className="text-xs text-slate-400">
              خوارزمية ضبط العليقة المركزة والبرسيم ومضادات الإجهاد الحراري لحماية إنتاج 30-40 لتر/يوم
            </p>
          </div>

          <div className={`px-4 py-2 rounded-lg border font-mono text-xs ${stressInfo.bgColor}`}>
            <div className="text-[10px] text-slate-400">المؤشر المحسوب THI</div>
            <div className={`text-lg font-bold ${stressInfo.color}`}>
              THI = {thi} • {stressInfo.level}
            </div>
          </div>
        </div>

        {/* Sliders for Simulation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800 font-mono text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-400" />
                درجة حرارة الحظيرة (°C)
              </span>
              <strong className="text-emerald-400 text-sm">{customTemp}°C</strong>
            </div>
            <input
              type="range"
              min="18"
              max="50"
              step="0.5"
              value={customTemp}
              onChange={(e) => setCustomTemp(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>18°C (ربيع ميلة)</span>
              <span>35°C (بسكرة)</span>
              <span>48°C (صيف أدرار)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                الرطوبة النسبية الجوية (%)
              </span>
              <strong className="text-cyan-400 text-sm">{customHumidity}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="1"
              value={customHumidity}
              onChange={(e) => setCustomHumidity(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>10% (جفاف صحراوي)</span>
              <span>45% (معتدل)</span>
              <span>85% (رطوبة عالية)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                الإنتاج اليومي المستهدف (L)
              </span>
              <strong className="text-emerald-400 text-sm">{targetYield} لتر/يوم</strong>
            </div>
            <input
              type="range"
              min="28"
              max="45"
              step="1"
              value={targetYield}
              onChange={(e) => setTargetYield(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>28 لتر/يوم</span>
              <span>38 لتر/يوم (الهدف)</span>
              <span>45 لتر/يوم</span>
            </div>
          </div>
        </div>

        {/* Nutritional Balanced Ration Recipe Table */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <Wheat className="w-4 h-4 text-amber-400" />
              تركيبة العليقة المتوازنة اليومية (لكل بقرة حلوب / يوم في {selectedWilaya})
            </span>
            <span className="text-emerald-400">
              الاحتياج المائي اليومي: <strong>{recipe.waterRequirementLitersDay} لتر ماء نقي/يوم</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">المكوّن العلفي</th>
                  <th className="p-3">الكمية المقررة (كغ/يوم)</th>
                  <th className="p-3">المادة الجافة DM %</th>
                  <th className="p-3">البروتين الخام CP %</th>
                  <th className="p-3">الطاقة الصافية (Mcal/kg)</th>
                  <th className="p-3">الوظيفة الفسيولوجية لمقاومة الحرارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                {recipe.ingredients.map((ing, i) => (
                  <tr key={i} className="hover:bg-slate-900/60">
                    <td className="p-3 font-bold text-slate-200">{ing.nameAr}</td>
                    <td className="p-3 text-emerald-400 font-bold text-sm">{ing.amountKgDay} كغ</td>
                    <td className="p-3 text-slate-300">{ing.dryMatterPct}%</td>
                    <td className="p-3 text-cyan-300">{ing.crudeProteinPct}%</td>
                    <td className="p-3 text-slate-300">{ing.netEnergyMcal}</td>
                    <td className="p-3 text-slate-400 text-[11px] font-sans">{ing.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bioclimatic Cooling & Buffer Regimen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Active Cooling Controls */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span>جدول نظام التبريد الديناميكي (Misting & Tunnel Fans)</span>
            </div>
            <div className="space-y-1.5 text-slate-300 pt-1">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">دورة الرذاذ المائي:</span>
                <strong className="text-cyan-300">
                  كل {recipe.activeCoolingProtocol.mistingIntervalSeconds} ثانية
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">سرعة مراوح الدفع النفقية:</span>
                <strong className="text-cyan-300">
                  {recipe.activeCoolingProtocol.fanSpeedPct}% طاقة قصوى
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">رشاشات خط التغذية:</span>
                <strong className="text-cyan-300">
                  كل {recipe.activeCoolingProtocol.sprinklerFrequencyMinutes} دقائق
                </strong>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>التهوية الليلية المكثفة:</span>
                <strong className={recipe.activeCoolingProtocol.nighttimeHyperVentilation ? 'text-emerald-400' : 'text-slate-500'}>
                  {recipe.activeCoolingProtocol.nighttimeHyperVentilation ? 'مفعّلة للتخلص من حرارة الجسم' : 'غير مطلوبة'}
                </strong>
              </div>
            </div>
          </div>

          {/* Rumen Buffer & Acidosis Prevention */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>معادلة حموضة الكرش (Rumen Buffer & Minerals)</span>
            </div>
            <div className="space-y-1.5 text-slate-300 pt-1">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">بيكربونات الصوديوم (NaHCO3):</span>
                <strong className="text-amber-300">{recipe.rumenBufferGramsDay} غرام/رأس/يوم</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">معدن البوتاسيوم والمغنيسيوم:</span>
                <strong className="text-amber-300">1.4% K + 0.35% Mg</strong>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>تثبيت نسبة الدهن بالصيف:</span>
                <strong className="text-emerald-400">مضمونة فوق 3.80%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
