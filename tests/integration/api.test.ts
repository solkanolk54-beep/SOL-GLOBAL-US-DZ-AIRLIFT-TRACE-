/**
 * Automated API Integration Tests (via Supertest)
 * Tests all core REST endpoints for SOL Global Livestock & Airlift Tracking System
 */

import request from 'supertest';
import { app, resetTestDatabase } from '../../server.js';

describe('SOL Global - API Integration Test Suite', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  describe('1. Health & System Status Endpoints', () => {
    it('GET /api/health - should return 200 OPERATIONAL with system metadata', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OPERATIONAL');
      expect(res.body).toHaveProperty('system');
      expect(res.body.system).toContain('SOL Global');
      expect(res.body).toHaveProperty('quarantineSecurityProtocol', 'ISO-11784/11785-FDX-B');
      expect(res.body).toHaveProperty('serverTime');
    });
  });

  describe('2. Livestock RFID Scanning & Ingestion Endpoints', () => {
    it('POST /api/livestock/scan - should successfully ingest single RFID tag with 200 OK', async () => {
      const scanPayload = {
        rfidTag: 'RFID-CTL-9021',
        checkpointLocation: 'Adrar Quarantine Terminal Gate 1',
      };

      const res = await request(app)
        .post('/api/livestock/scan')
        .send(scanPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'INGESTED');
      expect(res.body).toHaveProperty('rfidTag', 'RFID-CTL-9021');
      expect(res.body).toHaveProperty('checkpointLocation', scanPayload.checkpointLocation);
      expect(res.body).toHaveProperty('telemetryStatus', 'VALID_ISO_11784');
      expect(res.body).toHaveProperty('cow');
      expect(res.body.cow.rfidTag).toBe('RFID-CTL-9021');
      expect(res.body.cow).toHaveProperty('breed');
      expect(res.body.cow).toHaveProperty('geneticMerit');
      expect(res.body.cow.geneticMerit.geneticMeritTpi).toBeGreaterThanOrEqual(2800);
    });

    it('POST /api/livestock/scan - should return 400 Bad Request if rfidTag is missing or empty', async () => {
      const invalidPayloads = [{}, { rfidTag: '' }, { rfidTag: '   ' }, { rfidTag: null }];

      for (const payload of invalidPayloads) {
        const res = await request(app)
          .post('/api/livestock/scan')
          .send(payload as any)
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toMatch(/rfidTag is required/i);
      }
    });

    it('POST /api/livestock/bulk-scan - should process batch RFID scans successfully with 200 OK', async () => {
      const bulkPayload = {
        source: 'ZEBRA-RFID-GUN-FIELD-01',
        scans: [
          { rfidTag: 'RFID-CTL-9021', currentWeightKg: 640 },
          { rfidTag: 'RFID-CTL-9022', currentWeightKg: 615, urgentFlag: 'HEAT_STRESS_SEVERE' },
          { rfidTag: 'RFID-CTL-9023', currentWeightKg: 628, vetNote: 'Post-arrival prophylactic check completed' },
        ],
      };

      const res = await request(app)
        .post('/api/livestock/bulk-scan')
        .send(bulkPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'BATCH_INGESTED');
      expect(res.body).toHaveProperty('source', 'ZEBRA-RFID-GUN-FIELD-01');
      expect(res.body).toHaveProperty('totalIngested', 3);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(3);
      expect(res.body.results[0]).toHaveProperty('status', 'INGESTED');
    });

    it('POST /api/livestock/bulk-scan - should return 400 Bad Request if scans array is invalid', async () => {
      const res = await request(app)
        .post('/api/livestock/bulk-scan')
        .send({ source: 'CLI', scans: 'not-an-array' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('3. Climate THI & Adaptive Feed Microservice', () => {
    it('POST /api/climate-feed/calculate-ration - should calculate thermal stress and cooling protocol (Adrar Hot Zone)', async () => {
      const climatePayload = {
        wilaya: 'Adrar',
        ambientTempC: 42.0,
        relativeHumidityPct: 18.0,
        targetYieldLiters: 38.0,
      };

      const res = await request(app)
        .post('/api/climate-feed/calculate-ration')
        .send(climatePayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('wilaya', 'Adrar');
      expect(res.body).toHaveProperty('thi');
      expect(typeof res.body.thi).toBe('number');
      // At 42C and 18% RH: THI is > 79 (severe stress)
      expect(res.body.thi).toBeGreaterThanOrEqual(79);
      expect(res.body.stressCategory).toBe('severe_stress');
      expect(res.body).toHaveProperty('recommendedCooling');
      expect(res.body.recommendedCooling.mistingFanActive).toBe(true);
      expect(res.body.recommendedCooling.fanSpeedPercentage).toBe(100);
      expect(res.body.rumenBufferSodiumBicarbGrams).toBe(280);
      expect(res.body.waterRequirementLitersDay).toBeGreaterThanOrEqual(150);
    });

    it('POST /api/climate-feed/calculate-ration - should return 400 for out-of-range temperatures', async () => {
      const invalidPayload = {
        wilaya: 'Adrar',
        ambientTempC: 'invalid-temp-string',
      };

      const res = await request(app)
        .post('/api/climate-feed/calculate-ration')
        .send(invalidPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('4. IoT Ingestion Microservice (AWS / GCP IoT Core Compatible)', () => {
    it('POST /api/iot/ingest - should ingest Smart Livestock Collar telemetry and trigger cooling alert if THI >= 75', async () => {
      const collarPayload = {
        topic: 'sol/iot/livestock/RFID-CTL-9021/telemetry',
        type: 'collar',
        data: {
          deviceId: 'COLLAR-9021',
          rfidTag: 'RFID-CTL-9021',
          cowName: 'Texas Queen #21',
          wilaya: 'Adrar',
          ambientTempC: 39.5,
          relativeHumidityPct: 22.0,
          thiIndex: 82.4,
          coolingAlertActive: true,
          coolingIntervention: {
            tunnelFanSpeedPct: 100,
            sprinklerIntervalMinutes: 3,
            mistingActive: true,
            rumenBufferSupplementGrams: 280,
          },
        },
      };

      const res = await request(app)
        .post('/api/iot/ingest')
        .send(collarPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'INGESTED_OK');
      expect(res.body).toHaveProperty('packetCount');
      expect(res.body.packetCount).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/iot/ingest - should ingest Soil TDR Sensor readings', async () => {
      const soilPayload = {
        topic: 'sol/iot/soil/adrar_pivot_alfalfa/tdr',
        type: 'soil',
        data: {
          sensorId: 'TDR-ADR-01',
          zoneId: 'adrar_pivot_alfalfa',
          zoneName: 'Adrar Pivot A-1 (برسيم حجازي)',
          cropType: 'Alfalfa (برسيم حجازي)',
          volumetricWaterContentPct: 21.5,
          electricalConductivityDsM: 1.85,
          rootZoneTempC: 24.2,
          irrigationStatus: 'OPTIMAL',
        },
      };

      const res = await request(app)
        .post('/api/iot/ingest')
        .send(soilPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'INGESTED_OK');
    });

    it('POST /api/iot/ingest - should return 400 Bad Request on invalid payload format', async () => {
      const res = await request(app)
        .post('/api/iot/ingest')
        .send({ invalid: 'data' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('5. Farm-to-Fork Cryptographic Passport Microservice', () => {
    it('POST /api/traceability/generate-passport - should create cryptographic passport with 201 Created', async () => {
      const passportPayload = {
        batchId: 'BATCH-2026-DZ-TX-09',
        productType: 'fresh_pasteurized_milk',
        cowRfidList: ['RFID-CTL-9021', 'RFID-CTL-9022'],
        farmId: 'DZ-FARM-ADRAR-01',
        farmName: 'Adrar Oasis Mega Dairy',
        farmWilaya: 'Adrar',
        volumeLiters: 4800,
        destinationPlant: 'Giplait Rouiba Processing Complex',
      };

      const res = await request(app)
        .post('/api/traceability/generate-passport')
        .send(passportPayload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'PASSPORT_GENERATED');
      expect(res.body).toHaveProperty('passport');
      expect(res.body.passport).toHaveProperty('token');
      expect(res.body.passport.token).toContain('PASSPORT-BATCH-2026-DZ-TX-09');
      expect(res.body.passport).toHaveProperty('verificationHash');
      expect(res.body.passport.verificationHash).toContain('HMAC-SHA256:');
      expect(res.body.passport.isValid).toBe(true);
    });

    it('POST /api/traceability/generate-passport - should return 400 Bad Request for missing required fields', async () => {
      const res = await request(app)
        .post('/api/traceability/generate-passport')
        .send({ batchId: 'INCOMPLETE' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/traceability/verify/:token - should verify cryptographic passport token', async () => {
      const token = 'PASSPORT-BATCH-TEST-TOKEN';
      const res = await request(app).get(`/api/traceability/verify/${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', token);
      expect(res.body).toHaveProperty('isValid', true);
      expect(res.body).toHaveProperty('verificationCode', 'VERIFIED-HMAC-SHA256');
    });
  });
});
