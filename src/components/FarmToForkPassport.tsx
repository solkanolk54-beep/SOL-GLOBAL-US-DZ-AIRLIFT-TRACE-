import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrPassportPayload, WilayaLocation } from '../types';
import { apiService } from '../services/apiService';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  FileBadge,
  Sparkles,
  MapPin,
  Clock,
  Thermometer,
  Layers,
  Search,
  Download,
  AlertTriangle,
  Beaker,
} from 'lucide-react';

export const FarmToForkPassport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'verify'>('generate');

  // Generator State
  const [batchId, setBatchId] = useState(`SOL-BATCH-DZ-2026-${Math.floor(1000 + Math.random() * 9000)}-MK`);
  const [farmWilaya, setFarmWilaya] = useState<WilayaLocation>('Adrar');
  const [productType, setProductType] = useState<QrPassportPayload['productType']>('Raw A-Grade Milk (حليب خام ممتاز)');
  const [volumeLiters, setVolumeLiters] = useState('2450');
  const [selectedCowTags, setSelectedCowTags] = useState('RFID-CTL-9021, RFID-CTL-9022, RFID-CTL-9025');
  const [destinationPlant, setDestinationPlant] = useState('GIPLAIT Complex / Baladna Dairy Processing Unit');

  const [generatedPassport, setGeneratedPassport] = useState<QrPassportPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifiedResult, setVerifiedResult] = useState<{
    isValid: boolean;
    passport: QrPassportPayload | null;
    verificationDetails: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Generate initial QR on mount for seamless demo
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    try {
      const cowList = selectedCowTags.split(',').map((s) => s.trim()).filter(Boolean);
      const passport = await apiService.generateQrPassport({
        batchId,
        productType,
        cowRfidList: cowList,
        farmId: farmWilaya === 'Adrar' ? 'DZ-FARM-ADRAR-01' : farmWilaya === 'Biskra' ? 'DZ-FARM-BISKRA-01' : 'DZ-FARM-MILA-01',
        farmName:
          farmWilaya === 'Adrar'
            ? 'Adrar Mega-Dairy Oasis Complex (مشروع أدرار الاستراتيجي)'
            : farmWilaya === 'Biskra'
            ? 'Ziban Agro-Dairy Basin Complex (مجمع الزيبان بسكرة)'
            : 'Mila High Plains Dairy Hub (مشروع الهضاب العليا ميلة)',
        farmWilaya,
        volumeLiters: parseFloat(volumeLiters) || 1500,
        destinationPlant,
      });

      setGeneratedPassport(passport);

      // Generate QR Code Data URL
      const qrPayloadString = JSON.stringify({
        token: passport.token,
        batch: passport.batchId,
        farm: passport.farmName,
        wilaya: passport.farmWilaya,
        geo: passport.farmCoordinates,
        usdaCert: passport.usdaHealthCertReference,
        volL: passport.volumeLiters,
        fat: passport.labAnalysis.fatPercentage,
        prot: passport.labAnalysis.proteinPercentage,
        somaticCell: passport.labAnalysis.somaticCellCount,
        sig: passport.hmacSignature.substring(0, 24),
      });

      const url = await QRCode.toDataURL(qrPayloadString, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
        color: {
          dark: '#022c22',
          light: '#f8fafc',
        },
      });

      setQrDataUrl(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async (tokenToTest?: string) => {
    const target = (tokenToTest || verifyInput).trim();
    if (!target) return;
    setIsVerifying(true);
    try {
      const result = await apiService.verifyQrPassport(target);
      setVerifiedResult(result);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold font-mono text-emerald-400 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>نظام جواز السفر الرقمي المشفر Farm-to-Fork والجودة المخبرية</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            ربط كل صهريج حليب أو شحنة لحم بسجل الأبقار الأمريكية المستوردة، التحاليل المخبرية والتوقيع الرقمي HMAC-SHA256
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeTab === 'generate'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            توليد جواز الشحنة (Generate)
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded cursor-pointer transition ${
              activeTab === 'verify'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            التحقق والاستعادة (Scan & Verify)
          </button>
        </div>
      </div>

      {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-emerald-400" />
              <span>إصدار شهادة وجواز إلكتروني للدفعة (Batch Certificate)</span>
            </h3>

            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">رمز الدفعة الفريد (Batch ID)</label>
                <input
                  type="text"
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">المزرعة والموقع (Wilaya)</label>
                  <select
                    value={farmWilaya}
                    onChange={(e) => setFarmWilaya(e.target.value as WilayaLocation)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Adrar">أدرار (مشروع الواحة 100K رأس)</option>
                    <option value="Biskra">بسكرة (مجمع الزيبان)</option>
                    <option value="Mila">ميلة (حوض الهضاب العليا)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">نوع المنتج المصرح به</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Raw A-Grade Milk (حليب خام ممتاز)">حليب خام ممتاز (فئة A)</option>
                    <option value="Pasteurized Tanker Milk">صهريج حليب مبستر</option>
                    <option value="Certified Holstein Beef">لحم بقري هولشتاين معتمد</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">حجم الشحنة (باللتر أو الكغ)</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={volumeLiters}
                    onChange={(e) => setVolumeLiters(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-cyan-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">وجهة التسليم (مصنع التحويل)</label>
                  <input
                    type="text"
                    required
                    value={destinationPlant}
                    onChange={(e) => setDestinationPlant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  شرائح RFID للأبقار المساهمة في الحلب (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  required
                  value={selectedCowTags}
                  onChange={(e) => setSelectedCowTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'جارٍ التشفير والتوقيع...' : 'توليد الرمز المشفّر وجواز السفر الرقمي'}</span>
              </button>
            </form>
          </div>

          {/* Generated Passport & QR Code Certificate */}
          {generatedPassport && qrDataUrl && (
            <div className="rounded-xl border border-emerald-500/50 bg-slate-900/90 p-5 space-y-4 font-mono text-xs shadow-xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-slate-100 text-sm">
                    شهادة الجودة الرقمية المعتمدة (HMAC-SHA256)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  صالح ومعتمد مخبرياً
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-emerald-500 shadow-md">
                  <img src={qrDataUrl} alt="Farm-to-Fork Encrypted QR Code" className="w-48 h-48 object-contain" />
                  <span className="text-[10px] font-mono text-slate-800 font-bold mt-1 text-center">
                    {generatedPassport.token}
                  </span>
                </div>

                {/* Passport Key Parameters */}
                <div className="space-y-2 text-slate-300 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500">المزرعة الأصلية (PostGIS GPS)</div>
                    <div className="font-bold text-slate-100">{generatedPassport.farmName}</div>
                    <div className="text-[10px] text-emerald-400">
                      [{generatedPassport.farmCoordinates[0]}, {generatedPassport.farmCoordinates[1]}]
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">سلسلة الإمداد الجوي</div>
                    <div className="text-slate-200">
                      رحلة الجسر الجوي: <strong>{generatedPassport.airliftShipmentNumber}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      شهادة USDA: {generatedPassport.usdaHealthCertReference}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">حرارة سلسلة التبريد المباشرة</div>
                    <div className="text-cyan-300 font-bold">
                      {generatedPassport.coldChainTemperatureC}°C (مضبوط تحت 4 درجات مئوية)
                    </div>
                  </div>
                </div>
              </div>

              {/* Chemical & Lab Results Grid */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                  <Beaker className="w-3.5 h-3.5 text-cyan-400" />
                  <span>النتائج المخبرية الرسمية للدفعة:</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">نسبة الدهن</div>
                    <strong className="text-emerald-400 text-sm">{generatedPassport.labAnalysis.fatPercentage}%</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">نسبة البروتين</div>
                    <strong className="text-emerald-400 text-sm">{generatedPassport.labAnalysis.proteinPercentage}%</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">الحموضة دورنيك</div>
                    <strong className="text-slate-200 text-sm">{generatedPassport.labAnalysis.acidityDornic}°D</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">فحص المضادات</div>
                    <strong className="text-emerald-400 text-[11px]">سلبي (نظيف 100%)</strong>
                  </div>
                </div>
              </div>

              {/* Cryptographic Signature Footer */}
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
                <span>توقيع التشفير: <code className="text-emerald-400">{generatedPassport.hmacSignature.substring(0, 32)}...</code></span>
                <button
                  onClick={() => {
                    setActiveTab('verify');
                    setVerifyInput(generatedPassport.token);
                    handleVerify(generatedPassport.token);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  اختبار استعادة هذا الرمز فورا ➔
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Verification & Scan Simulator Tab */
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>ماسح التحقق واستعادة البيانات (Consumer & Factory Audit Portal)</span>
            </h3>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                placeholder="أدخل كود الجواز الرقمي أو رمز الدفعة (مثال: PASSPORT-DZ-ADR-20260927-TANK01)..."
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleVerify()}
                disabled={isVerifying || !verifyInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs transition cursor-pointer"
              >
                {isVerifying ? 'جارٍ التحقق...' : 'فحص الجواز والتحاليل'}
              </button>
            </div>

            {/* Quick Demo Token Fill */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>أمثلة سريعة:</span>
              <button
                onClick={() => {
                  setVerifyInput('PASSPORT-DZ-ADR-20260927-TANK01');
                  handleVerify('PASSPORT-DZ-ADR-20260927-TANK01');
                }}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                دفعة صهريج أدرار #01
              </button>
            </div>
          </div>

          {/* Verification Results Card */}
          {verifiedResult && (
            <div
              className={`rounded-xl border p-6 space-y-4 font-mono text-xs ${
                verifiedResult.isValid
                  ? 'border-emerald-500 bg-slate-900/90 shadow-2xl shadow-emerald-950'
                  : 'border-red-500 bg-red-950/40 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {verifiedResult.isValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <h4 className="text-base font-bold text-slate-100">
                      {verifiedResult.isValid ? 'جواز سفر رقمي أصلي ومطابق للمواصفات' : 'شهادة غير صالحة'}
                    </h4>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {verifiedResult.verificationDetails}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    verifiedResult.isValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-red-900 text-red-100'
                  }`}
                >
                  {verifiedResult.isValid ? 'HMAC VERIFIED' : 'INVALID'}
                </span>
              </div>

              {verifiedResult.passport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-slate-500 text-[10px]">المزرعة والمنشأ الفلاحي</div>
                    <div className="font-bold text-slate-100 text-sm">{verifiedResult.passport.farmName}</div>
                    <div className="text-slate-400 text-xs">
                      الولاية: <strong>{verifiedResult.passport.farmWilaya}</strong> • الإحداثيات:{' '}
                      <span className="text-emerald-400">
                        {verifiedResult.passport.farmCoordinates.join(', ')}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">
                      رحلة الجسر الجوي الأصلية: <strong>{verifiedResult.passport.airliftShipmentNumber}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-slate-500 text-[10px]">المطابقة المخبرية الصارمة</div>
                    <div className="text-slate-200">
                      نسبة الدهن: <strong className="text-emerald-400">{verifiedResult.passport.labAnalysis.fatPercentage}%</strong> | نسبة البروتين:{' '}
                      <strong className="text-emerald-400">{verifiedResult.passport.labAnalysis.proteinPercentage}%</strong>
                    </div>
                    <div className="text-slate-200">
                      الحموضة: <strong>{verifiedResult.passport.labAnalysis.acidityDornic}°D</strong> (درجة دورنيك مثالية)
                    </div>
                    <div className="text-emerald-400 font-bold">
                      ✓ {verifiedResult.passport.labAnalysis.antibioticResidue}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
