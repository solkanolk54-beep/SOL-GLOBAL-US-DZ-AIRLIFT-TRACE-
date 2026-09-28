import React from 'react';
import { Plane, Radio, Volume2, VolumeX, ShieldCheck, Activity, Globe } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface Props {
  language: 'ar' | 'en';
  onToggleLanguage: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isSimulatedOffline: boolean;
  onToggleSimulateOffline: () => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<Props> = ({
  language,
  onToggleLanguage,
  soundEnabled,
  onToggleSound,
  isSimulatedOffline,
  onToggleSimulateOffline,
  onOpenSyncModal,
}) => {
  return (
    <header className="border-b border-emerald-950 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top Telemetry Strip */}
      <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-4 py-1 text-[11px] font-mono text-emerald-400/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold tracking-wider">SECURE TAC-LINK: 109 CARGO AIRLIFTS</span>
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">
            HERD PROTOCOL: <strong className="text-emerald-300">HOLSTEIN FRIESIAN (30K–270K HEADS)</strong>
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">
            BIOSECURITY: <strong className="text-emerald-300">USDA-APHIS / DZ-VET CLEARED</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <OfflineIndicator
            isSimulatedOffline={isSimulatedOffline}
            onToggleSimulateOffline={onToggleSimulateOffline}
            onOpenSyncModal={onOpenSyncModal}
          />

          <PWAInstallButton />
        </div>
      </div>

      {/* Main Tactical Header */}
      <div className="px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500 flex items-center justify-center relative overflow-hidden shadow-lg shadow-emerald-950">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div className="absolute inset-0 bg-emerald-400/10 pointer-events-none"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-wider text-slate-100 font-mono">
                SOL GLOBAL <span className="text-emerald-400">•</span> US-DZ AIRLIFT TRACE
              </h1>
              <span className="hidden lg:inline px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                v2.6 TACTICAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              {language === 'ar'
                ? 'منظومة الجسر الجوي الاستراتيجي وتتبع الأبقار الحلوب الأمريكية (Texas/AZ/NM ➔ الجزائر)'
                : 'US-Algeria Trans-Atlantic Strategic Airlift & Holstein RFID Biosecurity Platform'}
            </p>
          </div>
        </div>

        {/* Tactical Controls & Quick Metrics */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Beep Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded border transition cursor-pointer text-xs font-mono flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'صوت ماسح RFID مفعل' : 'صوت ماسح RFID مكتوم'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'صوت RFID' : 'مكتوم'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono transition cursor-pointer"
            title="تبديل اللغة / Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
