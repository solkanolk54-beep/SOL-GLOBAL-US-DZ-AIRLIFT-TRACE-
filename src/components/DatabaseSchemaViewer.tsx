import React, { useState } from 'react';
import { POSTGRES_TABLES, SchemaTableDef } from '../db/schemaDefinition';
import {
  Database,
  Code2,
  Send,
  Copy,
  Check,
  Terminal,
  MapPin,
  Sparkles,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

export const DatabaseSchemaViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'sql' | 'api' | 'spatial'>('tables');
  const [selectedTable, setSelectedTable] = useState<SchemaTableDef>(POSTGRES_TABLES[0]);
  const [copiedSql, setCopiedSql] = useState(false);

  // Interactive API Console state
  const [apiEndpoint, setApiEndpoint] = useState('/api/airlift/flights');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiBody, setApiBody] = useState('{\n  "rfidTag": "RFID-CTL-9021",\n  "checkpointLocation": "Adrar Primary Gate"\n}');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);

  const handleCopySql = () => {
    // Generate full SQL text
    const fullSql = `-- SOL Global / US-DZ Airlift & Livestock Trace System
-- PostgreSQL with PostGIS Spatial Extension DDL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

` + POSTGRES_TABLES.map(t => {
      const cols = t.columns.map(c => `    ${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`).join(',\n');
      return `CREATE TABLE IF NOT EXISTS ${t.name} (\n${cols}\n);`;
    }).join('\n\n');

    navigator.clipboard.writeText(fullSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleExecuteApi = async () => {
    setIsCallingApi(true);
    try {
      let res;
      if (apiMethod === 'GET') {
        res = await fetch(apiEndpoint);
      } else {
        res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: apiBody,
        });
      }
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message, status: 'Simulated Local Response' }, null, 2));
    } finally {
      setIsCallingApi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold font-mono text-emerald-400 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>مخطط قواعد البيانات (PostgreSQL + PostGIS) وخدمات الـ API المركزية</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            الجداول الخمسة المطلوبة: airlift_shipments, livestock, health_records, feed_logs, qr_traceability
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab('tables')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeSubTab === 'tables' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مستكشف الجداول (Tables)
          </button>
          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeSubTab === 'sql' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            كود SQL DDL
          </button>
          <button
            onClick={() => setActiveSubTab('api')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeSubTab === 'api' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            منصة اختبار API (Console)
          </button>
          <button
            onClick={() => setActiveSubTab('spatial')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeSubTab === 'spatial' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            استعلامات PostGIS المكانية
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Table Explorer */}
      {activeSubTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table List */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">
              الجداول الرئيسية (5 Tables)
            </h3>
            {POSTGRES_TABLES.map((t) => {
              const isSelected = selectedTable.name === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-right p-3 rounded-lg border font-mono text-xs transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/50 text-slate-100 shadow'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-emerald-400 flex items-center justify-between">
                    <span>{t.name}</span>
                    {t.postGisColumns && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        PostGIS
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-1">
                    {t.descriptionAr}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Table Columns Schema */}
          <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                  <span>جدول: {selectedTable.name}</span>
                  {selectedTable.postGisColumns && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                      يدعم التتبع الجغرافي PostGIS (GEOMETRY Point, 4326)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {selectedTable.descriptionAr}
                </p>
              </div>

              <div className="text-xs text-slate-400">
                المفتاح الرئيسي: <strong className="text-slate-200">{selectedTable.primaryKey}</strong>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">اسم العمود (Column Name)</th>
                    <th className="p-3">نوع البيانات (PostgreSQL Type)</th>
                    <th className="p-3">Nullable</th>
                    <th className="p-3">الوصف الفني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                  {selectedTable.columns.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60">
                      <td className="p-3 font-bold text-slate-200 flex items-center gap-1.5">
                        {col.isSpatial && <MapPin className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{col.name}</span>
                        {col.isFk && (
                          <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-amber-400 rounded">
                            FK ➔ {col.fkRef}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-cyan-400 font-bold">{col.type}</td>
                      <td className="p-3 text-slate-400">{col.nullable ? 'YES' : 'NO'}</td>
                      <td className="p-3 text-slate-300 font-sans text-[11px]">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Full SQL DDL */}
      {activeSubTab === 'sql' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-200 text-sm">
              ملف التأسيس الكامل (schema.sql - PostgreSQL 16 + PostGIS)
            </span>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
            >
              {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? 'تم النسخ للحافظة!' : 'نسخ كود SQL كامل'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-emerald-400 max-h-[500px]">
{`-- ============================================================================
-- SOL Global / US-DZ Airlift & Livestock Trace System Architecture
-- Database Schema: PostgreSQL 16+ with PostGIS Spatial Extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE airlift_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number VARCHAR(32) NOT NULL UNIQUE,
    flight_batch_index INT NOT NULL CHECK (flight_batch_index BETWEEN 1 AND 109),
    origin_airport_code VARCHAR(8) NOT NULL,
    origin_geom GEOMETRY(Point, 4326) NOT NULL,
    destination_airport_code VARCHAR(8) NOT NULL,
    destination_geom GEOMETRY(Point, 4326) NOT NULL,
    aircraft_model VARCHAR(64) NOT NULL DEFAULT 'Boeing 747-400F Cargo',
    head_count INT NOT NULL CHECK (head_count > 0),
    departure_time TIMESTAMPTZ NOT NULL,
    estimated_arrival_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL,
    usda_health_cert_number VARCHAR(64) NOT NULL UNIQUE,
    cabin_temp_celsius NUMERIC(4, 2) DEFAULT 16.5,
    cabin_humidity_pct NUMERIC(4, 2) DEFAULT 55.0
);

CREATE TABLE livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfid_tag VARCHAR(32) NOT NULL UNIQUE, -- ISO 11784/11785 FDX-B
    us_ear_tag VARCHAR(32) NOT NULL,
    dz_national_id VARCHAR(32) NOT NULL UNIQUE,
    breed VARCHAR(64) NOT NULL DEFAULT 'Purebred Holstein Friesian',
    airlift_shipment_id UUID REFERENCES airlift_shipments(id),
    current_wilaya VARCHAR(64) NOT NULL,
    farm_id VARCHAR(64) NOT NULL,
    location_geom GEOMETRY(Point, 4326) NOT NULL, -- GPS coordinates
    sire_name VARCHAR(128) NOT NULL,
    dam_name VARCHAR(128) NOT NULL,
    genetic_merit_tpi INT NOT NULL,
    current_weight_kg NUMERIC(6, 2) NOT NULL,
    average_milk_yield_liters NUMERIC(5, 2) NOT NULL, -- Target 30-40 L/Day
    health_score INT NOT NULL DEFAULT 95
);

CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    rfid_tag VARCHAR(32) NOT NULL,
    record_type VARCHAR(64) NOT NULL,
    examination_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    veterinarian_name VARCHAR(128) NOT NULL,
    vaccine_or_drug_name VARCHAR(128),
    quarantine_clearance_passed BOOLEAN DEFAULT TRUE
);

CREATE TABLE feed_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id VARCHAR(64) NOT NULL,
    wilaya VARCHAR(64) NOT NULL,
    ambient_temp_celsius NUMERIC(4, 2) NOT NULL,
    relative_humidity_pct NUMERIC(4, 2) NOT NULL,
    thi_index NUMERIC(5, 2) NOT NULL,
    alfalfa_hay_kg NUMERIC(5, 2) NOT NULL,
    corn_silage_kg NUMERIC(5, 2) NOT NULL,
    soybean_meal_48_kg NUMERIC(5, 2) NOT NULL,
    bypass_rumen_fat_kg NUMERIC(4, 2) NOT NULL,
    sodium_bicarbonate_grams INT NOT NULL
);

CREATE TABLE qr_traceability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code VARCHAR(64) NOT NULL UNIQUE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    product_type VARCHAR(64) NOT NULL,
    farm_id VARCHAR(64) NOT NULL,
    farm_geom GEOMETRY(Point, 4326) NOT NULL,
    contributing_rfid_tags TEXT[] NOT NULL,
    fat_percentage NUMERIC(4, 2) NOT NULL,
    protein_percentage NUMERIC(4, 2) NOT NULL,
    antibiotic_residue_negative BOOLEAN NOT NULL DEFAULT TRUE
);`}
          </pre>
        </div>
      )}

      {/* Sub-Tab 3: Interactive REST API Console */}
      {activeSubTab === 'api' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>وحدة تحكم واجهات برمجة التطبيقات التكتيكية (Express Microservices API)</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              اختبر المسارات الحية لربط ماسح الـ RFID، تسجيل الحلب، حساب الـ THI، والتحقق المشفر من الجوازات
            </p>
          </div>

          {/* Quick Endpoint Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-[11px]">نقاط نهاية سريعة:</span>
            {[
              { path: '/api/airlift/flights', method: 'GET' as const, label: 'قائمة الرحلات الجوية' },
              { path: '/api/livestock', method: 'GET' as const, label: 'سجل قطيع الأبقار' },
              { path: '/api/livestock/scan', method: 'POST' as const, label: 'مسح شريحة RFID' },
              { path: '/api/climate-feed/calculate-ration', method: 'POST' as const, label: 'حساب العليقة و THI' },
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setApiEndpoint(p.path);
                  setApiMethod(p.method);
                  if (p.path === '/api/climate-feed/calculate-ration') {
                    setApiBody('{\n  "wilaya": "Adrar",\n  "ambientTempC": 39.0,\n  "relativeHumidityPct": 18.0,\n  "targetYieldLiters": 38.0\n}');
                  } else if (p.path === '/api/livestock/scan') {
                    setApiBody('{\n  "rfidTag": "RFID-CTL-9021",\n  "checkpointLocation": "Adrar Quarantine Terminal"\n}');
                  }
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] cursor-pointer"
              >
                [{p.method}] {p.label}
              </button>
            ))}
          </div>

          {/* Request Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={apiMethod}
              onChange={(e) => setApiMethod(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>

            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-emerald-300 focus:outline-none"
            />

            <button
              onClick={handleExecuteApi}
              disabled={isCallingApi}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isCallingApi ? 'جارٍ الإرسال...' : 'تنفيذ الطلب'}</span>
            </button>
          </div>

          {apiMethod === 'POST' && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">حمولة الطلب (JSON Request Body):</label>
              <textarea
                rows={4}
                value={apiBody}
                onChange={(e) => setApiBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Response Console */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">الاستجابة (Live Response):</label>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 max-h-[300px] overflow-y-auto text-[11px]">
              {apiResponse || '// اضغط على "تنفيذ الطلب" لتشغيل المسار ومشاهدة النتائج المباشرة'}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: PostGIS Spatial Queries */}
      {activeSubTab === 'spatial' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>استعلامات PostGIS المكانية لإدارة المزارع ومسافات النقل</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              دوال حساب المسافات الكروية (ST_DistanceSphere) بين مطار الحجر والمزرعة، ونقاط تمركز القطيع
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-emerald-400">
                1. حساب مسافة النقل الجوي إلى المزرعة (Adrar Airport ➔ Mega Farm):
              </div>
              <pre className="text-[11px] text-slate-300 overflow-x-auto">
{`SELECT 
  a.flight_number,
  a.destination_airport_name,
  ROUND((ST_DistanceSphere(a.destination_geom, l.location_geom) / 1000.0)::numeric, 2) AS distance_km
FROM airlift_shipments a
JOIN livestock l ON l.airlift_shipment_id = a.id
WHERE a.destination_airport_code = 'AZR'
LIMIT 1;
-- النتيجة المحسوبة: 12.45 KM (وقت النقل بالشاحنة المكيفة: 22 دقيقة)`}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400">
                2. تحديد مركز ثقل القطيع ونطاق الرعي الجغرافي:
              </div>
              <pre className="text-[11px] text-slate-300 overflow-x-auto">
{`SELECT 
  current_wilaya,
  COUNT(id) AS active_cows,
  ST_AsText(ST_Centroid(ST_Collect(location_geom))) AS herd_centroid,
  ST_AsText(ST_ConvexHull(ST_Collect(location_geom))) AS biosecurity_fence_polygon
FROM livestock
GROUP BY current_wilaya;
-- يعطي الإحداثيات الجغرافية لحدود السياج البيولوجي الآمن`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
