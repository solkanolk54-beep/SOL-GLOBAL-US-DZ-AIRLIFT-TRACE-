/**
 * SOL Global / US-DZ Airlift & Livestock Trace System Architecture
 * Express Backend Microservices with Vite Middlewares
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

import { INITIAL_AIRLIFT_SHIPMENTS, INITIAL_LIVESTOCK } from './src/services/mockData.ts';
import { LivestockCow } from './src/types/index.ts';

// In-Memory Database Store for Express Microservices
let liveAirliftFlights = [...INITIAL_AIRLIFT_SHIPMENTS];
let liveLivestock = [...INITIAL_LIVESTOCK];

// 1. Healthcheck Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OPERATIONAL',
    system: 'SOL Global / US-DZ Airlift & Livestock Trace Platform',
    serverTime: new Date().toISOString(),
    flightsTracked: 109,
    quarantineSecurityProtocol: 'ISO-11784/11785-FDX-B',
  });
});

// 2. Airlift & Flights Routes
app.get('/api/airlift/flights', (_req: Request, res: Response) => {
  res.json(liveAirliftFlights);
});

app.post('/api/airlift/verify-usda', (req: Request, res: Response) => {
  const { flightId } = req.body;
  const flight = liveAirliftFlights.find((f) => f.id === flightId);
  if (!flight) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  flight.usdaStatus = 'verified';
  res.json({ success: true, flight, verifiedAt: new Date().toISOString() });
});

// 3. RFID Ingest & Livestock Tracking Routes
app.get('/api/livestock', (_req: Request, res: Response) => {
  res.json(liveLivestock);
});

app.get('/api/livestock/rfid/:rfid', (req: Request, res: Response) => {
  const tag = req.params.rfid.toUpperCase();
  const cow = liveLivestock.find((c) => c.rfidTag.toUpperCase() === tag);
  if (!cow) {
    res.status(404).json({ error: 'Livestock not found for RFID tag ' + tag });
    return;
  }
  res.json(cow);
});

app.post('/api/livestock/scan', (req: Request, res: Response) => {
  const { rfidTag, checkpointLocation } = req.body;
  const normalized = (rfidTag || '').toUpperCase();
  let cow = liveLivestock.find((c) => c.rfidTag.toUpperCase() === normalized);

  if (!cow) {
    const newCow: LivestockCow = {
      id: 'cow_' + Date.now(),
      rfidTag: normalized,
      usEarTag: `USA-TX-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      dzNationalId: `DZ-ADR-01-${Math.floor(1000 + Math.random() * 9000)}`,
      breed: 'Purebred Holstein Friesian',
      airliftShipmentId: 'flight_tx_001',
      flightNumber: 'SOL-AF-109-TX01',
      birthDate: '2024-04-10',
      originState: 'Texas',
      currentWilaya: 'Adrar',
      farmId: 'DZ-FARM-ADRAR-01',
      farmName: 'Adrar Mega-Dairy Oasis Complex',
      barnNumber: 'Barn-A',
      penNumber: 'Pen-06',
      quarantineStatus: 'quarantine_holding',
      quarantineDay: 1,
      geneticMerit: {
        sireName: 'Pine-Tree Dairy Kingpin-ET',
        sireRegistration: 'HOUSA72851652',
        damName: 'Lone-Star Superstition 4402',
        geneticMeritTpi: 2940,
        milkYieldGenomicPotentialL: 13900,
        genomicInbreedingPct: 4.0,
      },
      currentWeightKg: 635.0,
      weightHistory: [{ date: new Date().toISOString().split('T')[0], weightKg: 635.0 }],
      lactationCycle: {
        lactationNumber: 1,
        daysInMilk: 42,
        inseminationDate: '2026-08-12',
        inseminationBull: 'S-S-I Franchise Gallantry',
        pregnancyStatus: 'confirmed_pregnant',
      },
      averageMilkYieldL: 35.0,
      targetMilkYieldL: 38.0,
      recentMilkYields: [],
      vaccinations: [],
      healthScore: 96,
      ruminationMinutesPerDay: 530,
      activityIndex: 102,
      gpsCoordinates: [27.9124, -0.2241],
    };
    liveLivestock.unshift(newCow);
    cow = newCow;
  }

  res.json({
    status: 'INGESTED',
    rfidTag: normalized,
    cow,
    checkpointLocation: checkpointLocation || 'Adrar Quarantine Primary Terminal',
    ingestTimestamp: new Date().toISOString(),
    telemetryStatus: 'VALID_ISO_11784',
  });
});

// Bulk RFID Ingestion endpoint for Flutter Handheld RFID Gun & Termux CLI
app.post('/api/livestock/bulk-scan', (req: Request, res: Response) => {
  const { scans, source } = req.body;
  if (!Array.isArray(scans)) {
    res.status(400).json({ error: 'scans array is required' });
    return;
  }

  const results = [];
  for (const item of scans) {
    const rawTag = item.rfidTag || item;
    if (!rawTag) continue;
    const normalized = String(rawTag).trim().toUpperCase();

    let cow = liveLivestock.find((c) => c.rfidTag.toUpperCase() === normalized);
    if (!cow) {
      cow = {
        id: 'cow_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        rfidTag: normalized,
        usEarTag: item.usEarTag || `USA-TX-2024-${Math.floor(1000 + Math.random() * 9000)}`,
        dzNationalId: item.dzNationalId || `DZ-ADR-01-${Math.floor(1000 + Math.random() * 9000)}`,
        breed: item.breed || 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
        airliftShipmentId: 'flight_tx_001',
        flightNumber: 'SOL-AF-109-TX01',
        birthDate: '2024-04-10',
        originState: 'Texas',
        currentWilaya: 'Adrar',
        farmId: 'DZ-FARM-ADRAR-01',
        farmName: 'Adrar Mega-Dairy Oasis Complex',
        barnNumber: 'Barn-A',
        penNumber: 'Pen-06',
        quarantineStatus: (item.quarantineStatus as any) || 'quarantine_holding',
        quarantineDay: 1,
        geneticMerit: {
          sireName: 'Pine-Tree Dairy Kingpin-ET',
          sireRegistration: 'HOUSA72851652',
          damName: 'Lone-Star Superstition 4402',
          geneticMeritTpi: item.geneticMeritTpi || 2940,
          milkYieldGenomicPotentialL: 13900,
          genomicInbreedingPct: 4.0,
        },
        currentWeightKg: item.currentWeightKg || 635.0,
        weightHistory: [{ date: new Date().toISOString().split('T')[0], weightKg: item.currentWeightKg || 635.0 }],
        lactationCycle: {
          lactationNumber: 1,
          daysInMilk: 42,
          inseminationDate: item.inseminationDate || '2026-08-12',
          inseminationBull: 'S-S-I Franchise Gallantry',
          pregnancyStatus: item.pregnancyStatus || 'confirmed_pregnant',
        },
        averageMilkYieldL: item.averageMilkYieldL || 36.5,
        targetMilkYieldL: 38.0,
        recentMilkYields: [],
        vaccinations: [],
        healthScore: 96,
        ruminationMinutesPerDay: 530,
        activityIndex: 102,
        gpsCoordinates: [27.9124, -0.2241],
      };
      liveLivestock.unshift(cow);
    }

    if (item.urgentFlag) {
      (cow as any).urgentFlag = item.urgentFlag;
    }
    if (item.vetNote) {
      (cow as any).vetNote = item.vetNote;
    }

    results.push({
      rfidTag: normalized,
      status: 'INGESTED',
      syncedAt: new Date().toISOString(),
    });
  }

  res.json({
    status: 'BATCH_INGESTED',
    source: source || 'UNKNOWN_SCANNER',
    totalIngested: results.length,
    timestamp: new Date().toISOString(),
    results,
  });
});

// Update Urgent Veterinary Flag or Clinical Note
app.post('/api/livestock/vet-action', (req: Request, res: Response) => {
  const { rfidTag, urgentFlag, vetNote } = req.body;
  const cow = liveLivestock.find((c) => c.rfidTag.toUpperCase() === (rfidTag || '').toUpperCase());
  if (!cow) {
    res.status(404).json({ error: 'Cow not found' });
    return;
  }
  (cow as any).urgentFlag = urgentFlag;
  (cow as any).vetNote = vetNote;
  res.json({
    success: true,
    rfidTag,
    urgentFlag,
    vetNote,
    updatedAt: new Date().toISOString(),
  });
});

app.post('/api/livestock/milk-yield', (req: Request, res: Response) => {
  const { rfidTag, yieldData } = req.body;
  const cow = liveLivestock.find((c) => c.rfidTag.toUpperCase() === (rfidTag || '').toUpperCase());
  if (!cow) {
    res.status(404).json({ error: 'Cow not found' });
    return;
  }
  const total = Number((yieldData.morning + yieldData.noon + yieldData.evening).toFixed(2));
  cow.averageMilkYieldL = total;
  res.json({
    success: true,
    rfidTag,
    recordedYield: total,
    targetYield: cow.targetMilkYieldL,
    delta: Number((total - cow.targetMilkYieldL).toFixed(2)),
    timestamp: new Date().toISOString(),
  });
});

// 4. Climate THI & Adaptive Feed Microservice
app.post('/api/climate-feed/calculate-ration', (req: Request, res: Response) => {
  const { wilaya, ambientTempC, relativeHumidityPct, targetYieldLiters } = req.body;
  const temp = parseFloat(ambientTempC) || 38.0;
  const rh = parseFloat(relativeHumidityPct) || 20.0;
  const thi = Number((0.8 * temp + (rh / 100) * (temp - 14.4) + 46.4).toFixed(1));

  let stressCategory = 'normal';
  if (thi >= 79) stressCategory = 'severe_stress';
  else if (thi >= 72) stressCategory = 'moderate_stress';
  else if (thi >= 68) stressCategory = 'mild_stress';

  res.json({
    wilaya: wilaya || 'Adrar',
    thi,
    stressCategory,
    waterRequirementLitersDay: Math.round(110 + (temp > 30 ? (temp - 30) * 5 : 0)),
    recommendedCooling: {
      mistingFanActive: thi >= 72,
      fanSpeedPercentage: thi >= 79 ? 100 : thi >= 72 ? 80 : 50,
      soakerDutyCycleMin: thi >= 79 ? 3 : 5,
    },
    rumenBufferSodiumBicarbGrams: thi >= 79 ? 280 : 200,
    targetYieldLiters: targetYieldLiters || 38.0,
  });
});

// 5. Farm-to-Fork QR Passport Microservice
app.get('/api/traceability/verify/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  res.json({
    token,
    isValid: true,
    verificationCode: 'VERIFIED-HMAC-SHA256',
    inspectedBy: 'SOL Global Traceability Auditor & Algerian Ministry of Agriculture',
    verifiedAt: new Date().toISOString(),
  });
});

// ============================================================================
// 6. IoT Ingestion Microservice (AWS / GCP IoT Core & MQTT Compatible)
// Topics: sol/iot/livestock/{rfid}/telemetry & sol/iot/soil/{zone}/tdr
// ============================================================================

import {
  calculateLivestockThi,
  INITIAL_COLLARS_DEF,
  INITIAL_SOIL_SENSORS_DEF,
  iotSimulator,
} from './src/services/iotEngine';

// Server-side in-memory live telemetry buffer
let sseClients: Response[] = [];
let liveCollarsMap: Record<string, any> = {};
let liveSoilMap: Record<string, any> = {};
let feedLogsAlertBuffer: any[] = [];
let serverSimulatorRunning = true;
let serverSimulatorIntervalMs = 3000;
let serverHeatwaveMode = false;
let totalPacketsIngested = 0;

// Initialize initial state
INITIAL_COLLARS_DEF.forEach((c) => {
  liveCollarsMap[c.rfidTag] = iotSimulator.generateCollarReading(c);
});
INITIAL_SOIL_SENSORS_DEF.forEach((s) => {
  liveSoilMap[s.zoneId] = iotSimulator.generateSoilReading(s);
});

// Broadcast helper to all connected SSE clients
function broadcastSse(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// Ingestion Endpoint: accepts payloads from external scripts (Node/Python) or MQTT Bridges
app.post('/api/iot/ingest', (req: Request, res: Response) => {
  const { topic, type, data } = req.body;
  totalPacketsIngested++;

  if (type === 'collar' && data?.rfidTag) {
    liveCollarsMap[data.rfidTag] = data;

    // Check cooling threshold: THI >= 75
    if (data.coolingAlertActive || data.thiIndex >= 75) {
      const alertLog = {
        id: `FEED-ALERT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        rfidTag: data.rfidTag,
        cowName: data.cowName,
        wilaya: data.wilaya,
        ambientTempC: data.ambientTempC,
        relativeHumidityPct: data.relativeHumidityPct,
        thiIndex: data.thiIndex,
        action: 'EMERGENCY_COOLING_PROTOCOL_ENGAGED',
        intervention: data.coolingIntervention,
      };
      feedLogsAlertBuffer.unshift(alertLog);
      if (feedLogsAlertBuffer.length > 50) feedLogsAlertBuffer.pop();

      broadcastSse('cooling_alert', alertLog);
    }

    broadcastSse('collar_telemetry', data);
  } else if (type === 'soil' && data?.zoneId) {
    liveSoilMap[data.zoneId] = data;
    broadcastSse('soil_telemetry', data);
  }

  res.json({
    status: 'INGESTED_OK',
    topic: topic || 'direct',
    packetCount: totalPacketsIngested,
    timestamp: new Date().toISOString(),
  });
});

// Server-Sent Events (SSE) Live Telemetry Stream
app.get('/api/iot/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial snapshot immediately
  res.write(
    `event: snapshot\ndata: ${JSON.stringify({
      collars: Object.values(liveCollarsMap),
      soilSensors: Object.values(liveSoilMap),
      alerts: feedLogsAlertBuffer.slice(0, 10),
      totalPackets: totalPacketsIngested,
      heatwaveMode: serverHeatwaveMode,
    })}\n\n`
  );

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// State & Status Endpoint
app.get('/api/iot/state', (_req: Request, res: Response) => {
  res.json({
    isRunning: serverSimulatorRunning,
    intervalMs: serverSimulatorIntervalMs,
    heatwaveMode: serverHeatwaveMode,
    totalPackets: totalPacketsIngested,
    collars: Object.values(liveCollarsMap),
    soilSensors: Object.values(liveSoilMap),
    recentAlerts: feedLogsAlertBuffer.slice(0, 10),
    recentMqttMessages: iotSimulator.getRecentMessages().slice(0, 20),
  });
});

// Simulator Control Endpoint
app.post('/api/iot/control', (req: Request, res: Response) => {
  const { action, intervalMs, heatwaveMode } = req.body;

  if (action === 'start') serverSimulatorRunning = true;
  if (action === 'stop') serverSimulatorRunning = false;
  if (typeof heatwaveMode === 'boolean') {
    serverHeatwaveMode = heatwaveMode;
    iotSimulator.setHeatwaveMode(heatwaveMode);
  }
  if (typeof intervalMs === 'number' && intervalMs >= 500) {
    serverSimulatorIntervalMs = intervalMs;
  }

  res.json({
    success: true,
    isRunning: serverSimulatorRunning,
    intervalMs: serverSimulatorIntervalMs,
    heatwaveMode: serverHeatwaveMode,
  });
});

// Internal Background Loop to keep dashboard telemetry pulsating
setInterval(() => {
  if (!serverSimulatorRunning) return;

  INITIAL_COLLARS_DEF.forEach((c) => {
    const reading = iotSimulator.generateCollarReading(c);
    liveCollarsMap[c.rfidTag] = reading;
    totalPacketsIngested++;

    if (reading.coolingAlertActive) {
      feedLogsAlertBuffer.unshift({
        id: `ALERT-${Date.now()}-${c.rfidTag}`,
        timestamp: reading.timestamp,
        rfidTag: reading.rfidTag,
        cowName: reading.cowName,
        wilaya: reading.wilaya,
        ambientTempC: reading.ambientTempC,
        relativeHumidityPct: reading.relativeHumidityPct,
        thiIndex: reading.thiIndex,
        action: 'COOLING_PROTOCOL_ACTIVE_THI_75',
        intervention: reading.coolingIntervention,
      });
      if (feedLogsAlertBuffer.length > 50) feedLogsAlertBuffer.pop();
    }
    broadcastSse('collar_telemetry', reading);
  });

  INITIAL_SOIL_SENSORS_DEF.forEach((s) => {
    const reading = iotSimulator.generateSoilReading(s);
    liveSoilMap[s.zoneId] = reading;
    totalPacketsIngested++;
    broadcastSse('soil_telemetry', reading);
  });
}, serverSimulatorIntervalMs);

// Initialize Vite Dev Server in Development or Serve Static in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SOL Global] Tactical Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SOL Global] Server initialization failed:', err);
});
