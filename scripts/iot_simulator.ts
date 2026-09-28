/**
 * ============================================================================
 * SOL Global / US-DZ Airlift & Livestock Trace System Architecture
 * IoT Core Simulator - Node.js / TypeScript Daemon
 * Protocol: MQTT (AWS IoT Core / GCP IoT Core / Mosquitto Compatible)
 * ============================================================================
 * 
 * Execution:
 *   npx tsx scripts/iot_simulator.ts
 * Options:
 *   --broker=<url>       MQTT broker URL (e.g. mqtt://broker.emqx.io:1883)
 *   --interval=<ms>      Broadcast interval in milliseconds (default: 3000)
 *   --heatwave           Enable severe desert heatwave stress test (THI >= 79)
 *   --no-mqtt            Skip external MQTT broker and stream via HTTP ingestion only
 */

import mqtt from 'mqtt';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ignore EPIPE when piping through head or other tools
process.stdout.on('error', (err: any) => {
  if (err.code === 'EPIPE') process.exit(0);
});

interface SimulatorOptions {
  brokerUrl: string;
  intervalMs: number;
  heatwaveMode: boolean;
  useMqtt: boolean;
  ingestApiUrl: string;
}

// Load config file
const configPath = path.resolve(__dirname, 'iot_config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn('[Config] Failed to parse iot_config.json, using defaults.');
  }
}

// Parse CLI flags
const args = process.argv.slice(2);
const options: SimulatorOptions = {
  brokerUrl: args.find(a => a.startsWith('--broker='))?.split('=')[1] || config.mqtt?.brokerUrl || 'mqtt://broker.emqx.io:1883',
  intervalMs: parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '') || config.simulation?.intervalMs || 3000,
  heatwaveMode: args.includes('--heatwave') || config.simulation?.heatwaveMode || false,
  useMqtt: !args.includes('--no-mqtt'),
  ingestApiUrl: config.ingestionApiUrl || 'http://localhost:3000/api/iot/ingest',
};

/**
 * Official Livestock THI calculation formula:
 * THI = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
 */
export function calculateTHI(ambientTempC: number, relativeHumidityPct: number): number {
  const T = ambientTempC;
  const RH = relativeHumidityPct;
  const thi = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26));
  return Number(thi.toFixed(2));
}

// Device definitions
const COLLARS = [
  { rfid: 'RFID-CTL-9021', name: 'Texas Queen #21', wilaya: 'Adrar', baseTemp: 39.2, baseAmbient: 38.5, baseHumidity: 18, baseHr: 72 },
  { rfid: 'RFID-CTL-9022', name: 'Lone Star Beladi #22', wilaya: 'Adrar', baseTemp: 38.9, baseAmbient: 39.0, baseHumidity: 16, baseHr: 68 },
  { rfid: 'RFID-CTL-9023', name: 'Rio Grande Atlas #23', wilaya: 'Biskra', baseTemp: 38.7, baseAmbient: 34.0, baseHumidity: 28, baseHr: 70 },
  { rfid: 'RFID-CTL-9024', name: 'Pecos Pride #24', wilaya: 'Mila', baseTemp: 38.5, baseAmbient: 26.5, baseHumidity: 45, baseHr: 64 },
];

const SOIL_ZONES = [
  { zone: 'adrar_pivot_alfalfa', nameAr: 'حقل البرسيم الحجازي - أدرار', crop: 'Alfalfa (برسيم حجازي)', wilaya: 'Adrar', baseVwc: 22.5, baseEc: 1.85, baseTemp: 24.2, depthCm: 30 },
  { zone: 'biskra_silage_corn', nameAr: 'حوض سيلاج الذرة - بسكرة', crop: 'Corn Silage (سيلاج ذرة)', wilaya: 'Biskra', baseVwc: 28.4, baseEc: 1.42, baseTemp: 22.8, depthCm: 45 },
  { zone: 'mila_pasture_alpha', nameAr: 'مراعي الهضاب العليا - ميلة', crop: 'High Plains Pasture', wilaya: 'Mila', baseVwc: 34.2, baseEc: 0.95, baseTemp: 19.5, depthCm: 20 },
];

console.log('================================================================');
console.log('🌾 SOL GLOBAL • US-DZ LIVESTOCK & SOIL IoT SIMULATOR');
console.log('================================================================');
console.log(`[Config] Interval: ${options.intervalMs}ms | Heatwave Mode: ${options.heatwaveMode ? 'ON 🔥' : 'OFF ❄'}`);
console.log(`[Config] Broker URL: ${options.brokerUrl}`);
console.log(`[Config] Ingestion Target: ${options.ingestApiUrl}`);
console.log('----------------------------------------------------------------');

// Initialize MQTT Client
let mqttClient: mqtt.MqttClient | null = null;
if (options.useMqtt) {
  try {
    const clientId = `sol-sim-${Math.floor(Math.random() * 10000)}`;
    mqttClient = mqtt.connect(options.brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 5000,
    });

    mqttClient.on('connect', () => {
      console.log(`[MQTT] Connected to broker: ${options.brokerUrl} (Client ID: ${clientId})`);
    });

    mqttClient.on('error', (err) => {
      console.warn(`[MQTT] Broker communication notice: ${err.message} (Will continue local ingestion)`);
    });
  } catch (e: any) {
    console.warn(`[MQTT] Initialization skipped: ${e.message}`);
  }
}

