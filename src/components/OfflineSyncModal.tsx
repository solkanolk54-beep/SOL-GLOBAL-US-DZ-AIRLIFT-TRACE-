import React, { useState, useEffect } from 'react';
import { OfflineSyncItem } from '../types';
import { apiService } from '../services/apiService';
import { Database, RefreshCw, X, CheckCircle2, ShieldCheck, Download, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<OfflineSyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadPending = async () => {
    const res = await apiService.getSyncQueueStatus();
    setItems(res.items);
  };

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const count = await apiService.flushOfflineSyncQueue();
      setSyncFeedback(`تمت مزامنة ${count} عملية بنجاح مع الخادم المركزي!`);
      await loadPending();
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl font-mono text-slate-100 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-slate-100 text-sm">
              إدارة التخزين المحلي والمزامنة الميدانية (IndexedDB)
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-400 text-xs font-sans mt-3">
          يتم حفظ كافة عمليات مسح شرائح الـ RFID، تسجيل كميات الحليب، والتقارير البيطرية محلياً في قاعدة بيانات المتصفح
          (IndexedDB) لضمان استمرارية العمل في صحراء أدرار وبسكرة دون اتصال بالإنترنت.
        </p>

        {syncFeedback && (
          <div className="mt-3 p-2.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{syncFeedback}</span>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>العمليات المعلقة في طابور المزامنة ({items.length}):</span>
            <span className="text-emerald-400 font-bold">
              {items.length === 0 ? 'جميع البيانات متزامنة' : `${items.length} غير متزامنة`}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800">
            {items.length === 0 ? (
              <div className="text-center py-6 text-slate-500 font-sans">
                لا توجد عمليات معلقة حالياً. النظام جاهز للعمل دون اتصال.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]"
                >
                  <span className="text-slate-300 font-bold">
                    {item.type === 'rfid_scan'
                      ? 'مسح RFID'
                      : item.type === 'milk_yield'
                      ? 'تسجيل حلب'
                      : item.type}
                  </span>
                  <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 text-[10px]">
                    معلّق
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing || items.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جارٍ رفع البيانات...' : 'مزامنة الطابور الآن (Flush Sync)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
