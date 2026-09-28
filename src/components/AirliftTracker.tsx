import React, { useState } from 'react';
import { AirliftShipment, FlightStatus } from '../types';
import {
  Plane,
  ShieldCheck,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Search,
  Filter,
} from 'lucide-react';

interface Props {
  shipments: AirliftShipment[];
  onVerifyUsda: (flightId: string) => Promise<void>;
  onSelectFlight: (flight: AirliftShipment) => void;
  selectedFlightId?: string;
}

export const AirliftTracker: React.FC<Props> = ({
  shipments,
  onVerifyUsda,
  onSelectFlight,
  selectedFlightId,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const filtered = shipments.filter((flight) => {
    const matchesStatus = filterStatus === 'all' || flight.status === filterStatus;
    const matchesSearch =
      flight.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.usdaHealthCertNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.originAirport.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.destinationAirport.wilaya.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleVerify = async (flightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setVerifyingId(flightId);
      await onVerifyUsda(flightId);
    } finally {
      setVerifyingId(null);
    }
  };

  const totalHeadsInTransit = shipments
    .filter((s) => s.status === 'in_flight' || s.status === 'boarding')
    .reduce((sum, s) => sum + s.headCount, 0);

  const totalQuarantineHolding = shipments
    .filter((s) => s.status === 'quarantine_holding' || s.status === 'landed')
    .reduce((sum, s) => sum + s.headCount, 0);

  return (
    <div className="space-y-6">
      {/* 109 Flights Program Banner & Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>برنامج الجسر الجوي الـ 109</span>
            <Plane className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            42 <span className="text-sm font-normal text-slate-500">/ 109 رحلة</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(42 / 109) * 100}%` }}></div>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400 font-sans">
            38.5% من إجمالي رحلات استيراد الأبقار الأمريكية
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>الرؤوس في الأجواء الآن</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {totalHeadsInTransit.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-500">رأس هولشتاين</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans">
            عبر طائرات بوينغ 747-400F و 777F المكيّفة
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>تحت الحجر البيطري</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {totalQuarantineHolding.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-500">رأس</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans">
            مستوى الحجر الأولي (48h مطارات) + حجر المزارع (30 يوماً)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>نسبة النفوق أثناء الشحن</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">0.000%</div>
          <div className="mt-2 text-[11px] text-slate-400 font-sans">
            صفر وفيات بفضل نظام التهوية والضغط المتطور
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم الرحلة، شهادة USDA، الولاية الأمريكية أو المطار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {[
            { id: 'all', label: 'الكل (All)' },
            { id: 'in_flight', label: 'في الجو (In Flight)' },
            { id: 'quarantine_holding', label: 'في الحجر (Quarantine)' },
            { id: 'landed', label: 'هبطت (Landed)' },
            { id: 'boarding', label: 'تحميل (Boarding)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id)}
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                filterStatus === item.id
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flight Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((flight) => {
          const isSelected = selectedFlightId === flight.id;
          const isUsdaVerified = flight.usdaStatus === 'verified';

          return (
            <div
              key={flight.id}
              onClick={() => onSelectFlight(flight)}
              className={`rounded-xl border p-5 transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-emerald-500 bg-slate-900/90 shadow-xl shadow-emerald-950/40'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              {/* Status Header Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-slate-100">
                      {flight.flightNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      دفعة #{flight.flightBatchIndex}/109
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {flight.aircraftModel} • {flight.headCount} رأس هولشتاين نقي
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[11px] font-mono px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                      flight.status === 'in_flight'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 animate-pulse'
                        : flight.status === 'quarantine_holding'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/50'
                        : flight.status === 'landed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {flight.status === 'in_flight'
                      ? '✈ في الأجواء (IN FLIGHT)'
                      : flight.status === 'quarantine_holding'
                      ? '🛡 حجر وقائي (QUARANTINE)'
                      : flight.status === 'landed'
                      ? '🛬 هبطت بالمطار'
                      : flight.status}
                  </span>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {flight.quarantineStage === 'farm_quarantine_30d'
                      ? 'حجر المزرعة (30 يوم)'
                      : 'حجر المطار الأولي (48 ساعة)'}
                  </span>
                </div>
              </div>

              {/* Flight Route Path Visualization */}
              <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 mb-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-emerald-400 font-bold text-sm">
                      {flight.originAirport?.code || 'DFW'} ({flight.originAirport?.state || 'US'})
                    </div>
                    <div className="text-[11px] text-slate-400">{flight.originAirport?.name || 'US Departure Hub'}</div>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <Plane className="w-4 h-4 text-emerald-400 rotate-90 my-1" />
                    <span className="text-[10px] text-slate-500">عبور المحيط الأطلسي</span>
                  </div>

                  <div className="text-left">
                    <div className="text-cyan-400 font-bold text-sm">
                      {flight.destinationAirport?.code || 'DZ'} ({flight.destinationAirport?.wilaya || 'Algeria'})
                    </div>
                    <div className="text-[11px] text-slate-400">{flight.destinationAirport?.name || 'Algeria Port of Entry'}</div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                  <span>المزرعة المستهدفة: <strong className="text-slate-200">{flight.destinationFarm?.name || 'مزرعة الحجر الاستراتيجي'}</strong></span>
                </div>
              </div>

              {/* Cargo Cabin Environmental Telemetry */}
              <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Thermometer className="w-3 h-3 text-emerald-400" />
                    حرارة الكابينة
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {flight.cabinTelemetry.ambientTempC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    الرطوبة
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {flight.cabinTelemetry.relativeHumidityPct}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Wind className="w-3 h-3 text-emerald-400" />
                    تغيير الهواء/س
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {flight.cabinTelemetry.airChangeRatePerHour}x
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    الأكسجين
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {flight.cabinTelemetry.oxygenLevelPct}%
                  </div>
                </div>
              </div>

              {/* USDA APHIS Health Certificate Verification Bar */}
              <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className={`w-4 h-4 ${isUsdaVerified ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-200">
                      {flight.usdaHealthCertNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {flight.usdaVerifiedBy} ({flight.usdaVerificationDate})
                    </div>
                  </div>
                </div>

                {isUsdaVerified ? (
                  <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>معتمدة من USDA APHIS</span>
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleVerify(flight.id, e)}
                    disabled={verifyingId === flight.id}
                    className="flex items-center gap-1 text-xs font-mono font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1 rounded cursor-pointer transition shadow"
                  >
                    {verifyingId === flight.id ? 'جارٍ التحقق...' : 'التحقق والمصادقة على الشهادة'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
