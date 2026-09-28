import React from 'react';
import { AirliftShipment, LivestockCow, ClimateTelemetry } from '../types';
import { TacticalRadarMap } from './TacticalRadarMap';
import {
  Plane,
  Tag,
  SunMedium,
  ShieldCheck,
  Milk,
  Activity,
  Layers,
  TrendingUp,
  MapPin,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { TabId } from './NavigationTabs';

interface Props {
  shipments: AirliftShipment[];
  livestock: LivestockCow[];
  climates: ClimateTelemetry[];
  onNavigate: (tab: TabId) => void;
  onSelectFlight: (flight: AirliftShipment) => void;
}

export const DashboardOverview: React.FC<Props> = ({
  shipments,
  livestock,
  climates,
  onNavigate,
  onSelectFlight,
}) => {
  const inFlightCount = shipments.filter((s) => s.status === 'in_flight').length;
  const landedOrQuarantineCount = shipments.filter(
    (s) => s.status === 'landed' || s.status === 'quarantine_holding'
  ).length;

  const avgYield = (
    livestock.reduce((acc, c) => acc + c.averageMilkYieldL, 0) / (livestock.length || 1)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI HUD Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 109 Flights */}
        <div
          onClick={() => onNavigate('airlift')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>رحلات الجسر الجوي (Airlift)</span>
            <Plane className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            42 <span className="text-base text-slate-500 font-normal">/ 109</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>{inFlightCount} رحلات بالجو الآن</span>
            <span className="text-emerald-400 flex items-center font-mono">
              عرض التفاصيل <ArrowUpRight className="w-3 h-3 mr-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Livestock RFID Tracked */}
        <div
          onClick={() => onNavigate('rfid')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>القطيع الميداني المرقّم (RFID)</span>
            <Tag className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
            126,450 <span className="text-xs text-slate-500 font-normal">رأس هولشتاين</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>سلالة نقية Purebred</span>
            <span className="text-cyan-400 flex items-center font-mono">
              ماسح الأذن <ArrowUpRight className="w-3 h-3 mr-0.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Average Daily Yield */}
        <div
          onClick={() => onNavigate('rfid')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>متوسط إنتاج الحليب اليومي</span>
            <Milk className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {avgYield} <span className="text-xs text-slate-500 font-normal">لتر / بقرة / يوم</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>الهدف: 30 - 40 لتر/يوم</span>
            <span className="text-emerald-400 font-bold font-mono">+4.8% فوق المعيار</span>
          </div>
        </div>

        {/* Card 4: Biosecurity & USDA Compliance */}
        <div
          onClick={() => onNavigate('qr_passport')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>مطابقة الأمان البيطري USDA</span>
            <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
            100% <span className="text-xs text-slate-500 font-normal">معتمد</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>جوازات رقمية مشفرة</span>
            <span className="text-amber-400 flex items-center font-mono">
              Farm-to-Fork <ArrowUpRight className="w-3 h-3 mr-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Trans-Atlantic Airlift Flight Radar */}
      <TacticalRadarMap
        shipments={shipments}
        onSelectFlight={onSelectFlight}
      />

      {/* Split Analytics: Wilayas Thermal Index & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wilayas Heat Stress THI Summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <SunMedium className="w-4 h-4 text-amber-400" />
              <span>مؤشر الإجهاد الحراري بالمزارع (THI)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('iot_telemetry')}
                className="text-cyan-400 hover:underline text-[11px] cursor-pointer"
              >
                بث الـ IoT الحي ➔
              </button>
              <button
                onClick={() => onNavigate('feed_climate')}
                className="text-emerald-400 hover:underline text-[11px] cursor-pointer"
              >
                العليقة ➔
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {climates.map((c) => (
              <div
                key={c.wilaya}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-xs">
                    ولاية {c.wilaya === 'Adrar' ? 'أدرار' : c.wilaya === 'Biskra' ? 'بسكرة' : 'ميلة'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {c.ambientTempC}°C • رطوبة {c.relativeHumidityPct}%
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      c.thi >= 79
                        ? 'bg-red-950 text-red-400 border border-red-500/40'
                        : c.thi >= 72
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    THI {c.thi}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {c.thi >= 79 ? 'تبريد ورذاذ 100%' : c.thi >= 72 ? 'مراوح دفع' : 'ظروف مثالية'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tactical Live Operational Events Feed */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>شريط العمليات اللحظية (Tactical Live Event Stream)</span>
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              محدث لحظياً
            </span>
          </div>

          <div className="space-y-2">
            {[
              {
                time: '17:52:10Z',
                tag: 'AIRLIFT',
                color: 'text-cyan-400 bg-cyan-950 border-cyan-500/40',
                text: 'طائرة الشحن B747-400F (رحلة SOL-AF-109-AZ03) تدخل المجال الجوي الجزائري وعلى متنها 285 رأس هولشتاين نقية.',
              },
              {
                time: '17:40:00Z',
                tag: 'RFID-SCAN',
                color: 'text-emerald-400 bg-emerald-950 border-emerald-500/40',
                text: 'تم مسح الشريحة الذكية RFID-CTL-9021 في حظيرة أدرار وتسجيل إدرار مسائي 11.7 لتر (المجموع اليومي 36.8 لتر).',
              },
              {
                time: '17:15:22Z',
                tag: 'USDA-CERT',
                color: 'text-amber-400 bg-amber-950 border-amber-500/40',
                text: 'اعتماد الشهادة البيطرية USDA-APHIS-2026-DZ-TX902 بعد استكمال فحص الدم للحمى القلاعية والبروسيلا بمطار بسكرة.',
              },
              {
                time: '16:50:00Z',
                tag: 'CLIMATE',
                color: 'text-red-400 bg-red-950 border-red-500/40',
                text: 'مجسات أدرار تسجل THI = 79.2؛ تفعيل دورة الرذاذ التلقائي وتغذية الدهون المحمية (Bypass Fat) للحفاظ على نسبة الدهن.',
              },
              {
                time: '16:05:44Z',
                tag: 'PASSPORT',
                color: 'text-emerald-400 bg-emerald-950 border-emerald-500/40',
                text: 'إصدار جواز السفر الرقمي المشفّر لصهريج الحليب الممتاز 1,540 لتر المتجه لمجمع جيبلي بسكرة.',
              },
            ].map((event, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3"
              >
                <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{event.time}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${event.color}`}>
                  {event.tag}
                </span>
                <span className="text-slate-300 font-sans text-xs flex-1">{event.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
