import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { apiService } from '../services/apiService';

interface Props {
  isSimulatedOffline: boolean;
  onToggleSimulateOffline: () => void;
  onOpenSyncModal: () => void;
}

export const OfflineIndicator: React.FC<Props> = ({
  isSimulatedOffline,
  onToggleSimulateOffline,
  onOpenSyncModal,
}) => {
  const [isSystemOnline, setIsSystemOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsSystemOnline(true);
    const handleOffline = () => setIsSystemOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkQueue = async () => {
      const status = await apiService.getSyncQueueStatus();
      setPendingCount(status.pendingCount);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const isActuallyOnline = isSystemOnline && !isSimulatedOffline;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {/* Real-time Connectivity Badge */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
          isActuallyOnline
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
            : 'bg-amber-950/80 border-amber-500/60 text-amber-400 animate-pulse'
        }`}
      >
        {isActuallyOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">متصل بالمخدم (ONLINE)</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">وضع غير متصل (INDEXEDDB OFFLINE)</span>
          </>
        )}
      </div>

      {/* Pending Sync Items Counter */}
      {pendingCount > 0 && (
        <button
          onClick={onOpenSyncModal}
          className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition cursor-pointer"
          title="معاملات معلقة تنتظر المزامنة"
        >
          <Database className="w-3 h-3" />
          <span>{pendingCount} مزامنة معلقة</span>
        </button>
      )}

      {/* Force Offline Simulation Toggle (For Field Testing) */}
      <button
        onClick={onToggleSimulateOffline}
        className={`hidden md:flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-colors cursor-pointer ${
          isSimulatedOffline
            ? 'bg-red-950/80 border-red-500 text-red-300'
            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
        title="محاكاة انقطاع شبكة الهاتف/الإنترنت في عمق صحراء أدرار"
      >
        <RefreshCw className={`w-3 h-3 ${isSimulatedOffline ? 'animate-spin' : ''}`} />
        <span>{isSimulatedOffline ? 'إلغاء وضع الصحراء' : 'اختبار وضع الصحراء المعزول'}</span>
      </button>
    </div>
  );
};
