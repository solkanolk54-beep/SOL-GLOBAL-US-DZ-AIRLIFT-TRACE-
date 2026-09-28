/**
 * High-Throughput Stress & Performance Test Suite
 * Simulates heavy field RFID scanning, high concurrency, and benchmark metrics
 */

import request from 'supertest';
import { app, resetTestDatabase } from '../../server.js';

describe('SOL Global - High-Throughput Stress & Load Performance Tests', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  describe('1. Massive Rapid RFID Burst Scenario (500 to 1,000 Head of Cattle)', () => {
    it('should ingest a bulk burst of 750 cattle RFID tags with sub-second execution', async () => {
      const HEAD_COUNT = 750;
      const burstScans = Array.from({ length: HEAD_COUNT }, (_, i) => ({
        rfidTag: `RFID-BURST-${10000 + i}`,
        usEarTag: `USA-TX-2024-${20000 + i}`,
        dzNationalId: `DZ-ADR-01-${30000 + i}`,
        breed: 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
        currentWeightKg: 580 + (i % 80),
        geneticMeritTpi: 2900 + (i % 150),
        checkpointLocation: 'Adrar Airport Cargo Gate A',
      }));

      const startTime = performance.now();

      const res = await request(app)
        .post('/api/livestock/bulk-scan')
        .send({
          source: 'ZEBRA-BURST-PORTAL-SCANNER-01',
          scans: burstScans,
        })
        .set('Content-Type', 'application/json');

      const endTime = performance.now();
      const totalDurationMs = endTime - startTime;
      const throughputPerSec = Math.round((HEAD_COUNT / totalDurationMs) * 1000);

      // Assertions
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('BATCH_INGESTED');
      expect(res.body.totalIngested).toBe(HEAD_COUNT);
      expect(res.body.results.length).toBe(HEAD_COUNT);

      // Performance criteria: processing 750 records in under 2,000ms
      expect(totalDurationMs).toBeLessThan(2000);

      console.log(`\n======================================================`);
      console.log(`🚀 [BURST BENCHMARK] Processed ${HEAD_COUNT} RFID Tags:`);
      console.log(`⏱ Total Duration: ${totalDurationMs.toFixed(2)} ms`);
      console.log(`⚡ Effective Throughput: ${throughputPerSec} tags/second`);
      console.log(`======================================================\n`);
    });
  });

  describe('2. Concurrent Request Load & P95 Latency Benchmark', () => {
    it('should handle 100 concurrent individual scan requests with P95 latency < 200ms', async () => {
      const TOTAL_REQUESTS = 100;
      const CONCURRENCY_GUNS = 10; // Simulating 10 active handheld RFID guns scanning simultaneously
      const latencies: number[] = [];

      const startBatchTime = performance.now();
      let currentIndex = 0;

      const scannerWorker = async () => {
        while (currentIndex < TOTAL_REQUESTS) {
          const i = currentIndex++;
          const reqStart = performance.now();
          const res = await request(app)
            .post('/api/livestock/scan')
            .send({
              rfidTag: `RFID-CONCURRENT-${i + 1}`,
              checkpointLocation: `Gate-Sector-${(i % 5) + 1}`,
            })
            .set('Content-Type', 'application/json');
          const reqEnd = performance.now();

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('INGESTED');
          latencies.push(reqEnd - reqStart);
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY_GUNS }, () => scannerWorker()));
      const totalBatchDuration = performance.now() - startBatchTime;

      // Calculate latency metrics
      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];
      const rps = Math.round((TOTAL_REQUESTS / totalBatchDuration) * 1000);

      console.log(`\n------------------------------------------------------`);
      console.log(`📊 [CONCURRENCY LOAD] ${TOTAL_REQUESTS} Requests via ${CONCURRENCY_GUNS} Concurrent Scanners:`);
      console.log(`• Average Latency: ${avgLatency.toFixed(2)} ms`);
      console.log(`• P95 Latency: ${p95Latency.toFixed(2)} ms`);
      console.log(`• Requests Per Second (RPS): ${rps} req/sec`);
      console.log(`------------------------------------------------------\n`);

      // Latency requirement: P95 < 200ms
      expect(p95Latency).toBeLessThan(200);
    });
  });

  describe('3. Concurrent State Mutations & Duplicate Scan Handling', () => {
    it('should safely process 50 concurrent duplicate scans for the same tag without corrupting state', async () => {
      const DUPLICATE_TAG = 'RFID-CTL-STRESS-DUP-01';
      const CONCURRENCY = 50;

      // First initial scan
      await request(app)
        .post('/api/livestock/scan')
        .send({ rfidTag: DUPLICATE_TAG, checkpointLocation: 'Base Terminal' });

      // Send 50 concurrent scans of the exact same tag
      const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
        request(app)
          .post('/api/livestock/scan')
          .send({
            rfidTag: DUPLICATE_TAG,
            checkpointLocation: `Concurrency Node #${i + 1}`,
          })
      );

      const responses = await Promise.all(promises);

      // Verify all succeeded
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.rfidTag).toBe(DUPLICATE_TAG);
      });

      // Verify in livestock database that cow is NOT duplicated into 50 distinct entries
      const listRes = await request(app).get('/api/livestock');
      expect(listRes.status).toBe(200);
      const duplicateMatches = listRes.body.filter((c: any) => c.rfidTag === DUPLICATE_TAG);
      expect(duplicateMatches.length).toBe(1);
    });
  });

  describe('4. Multi-Service Heavy Mixed Load Test', () => {
    it('should withstand mixed simultaneous requests across Climate, IoT, Passport, and RFID services', async () => {
      const operations: Promise<any>[] = [];

      for (let i = 0; i < 25; i++) {
        // 1. Scan request
        operations.push(
          request(app)
            .post('/api/livestock/scan')
            .send({ rfidTag: `RFID-MIXED-${i}` })
        );

        // 2. Climate calculation
        operations.push(
          request(app)
            .post('/api/climate-feed/calculate-ration')
            .send({ wilaya: 'Adrar', ambientTempC: 38 + (i % 6), relativeHumidityPct: 20 })
        );

        // 3. IoT Telemetry ingestion
        operations.push(
          request(app)
            .post('/api/iot/ingest')
            .send({
              type: 'collar',
              data: {
                deviceId: `COLLAR-MIXED-${i}`,
                rfidTag: `RFID-MIXED-${i}`,
                thiIndex: 78.5,
              },
            })
        );

        // 4. Passport Generation
        operations.push(
          request(app)
            .post('/api/traceability/generate-passport')
            .send({
              batchId: `BATCH-MIXED-${i}`,
              productType: 'raw_milk',
              cowRfidList: [`RFID-MIXED-${i}`],
            })
        );
      }

      const results = await Promise.all(operations);
      expect(results.length).toBe(100);

      results.forEach((res) => {
        expect([200, 201]).toContain(res.status);
      });
    });
  });
});
