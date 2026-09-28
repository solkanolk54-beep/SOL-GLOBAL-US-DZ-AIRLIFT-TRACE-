import React from 'react';
import {
  LayoutDashboard,
  PlaneTakeoff,
  Tag,
  SunMedium,
  QrCode,
  DatabaseZap,
  Cpu,
} from 'lucide-react';

export type TabId = 'dashboard' | 'airlift' | 'rfid' | 'feed_climate' | 'qr_passport' | 'iot_telemetry' | 'db_api';

interface Props {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  language: 'ar' | 'en';
}

export const NavigationTabs: React.FC<Props> = ({ activeTab, onSelectTab, language }) => {
  const tabs: { id: TabId; labelAr: string; labelEn: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      labelAr: 'غرفة العمليات المركزية',
      labelEn: 'Operations Command',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'airlift',
      labelAr: 'الجسر الجوي والرحلات (109)',
      labelEn: 'Airlift & Cargo (109)',
      icon: <PlaneTakeoff className="w-4 h-4" />,
      badge: '109 Flights',
    },
    {
      id: 'rfid',
      labelAr: 'الترقيم الذكي والملف البيطري',
      labelEn: 'RFID Tagging & Health',
      icon: <Tag className="w-4 h-4" />,
      badge: 'ISO-11784',
    },
    {
      id: 'iot_telemetry',
      labelAr: 'عصابات الـ IoT ومجسات التربة TDR',
      labelEn: 'IoT Collars & Soil TDR',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'MQTT Stream',
    },
    {
      id: 'feed_climate',
      labelAr: 'حاسبة التأقلم والمناخ والعليقة',
      labelEn: 'Climate & Feed THI',
      icon: <SunMedium className="w-4 h-4" />,
    },
    {
      id: 'qr_passport',
      labelAr: 'جواز السفر الرقمي Farm-to-Fork',
      labelEn: 'Digital QR Passport',
      icon: <QrCode className="w-4 h-4" />,
      badge: 'HMAC-Signed',
    },
    {
      id: 'db_api',
      labelAr: 'مخطط PostgreSQL والـ API',
      labelEn: 'PostgreSQL Schema & API',
      icon: <DatabaseZap className="w-4 h-4" />,
      badge: 'PostGIS',
    },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6">
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-mono whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-950 border border-emerald-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-slate-950 text-emerald-400 border border-slate-900'
                      : 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
