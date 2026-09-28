import React, { useState, useEffect } from 'react';
import {
  SmartCollarTelemetry,
  SoilTdrTelemetry,
  CowActivityState,
  IoTTopicMessage,
} from '../types';
import { iotSimulator, INITIAL_COLLARS_DEF, INITIAL_SOIL_SENSORS_DEF } from '../services/iotEngine';
import {
  Radio,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Zap,
  Play,
  Pause,
  Flame,
  Snowflake,
  Clock,
  Sparkles,
  Layers,
  Heart,
  Wheat,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';

interface Props {
  soundEnabled: boolean;
}

export const IoTTelemetryPanel: React.FC<Props> = ({ soundEnabled }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [heatwaveMode, setHeatwaveMode] = useState(false);
  const [intervalMs, setIntervalMs] = useState(3000);
  const [totalPackets, setTotalPackets] = useState(0);

  const [collars, setCollars] = useState<SmartCollarTelemetry[]>([]);
  const [soilSensors, setSoilSensors] = useState<SoilTdrTelemetry[]>([]);
  const [mqttMessages, setMqttMessages] = useState<IoTTopicMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<IoTTopicMessage | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Initialize initial state
  useEffect(() => {
    const initCollars = INITIAL_COLLARS_DEF.map((c) => iotSimulator.generateCollarReading(c));
    const initSoil = INITIAL_SOIL_SENSORS_DEF.map((s) => iotSimulator.generateSoilReading(s));
    setCollars(initCollars);
    setSoilSensors(initSoil);
    setMqttMessages(iotSimulator.getRecentMessages());
    if (iotSimulator.getRecentMessages().length > 0) {
      setSelectedMessage(iotSimulator.getRecentMessages()[0]);
    }
  }, []);

  // Connect to SSE stream or use local fallback loop
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let localTimer: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/api/iot/stream');

      eventSource.addEventListener('snapshot', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.collars) setCollars(data.collars);
          if (data.soilSensors) setSoilSensors(data.soilSensors);
          if (typeof data.totalPackets === 'number') setTotalPackets(data.totalPackets);
          if (typeof data.heatwaveMode === 'boolean') setHeatwaveMode(data.heatwaveMode);
        } catch {}
      });

      eventSource.addEventListener('collar_telemetry', (e) => {
        try {
          const collar: SmartCollarTelemetry = JSON.parse(e.data);
          setCollars((prev) => {
            const index = prev.findIndex((c) => c.rfidTag === collar.rfidTag);
            if (index >= 0) {
              const next = [...prev];
              next[index] = collar;
              return next;
            }
            return [collar, ...prev];
          });
          setTotalPackets((prev) => prev + 1);

          const topic = `sol/iot/livestock/${collar.rfidTag}/telemetry`;
          setMqttMessages((prev) => [
            { topic, timestamp: collar.timestamp, protocol: 'MQTT', qos: 1, payload: collar },
            ...prev.slice(0, 30),
          ]);
        } catch {}
      });

      eventSource.addEventListener('soil_telemetry', (e) => {
        try {
          const soil: SoilTdrTelemetry = JSON.parse(e.data);
          setSoilSensors((prev) => {
            const index = prev.findIndex((s) => s.zoneId === soil.zoneId);
            if (index >= 0) {
              const next = [...prev];
              next[index] = soil;
              return next;
            }
            return [soil, ...prev];
          });
          setTotalPackets((prev) => prev + 1);

          const topic = `sol/iot/soil/${soil.zoneId}/tdr`;
          setMqttMessages((prev) => [
            { topic, timestamp: soil.timestamp, protocol: 'MQTT', qos: 1, payload: soil },
            ...prev.slice(0, 30),
          ]);
        } catch {}
      });

      eventSource.onerror = () => {
        // Fallback to client-side timer if SSE disconnects or during preview
        if (!localTimer && isRunning) {
          startLocalFallback();
        }
      };
    } catch {
      startLocalFallback();
    }

    function startLocalFallback() {
      localTimer = setInterval(() => {
        if (!isRunning) return;
        const newCollars = INITIAL_COLLARS_DEF.map((c) => iotSimulator.generateCollarReading(c));
        const newSoil = INITIAL_SOIL_SENSORS_DEF.map((s) => iotSimulator.generateSoilReading(s));
        setCollars(newCollars);
        setSoilSensors(newSoil);
        setTotalPackets((prev) => prev + newCollars.length + newSoil.length);
        setMqttMessages(iotSimulator.getRecentMessages());
      }, intervalMs);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (localTimer) clearInterval(localTimer);
    };
  }, [isRunning, intervalMs]);

  // Controller Actions
  const handleToggleRunning = async () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    try {
      await fetch('/api/iot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextState ? 'start' : 'stop' }),
      });
    } catch {}
  };

  const handleToggleHeatwave = async () => {
    const nextHeatwave = !heatwaveMode;
    setHeatwaveMode(nextHeatwave);
    iotSimulator.setHeatwaveMode(nextHeatwave);
    try {
      await fetch('/api/iot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heatwaveMode: nextHeatwave }),
      });
    } catch {}
  };

  const handleChangeInterval = async (ms: number) => {
    setIntervalMs(ms);
    try {
      await fetch('/api/iot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: ms }),
      });
    } catch {}
  };

  const handleCopyPayload = () => {
    if (!selectedMessage) return;
    navigator.clipboard.writeText(JSON.stringify(selectedMessage, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const getActivityBadge = (state: CowActivityState) => {
    switch (state) {
      case 'grazing':
        return { label: 'تغذية ورعي (Grazing)', bg: 'bg-emerald-950 text-emerald-400 border-emerald-500/40' };
      case 'rumination':
        return { label: 'اجترار طبيعي (Rumination)', bg: 'bg-cyan-950 text-cyan-400 border-cyan-500/40' };
      case 'resting':
        return { label: 'فترة راحة (Resting)', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'heat_stressed_lethargic':
        return { label: 'خمول إجهاد حراري (Heat Stressed)', bg: 'bg-red-950 text-red-400 border-red-500/60 animate-pulse' };
      default:
        return { label: 'نشط (Active)', bg: 'bg-emerald-950 text-emerald-400 border-emerald-500/40' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulator Master Command Bar */}
      <div className="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-md">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-slate-100">
                  محاكي ومستقبل أجهزة الـ IoT (AWS/GCP IoT Core Spec)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  MQTT v3.1.1 / WSS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                بث تيارات حية لعصابات الأبقار الذكية (Collars) ومجسات TDR لرطوبة التربة عبر مواضيع MQTT المعيارية
              </p>
            </div>
          </div>

          {/* Interactive Live Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Play/Pause */}
            <button
              onClick={handleToggleRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shadow ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'إيقاف البث (PAUSE)' : 'استئناف البث (RESUME)'}</span>
            </button>

            {/* Heatwave Mode Trigger */}
            <button
              onClick={handleToggleHeatwave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer shadow ${
                heatwaveMode
                  ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="محاكاة موجة حر شديدة في صحراء أدرار لاختبار عتبة THI >= 75"
            >
              <Flame className={`w-3.5 h-3.5 ${heatwaveMode ? 'text-red-400' : 'text-amber-400'}`} />
              <span>{heatwaveMode ? 'موجة الحر مفعلة (THI>=75) 🔥' : 'اختبار موجة الحر (Stress Test)'}</span>
            </button>

            {/* Frequency selection */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-500 px-1.5">التردد:</span>
              {[1000, 3000, 5000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => handleChangeInterval(ms)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    intervalMs === ms
                      ? 'bg-emerald-600 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>

            {/* Telemetry Packets Badge */}
            <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-400">
              الحزم المبثوثة: <strong className="text-slate-200">{totalPackets.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Dynamic Formula Banner */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">معادلة THI المعتمدة:</span>
            <code className="text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              THI = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
            </code>
          </div>
          <div className="flex items-center gap-3">
            <span>عتبة التبريد الحرج: <strong className="text-amber-400">THI ≥ 75.0</strong></span>
            <span>مواضيع MQTT: <code className="text-cyan-400">sol/iot/#</code></span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Smart Livestock Collars (عصابات الأبقار الحيوية) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
              1. عصابات الأبقار الذكية اللحظية (Smart Livestock Collars Telemetry)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            موضوع البث: <code className="text-emerald-400">sol/iot/livestock/{'{rfid}'}/telemetry</code>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {collars.map((c) => {
            const activityInfo = getActivityBadge(c.activityState);
            const isAlert = c.coolingAlertActive || c.thiIndex >= 75;

            return (
              <div
                key={c.rfidTag}
                className={`rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between font-mono ${
                  isAlert
                    ? 'border-red-500/80 bg-red-950/20 shadow-xl shadow-red-950/40'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Header: Tag & Cow Name */}
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div>
                      <div className="font-bold text-emerald-400 text-sm">{c.rfidTag}</div>
                      <div className="text-[11px] text-slate-300 font-sans">{c.cowName}</div>
                      <div className="text-[10px] text-slate-500">
                        {c.deviceId} • ولاية {c.wilaya === 'Adrar' ? 'أدرار' : c.wilaya === 'Biskra' ? 'بسكرة' : 'ميلة'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${activityInfo.bg}`}>
                        {activityInfo.label}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-rose-400">
                        <Heart className="w-3 h-3 animate-pulse" />
                        <span>{c.heartRateBpm} BPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Temp vs Ambient Temp */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-rose-400" />
                        حرارة الجسم
                      </div>
                      <div className="text-base font-bold text-slate-100 mt-0.5">
                        {c.bodyTempC}°C
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {c.bodyTempC > 39.5 ? 'ارتفاع حراري' : 'طبيعي (38.5-39.3)'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-400" />
                        الجو المحيط
                      </div>
                      <div className="text-base font-bold text-cyan-300 mt-0.5">
                        {c.ambientTempC}°C
                      </div>
                      <div className="text-[9px] text-slate-400">رطوبة {c.relativeHumidityPct}%</div>
                    </div>
                  </div>

                  {/* Calculated THI Gauge */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">مؤشر الإجهاد THI:</span>
                      <strong className={isAlert ? 'text-red-400 text-sm font-bold' : 'text-emerald-400 text-sm'}>
                        {c.thiIndex}
                      </strong>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.thiIndex >= 79
                            ? 'bg-red-500'
                            : c.thiIndex >= 75
                            ? 'bg-amber-500'
                            : c.thiIndex >= 70
                            ? 'bg-yellow-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, ((c.thiIndex - 50) / 45) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Automated Cooling Action Interventions */}
                <div
                  className={`p-2.5 rounded-lg border text-[10px] space-y-1 transition-colors ${
                    isAlert
                      ? 'bg-red-950/80 border-red-500 text-red-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Wind className="w-3 h-3 text-cyan-400" />
                      {isAlert ? '🚨 بروتوكول التبريد الإجباري (نشط)' : 'نظام التهوية القياسي'}
                    </span>
                    <span>مراوح {c.coolingIntervention.tunnelFanSpeedPct}%</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>رشاشات: كل {c.coolingIntervention.sprinklerIntervalMinutes} دقائق</span>
                    <span>بيكربونات: +{c.coolingIntervention.rumenBufferSupplementGrams} غرام</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Soil TDR Sensors (مجسات رطوبة التربة TDR) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
              2. مجسات رطوبة التربة TDR لحقول الأعلاف (Soil TDR Probes)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            موضوع البث: <code className="text-amber-400">sol/iot/soil/{'{zone}'}/tdr</code>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {soilSensors.map((s) => {
            const isDeficit = s.irrigationStatus === 'DEFICIT_IRRIGATE_NOW';
            const isOptimal = s.irrigationStatus === 'OPTIMAL';

            return (
              <div
                key={s.zoneId}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 font-mono text-xs"
              >
                {/* Zone Name & Crop */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-bold text-slate-100 text-sm">{s.zoneNameAr}</span>
                    <div className="text-[11px] text-amber-400 mt-0.5">
                      محصول العلف: <strong>{s.cropType}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      معرف المجس: {s.sensorId} • عمق القياس: {s.depthCm} سم
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isDeficit
                        ? 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse'
                        : isOptimal
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-500/50'
                    }`}
                  >
                    {isDeficit ? 'عجز مائي - ري فوري' : isOptimal ? 'رطوبة مثالية' : 'تشبع مائي'}
                  </span>
                </div>

                {/* VWC & EC Gauges */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Droplets className="w-3 h-3 text-cyan-400" />
                      المحتوى المائي
                    </div>
                    <div className="text-base font-bold text-cyan-300 mt-0.5">{s.vwcPct}%</div>
                    <div className="text-[9px] text-slate-400">VWC الحجمي</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      الملوحة EC
                    </div>
                    <div className="text-base font-bold text-amber-300 mt-0.5">{s.ecDsM}</div>
                    <div className="text-[9px] text-slate-400">dS/m ملوحة</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Thermometer className="w-3 h-3 text-emerald-400" />
                      حرارة الجذور
                    </div>
                    <div className="text-base font-bold text-emerald-300 mt-0.5">{s.rootZoneTempC}°C</div>
                    <div className="text-[9px] text-slate-400">عمق {s.depthCm}cm</div>
                  </div>
                </div>

                {/* Irrigation Recommendation */}
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">كمية مياه الري المقترحة:</span>
                  <strong className={isDeficit ? 'text-red-400 text-xs' : 'text-emerald-400 text-xs'}>
                    {s.recommendedWaterM3Ha > 0 ? `${s.recommendedWaterM3Ha} م³/هكتار` : 'الري متوقف (مشبع)'}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Live MQTT Bus Monitor & JSON Payload Inspector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>محلل وسيط رسائل الـ MQTT اللحظي (AWS/GCP IoT Broker Stream)</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              مراقبة الحزم المتدفقة لحظياً، التنسيق المتوافق مع AWS IoT Core، وسكريبتات المحاكاة المستقلة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPayload}
              disabled={!selectedMessage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer border border-slate-700"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPayload ? 'تم النسخ!' : 'نسخ Payload JSON'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Message Log Stream */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {mqttMessages.map((msg, i) => {
              const isSelected = selectedMessage?.timestamp === msg.timestamp && selectedMessage?.topic === msg.topic;
              const isCollar = msg.topic.includes('livestock');

              return (
                <div
                  key={i}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between text-[11px] ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 text-slate-100'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${isCollar ? 'bg-cyan-950 text-cyan-400 border-cyan-500/30' : 'bg-amber-950 text-amber-400 border-amber-500/30'}`}>
                      {isCollar ? 'COLLAR' : 'SOIL-TDR'}
                    </span>
                    <span className="text-slate-200 font-bold truncate">{msg.topic}</span>
                  </div>

                  <span className="text-slate-500 text-[10px] ml-2 shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Formatted Payload Viewer */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-[10px] text-slate-500">
              <span>الموضوع: <strong className="text-cyan-400">{selectedMessage?.topic || 'اختر حزمة'}</strong></span>
              <span>QoS 1 • JSON MQTT Payload</span>
            </div>

            <pre className="text-emerald-400 text-[11px] overflow-x-auto max-h-[240px] leading-relaxed">
              {selectedMessage
                ? JSON.stringify(selectedMessage.payload, null, 2)
                : '// انقر على أي رسالة لمشاهدة الـ Payload المشفر'}
            </pre>
          </div>
        </div>

        {/* Execution Guides & CLI instructions */}
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">تشغيل المحاكي كخدمة خلفية مستقلة (CLI):</span>
            <code className="text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              npx tsx scripts/iot_simulator.ts
            </code>
            <span className="text-slate-500">أو</span>
            <code className="text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              python3 scripts/iot_simulator.py
            </code>
          </div>

          <div className="text-slate-500">
            متوافق مع AWS IoT Core MQTT broker و Mosquitto
          </div>
        </div>
      </div>
    </div>
  );
};
