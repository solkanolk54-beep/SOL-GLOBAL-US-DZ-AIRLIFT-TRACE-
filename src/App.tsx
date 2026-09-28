/**
 * SOL Global / US-DZ Airlift & Livestock Trace System Architecture
 * Main Application Shell & Tactical Command Engine
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NavigationTabs, TabId } from './components/NavigationTabs';
import { DashboardOverview } from './components/DashboardOverview';
import { AirliftTracker } from './components/AirliftTracker';
import { RfidQuarantineModule } from './components/RfidQuarantineModule';
import { MicroclimateFeedCalculator } from './components/MicroclimateFeedCalculator';
import { FarmToForkPassport } from './components/FarmToForkPassport';
import { DatabaseSchemaViewer } from './components/DatabaseSchemaViewer';
import { IoTTelemetryPanel } from './components/IoTTelemetryPanel';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { apiService } from './services/apiService';
import { AirliftShipment, LivestockCow, ClimateTelemetry } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Core Data State
  const [shipments, setShipments] = useState<AirliftShipment[]>([]);
  const [livestock, setLivestock] = useState<LivestockCow[]>([]);
  const [climates, setClimates] = useState<ClimateTelemetry[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<AirliftShipment | null>(null);
  const [selectedCow, setSelectedCow] = useState<LivestockCow | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load initial datasets
  useEffect(() => {
    async function loadData() {
      try {
        await apiService.init();
        const [flights, cows] = await Promise.all([
          apiService.getAirliftShipments(),
          apiService.getLivestockList(),
        ]);
        setShipments(flights);
        setLivestock(cows);
        setClimates(apiService.getWilayasClimate());
        if (flights.length > 0) setSelectedFlight(flights[0]);
        if (cows.length > 0) setSelectedCow(cows[0]);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Handlers
  const handleVerifyUsda = async (flightId: string) => {
    const updated = await apiService.verifyUsdaHealthCert(flightId);
    setShipments((prev) => prev.map((f) => (f.id === flightId ? updated : f)));
    if (selectedFlight?.id === flightId) {
      setSelectedFlight(updated);
    }
  };

  const handleScanTag = async (tag: string) => {
    const res = await apiService.scanRfidIngest(tag);
    // Refresh livestock list
    const updatedList = await apiService.getLivestockList();
    setLivestock(updatedList);
    setSelectedCow(res.cow);
  };

  const handleRecordYield = async (
    rfid: string,
    yieldData: { morning: number; noon: number; evening: number; fatPct?: number; proteinPct?: number }
  ) => {
    const updatedCow = await apiService.recordMilkYield(rfid, yieldData);
    setLivestock((prev) => prev.map((c) => (c.rfidTag === rfid ? updatedCow : c)));
    setSelectedCow(updatedCow);
  };

  const handleSelectFlightFromRadar = (flight: AirliftShipment) => {
    setSelectedFlight(flight);
    setActiveTab('airlift');
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black"
    >
      {/* Tactical HUD Header */}
      <Header
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'ar' ? 'en' : 'ar'))}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulateOffline={() => setIsSimulatedOffline((prev) => !prev)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Navigation Sub-Menu */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        language={language}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3 font-mono text-xs text-emerald-400">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span>جارٍ تحميل نظام التتبع والاستشعار التكتيكي (109 رحلات / PostGIS / IndexedDB)...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                shipments={shipments}
                livestock={livestock}
                climates={climates}
                onNavigate={setActiveTab}
                onSelectFlight={handleSelectFlightFromRadar}
              />
            )}

            {activeTab === 'airlift' && (
              <AirliftTracker
                shipments={shipments}
                onVerifyUsda={handleVerifyUsda}
                onSelectFlight={setSelectedFlight}
                selectedFlightId={selectedFlight?.id}
              />
            )}

            {activeTab === 'rfid' && (
              <RfidQuarantineModule
                livestock={livestock}
                selectedCow={selectedCow}
                onSelectCow={setSelectedCow}
                onScanTag={handleScanTag}
                onRecordYield={handleRecordYield}
                soundEnabled={soundEnabled}
              />
            )}

            {activeTab === 'iot_telemetry' && (
              <IoTTelemetryPanel soundEnabled={soundEnabled} />
            )}

            {activeTab === 'feed_climate' && (
              <MicroclimateFeedCalculator climates={climates} />
            )}

            {activeTab === 'qr_passport' && <FarmToForkPassport />}

            {activeTab === 'db_api' && <DatabaseSchemaViewer />}
          </>
        )}
      </main>

      {/* Offline Sync Queue Manager Modal */}
      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Tactical Status Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-3 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>SOL GLOBAL AGRITECH ARCHITECTURE • ALGERIA STRATEGIC LIVESTOCK PROJECT</span>
        </div>
        <div>
          ISO 11784/11785 RFID • POSTGRESQL 16 + POSTGIS • INDEXEDDB OFFLINE FIRST • HMAC-SHA256
        </div>
      </footer>
    </div>
  );
}