// HTTP Ingestion helper
function forwardToIngestionApi(payload: any) {
  try {
    const data = JSON.stringify(payload);
    const url = new URL(options.ingestApiUrl);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 2000,
      },
      (res) => {
        // response consumed silently
        res.resume();
      }
    );
    req.on('error', () => {
      // Local server might not be running if standalone script is launched
    });
    req.write(data);
    req.end();
  } catch {
    // Non-blocking
  }
}

let tickCount = 0;

function runSimulationTick() {
  tickCount++;
  console.log(`\n--- [IoT Tick #${tickCount}] ${new Date().toISOString()} ---`);

  // 1. Generate Livestock Collars Telemetry
  for (const c of COLLARS) {
    const heatwaveBoost = options.heatwaveMode ? 7.0 : 0;
    const ambientT = Number((c.baseAmbient + (Math.random() - 0.48) * 1.5 + heatwaveBoost).toFixed(1));
    const humidity = Number(Math.max(10, Math.min(85, c.baseHumidity + (Math.random() - 0.5) * 2)).toFixed(1));

    // Calculate THI
    const thi = calculateTHI(ambientT, humidity);
    const isCoolingAlert = thi >= 75.0;

    const bodyTemp = Number((c.baseTemp + (isCoolingAlert ? 0.6 + (thi - 75) * 0.1 : (Math.random() - 0.5) * 0.2)).toFixed(2));
    const heartRate = Math.round(c.baseHr + (isCoolingAlert ? 18 + (thi - 75) * 2 : (Math.random() - 0.5) * 4));

    let activityState = 'rumination';
    if (isCoolingAlert) {
      activityState = 'heat_stressed_lethargic';
    } else {
      const r = Math.random();
      activityState = r < 0.4 ? 'grazing' : r < 0.75 ? 'rumination' : 'resting';
    }

    const collarPayload = {
      deviceId: `COLLAR-${c.rfid.replace('RFID-CTL-', '')}`,
      rfidTag: c.rfid,
      cowName: c.name,
      wilaya: c.wilaya,
      timestamp: new Date().toISOString(),
      bodyTempC: bodyTemp,
      ambientTempC: ambientT,
      relativeHumidityPct: humidity,
      thiIndex: thi,
      activityState,
      heartRateBpm: heartRate,
      coolingAlertActive: isCoolingAlert,
      coolingIntervention: {
        tunnelFanSpeedPct: isCoolingAlert ? 100 : thi >= 70 ? 75 : 45,
        sprinklerIntervalMinutes: isCoolingAlert ? 3 : 15,
        mistingActive: isCoolingAlert,
        rumenBufferSupplementGrams: isCoolingAlert ? 280 : 180,
      },
    };

    const topic = `sol/iot/livestock/${c.rfid}/telemetry`;

    // Publish to MQTT
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(topic, JSON.stringify(collarPayload), { qos: 1 });
    }

    // Forward to app HTTP Ingestion API
    forwardToIngestionApi({ topic, type: 'collar', data: collarPayload });

    // Console readout
    const alertTag = isCoolingAlert ? '🚨 [COOLING ALERT THI>=75]' : '✅ [COMFORT]';
    console.log(
      `🐄 [${c.rfid}] Ambient: ${ambientT}°C | RH: ${humidity}% | Body: ${bodyTemp}°C | THI: ${thi} ${alertTag}`
    );
  }

  // 2. Generate Soil TDR Probes Telemetry
  for (const s of SOIL_ZONES) {
    const vwc = Number(Math.max(8, Math.min(45, s.baseVwc + (Math.random() - 0.5) * 0.8)).toFixed(1));
    const ec = Number(Math.max(0.3, s.baseEc + (Math.random() - 0.5) * 0.06).toFixed(2));
    const rootTemp = Number((s.baseTemp + (Math.random() - 0.5) * 0.4).toFixed(1));

    let status = 'OPTIMAL';
    let waterReq = 15;
    if (vwc < 20) {
      status = 'DEFICIT_IRRIGATE_NOW';
      waterReq = 45;
    } else if (vwc > 38) {
      status = 'SATURATED_REST';
      waterReq = 0;
    }

    const soilPayload = {
      sensorId: `TDR-${s.zone.toUpperCase().substring(0, 10)}`,
      zoneId: s.zone,
      zoneNameAr: s.nameAr,
      cropType: s.crop,
      wilaya: s.wilaya,
      depthCm: s.depthCm,
      timestamp: new Date().toISOString(),
      vwcPct: vwc,
      ecDsM: ec,
      rootZoneTempC: rootTemp,
      irrigationStatus: status,
      recommendedWaterM3Ha: waterReq,
    };

    const topic = `sol/iot/soil/${s.zone}/tdr`;

    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(topic, JSON.stringify(soilPayload), { qos: 1 });
    }

    forwardToIngestionApi({ topic, type: 'soil', data: soilPayload });

    console.log(
      `🌱 [${s.zone}] Crop: ${s.crop} | VWC: ${vwc}% | EC: ${ec} dS/m | Root Temp: ${rootTemp}°C | Status: ${status}`
    );
  }
}

// Start simulation loop
const timer = setInterval(runSimulationTick, options.intervalMs);
runSimulationTick();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[IoT Simulator] Stopping simulation daemon...');
  clearInterval(timer);
  if (mqttClient) mqttClient.end();
  process.exit(0);
});
