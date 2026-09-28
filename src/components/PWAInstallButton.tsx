import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, ShieldCheck } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-400 text-xs font-mono">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>PWA INSTALLED</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-3 py-1.5 text-xs font-bold font-mono tracking-wide uppercase shadow-lg shadow-emerald-900/30 transition-all border border-emerald-400 cursor-pointer"
        title="تثبيت التطبيق على جهازك الميداني"
      >
        <Download className="w-3.5 h-3.5" />
        <span>تثبيت PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-slate-900 px-2.5 py-1 text-xs font-mono text-emerald-400 hover:bg-emerald-950 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>تثبيت على iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-emerald-500/40 p-6 shadow-2xl text-slate-100 font-sans">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-400 font-mono">تثبيت التطبيق على iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                1. اضغط على زر <strong>مشاركة (Share)</strong> في شريط Safari.<br />
                2. مرّر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.<br />
                3. سيعمل التطبيق كاملاً حتى في البيئات الصحراوية المعزولة دون إنترنت.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded bg-emerald-600 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-500 transition"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
