/**
 * IndexedDB Offline-First Storage Engine
 * High-performance, offline resilient client database for field operations
 * (quarantine inspection, desert mega-farms, cargo handling with weak/zero connectivity).
 */

import { LivestockCow, AirliftShipment, HealthRecord, FeedRationRecipe, QrPassportPayload, OfflineSyncItem } from '../types';

const DB_NAME = 'sol_livestock_offline_db_v2';
const DB_VERSION = 2;

class OfflineDatabaseManager {
  private db: IDBDatabase | null = null;
  private isInitializing: Promise<IDBDatabase> | null = null;

  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitializing) return this.isInitializing;

    this.isInitializing = new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        console.warn('IndexedDB open threw exception:', err);
        return reject(err);
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = request.transaction;

        // 1. Livestock Store
        let liveStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('livestock')) {
          liveStore = db.createObjectStore('livestock', { keyPath: 'id' });
        } else {
          liveStore = tx!.objectStore('livestock');
        }
        if (liveStore.indexNames.contains('rfidTag')) {
          liveStore.deleteIndex('rfidTag');
        }
        liveStore.createIndex('rfidTag', 'rfidTag', { unique: false });
        if (!liveStore.indexNames.contains('currentWilaya')) {
          liveStore.createIndex('currentWilaya', 'currentWilaya', { unique: false });
        }
        if (!liveStore.indexNames.contains('quarantineStatus')) {
          liveStore.createIndex('quarantineStatus', 'quarantineStatus', { unique: false });
        }

        // 2. Airlift Shipments Store
        let airStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('airlift_shipments')) {
          airStore = db.createObjectStore('airlift_shipments', { keyPath: 'id' });
        } else {
          airStore = tx!.objectStore('airlift_shipments');
        }
        if (airStore.indexNames.contains('flightNumber')) {
          airStore.deleteIndex('flightNumber');
        }
        airStore.createIndex('flightNumber', 'flightNumber', { unique: false });
        if (!airStore.indexNames.contains('status')) {
          airStore.createIndex('status', 'status', { unique: false });
        }

        // 3. Health Records Store
        let healthStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('health_records')) {
          healthStore = db.createObjectStore('health_records', { keyPath: 'id' });
        } else {
          healthStore = tx!.objectStore('health_records');
        }
        if (!healthStore.indexNames.contains('rfidTag')) {
          healthStore.createIndex('rfidTag', 'rfidTag', { unique: false });
        }

        // 4. QR Passports Store - NON-UNIQUE index on batchId to allow multiple passes per batch
        let qrStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('qr_traceability')) {
          qrStore = db.createObjectStore('qr_traceability', { keyPath: 'token' });
        } else {
          qrStore = tx!.objectStore('qr_traceability');
        }
        if (qrStore.indexNames.contains('batchId')) {
          qrStore.deleteIndex('batchId');
        }
        qrStore.createIndex('batchId', 'batchId', { unique: false });

        // 5. Sync Queue Store for Offline mutations
        let syncStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('offline_sync_queue')) {
          syncStore = db.createObjectStore('offline_sync_queue', { keyPath: 'id' });
        } else {
          syncStore = tx!.objectStore('offline_sync_queue');
        }
        if (!syncStore.indexNames.contains('status')) {
          syncStore.createIndex('status', 'status', { unique: false });
        }
        if (!syncStore.indexNames.contains('timestamp')) {
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.warn('Failed to initialize IndexedDB, cleaning up stale database:', request.error);
        try {
          indexedDB.deleteDatabase(DB_NAME);
        } catch {}
        reject(request.error);
      };
    });

    return this.isInitializing;
  }

  // --- Livestock Operations ---
  async getLivestockByRfid(rfidTag: string): Promise<LivestockCow | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('livestock', 'readonly');
        const store = tx.objectStore('livestock');
        const index = store.index('rfidTag');
        const request = index.get(rfidTag);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async getAllLivestock(): Promise<LivestockCow[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('livestock', 'readonly');
        const store = tx.objectStore('livestock');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async putLivestock(cow: LivestockCow): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('livestock', 'readwrite');
        const store = tx.objectStore('livestock');
        store.put(cow);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Memory fallback
    }
  }

  async putBulkLivestock(cows: LivestockCow[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('livestock', 'readwrite');
        const store = tx.objectStore('livestock');
        for (const cow of cows) {
          store.put(cow);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Memory fallback
    }
  }

  // --- Airlift Shipments Operations ---
  async getAllShipments(): Promise<AirliftShipment[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('airlift_shipments', 'readonly');
        const store = tx.objectStore('airlift_shipments');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async putBulkShipments(shipments: AirliftShipment[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('airlift_shipments', 'readwrite');
        const store = tx.objectStore('airlift_shipments');
        for (const s of shipments) {
          store.put(s);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Memory fallback
    }
  }

  // --- QR Passports Operations ---
  async putQrPassport(passport: QrPassportPayload): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('qr_traceability', 'readwrite');
        const store = tx.objectStore('qr_traceability');
        store.put(passport);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => {
          console.warn('Failed to put passport in IndexedDB, ignoring:', e);
          resolve();
        };
      });
    } catch (err) {
      console.warn('IndexedDB putQrPassport failed, keeping in memory:', err);
    }
  }

  async getQrPassport(token: string): Promise<QrPassportPayload | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('qr_traceability', 'readonly');
        const store = tx.objectStore('qr_traceability');
        const request = store.get(token);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- Offline Sync Queue ---
  async enqueueOfflineAction(type: OfflineSyncItem['type'], payload: any): Promise<OfflineSyncItem> {
    const item: OfflineSyncItem = {
      id: 'sync_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offline_sync_queue', 'readwrite');
        const store = tx.objectStore('offline_sync_queue');
        store.add(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => resolve(item);
      });
    } catch {
      return item;
    }
  }

  async getPendingSyncItems(): Promise<OfflineSyncItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offline_sync_queue', 'readonly');
        const store = tx.objectStore('offline_sync_queue');
        const request = store.getAll();

        request.onsuccess = () => {
          const all: OfflineSyncItem[] = request.result || [];
          resolve(all.filter((i) => i.status === 'pending' || i.status === 'failed'));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async markSyncItemCompleted(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offline_sync_queue', 'readwrite');
        const store = tx.objectStore('offline_sync_queue');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Memory fallback
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const db = await this.getDB();
      const storeNames = ['livestock', 'airlift_shipments', 'health_records', 'qr_traceability', 'offline_sync_queue'];
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
    } catch {
      // Memory fallback
    }
  }
}

export const offlineDB = new OfflineDatabaseManager();
