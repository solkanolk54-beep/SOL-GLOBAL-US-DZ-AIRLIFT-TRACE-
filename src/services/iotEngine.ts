/**
 * SOL Global / US-DZ Airlift & Livestock Trace System Architecture
 * IoT Engine & Calculation Core (AWS/GCP IoT Core Spec)
 */

import {
  SmartCollarTelemetry,
  SoilTdrTelemetry,
  IoTTopicMessage,
  CowActivityState,
  WilayaLocation,
} from '../types';

/**
 * Calculates the Temperature-Humidity Index (THI) using the official veterinary formula:
 * THI = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
 * @param ambientTempC Temperature in Celsius
 * @param relativeHumidityPct Relative Humidity percentage (0-100)
 */
export function calculateLivestockThi(ambientTempC: number, relativeHumidityPct: number): number {
  const T = ambientTempC;
  const RH = relativeHumidityPct;
  const thi = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26));
  return Number(thi.toFixed(2));
}

export const INITIAL_COLLARS_DEF = [
  {
    deviceId: 'COLLAR-9021',
    rfidTag: 'RFID-CTL-9021',
    cowName: 'Texas Queen #21 (تكساس كوين)',
    farmId: 'DZ-FARM-ADRAR-01',
    wilaya: 'Adrar' as WilayaLocation,
    baseTemp: 39.2,
    baseAmbient: 38.5,
    baseHumidity: 18,
    baseHeartRate: 72,
  },
  {
    deviceId: 'COLLAR-9022',
    rfidTag: 'RFID-CTL-9022',
    cowName: 'Lone Star Beladi #22 (نجمة الجنوب)',
    farmId: 'DZ-FARM-ADRAR-01',
    wilaya: 'Adrar' as WilayaLocation,
    baseTemp: 38.9,
    baseAmbient: 39.0,
    baseHumidity: 16,
    baseHeartRate: 68,
  },
  {
    deviceId: 'COLLAR-9023',
    rfidTag: 'RFID-CTL-9023',
    cowName: 'Rio Grande Atlas #23 (أطلس الزيبان)',
    farmId: 'DZ-FARM-BISKRA-01',
    wilaya: 'Biskra' as WilayaLocation,
    baseTemp: 38.7,
    baseAmbient: 34.0,
    baseHumidity: 28,
    baseHeartRate: 70,
  },
  {
    deviceId: 'COLLAR-9024',
    rfidTag: 'RFID-CTL-9024',
    cowName: 'Pecos Pride #24 (فخر الهضاب)',
    farmId: 'DZ-FARM-MILA-01',
    wilaya: 'Mila' as WilayaLocation,
    baseTemp: 38.5,
    baseAmbient: 26.5,
    baseHumidity: 45,
    baseHeartRate: 64,
  },
];

export const INITIAL_SOIL_SENSORS_DEF = [
  {
    sensorId: 'TDR-ADRAR-01',
    zoneId: 'adrar_pivot_alfalfa',
    zoneNameAr: 'حقل البرسيم الحجازي - محور الرش 01 أدرار',
    wilaya: 'Adrar' as WilayaLocation,
    cropType: 'Alfalfa (برسيم حجازي)' as const,
    depthCm: 30,
    baseVwc: 22.5,
    baseEc: 1.85,
    baseRootTemp: 24.2,
  },
  {
    sensorId: 'TDR-BISKRA-02',
    zoneId: 'biskra_silage_corn',
    zoneNameAr: 'حوض سيلاج الذرة - مجمع الزيبان بسكرة',
    wilaya: 'Biskra' as WilayaLocation,
    cropType: 'Corn Silage (سيلاج ذرة)' as const,
    depthCm: 45,
    baseVwc: 28.4,
    baseEc: 1.42,
    baseRootTemp: 22.8,
  },
  {
    sensorId: 'TDR-MILA-03',
    zoneId: 'mila_pasture_alpha',
    zoneNameAr: 'مراعي الهضاب العليا الطبيعية - ميلة',
    wilaya: 'Mila' as WilayaLocation,
    cropType: 'High Plains Pasture (مرعى طبيعي)' as const,
    depthCm: 20,
    baseVwc: 34.2,
    baseEc: 0.95,
    baseRootTemp: 19.5,
  },
];

export class IoTTelemetrySimulator {
  private heatwaveActive: boolean = false;
  private messageHistory: IoTTopicMessage[] = [];
  private maxHistorySize: number = 60;

  public setHeatwaveMode(active: boolean) {
    this.heatwaveActive = active;
  }

  public getHeatwaveMode(): boolean {
    return this.heatwaveActive;
  }

  /**
   * Generates a single livestock collar telemetry reading
   */
  public generateCollarReading(def: typeof INITIAL_COLLARS_DEF[0]): SmartCollarTelemetry {
    // Dynamic noise variations
    const ambientOffset = (Math.random() - 0.48) * 1.5;
    const humidityOffset = (Math.random() - 0.5) * 2;
    const heatwaveBoost = this.heatwaveActive ? 6.5 : 0;

    const ambientTempC = Number((def.baseAmbient + ambientOffset + heatwaveBoost).toFixed(1));
    const relativeHumidityPct = Math.max(
      10,
      Math.min(90, Number((def.baseHumidity + humidityOffset).toFixed(1)))
    );

    // Compute accurate THI
    const thiIndex = calculateLivestockThi(ambientTempC, relativeHumidityPct);

    // Physiological response to heat
    const isCoolingAlert = thiIndex >= 75;
    const bodyTempOffset = isCoolingAlert ? 0.6 + (thiIndex - 75) * 0.12 : (Math.random() - 0.5) * 0.2;
    const bodyTempC = Number((def.baseTemp + bodyTempOffset).toFixed(2));

    // Determine activity state based on stress
    let activityState: CowActivityState = 'rumination';
    if (isCoolingAlert) {
      activityState = 'heat_stressed_lethargic';
    } else {
      const rand = Math.random();
      if (rand < 0.4) activityState = 'grazing';
      else if (rand < 0.75) activityState = 'rumination';
      else if (rand < 0.9) activityState = 'resting';
      else activityState = 'active';
    }

    const heartRateBpm = Math.round(
      def.baseHeartRate + (isCoolingAlert ? 16 + (thiIndex - 75) * 2 : (Math.random() - 0.5) * 4)
    );

    const telemetry: SmartCollarTelemetry = {
      deviceId: def.deviceId,
      rfidTag: def.rfidTag,
      cowName: def.cowName,
      farmId: def.farmId,
      wilaya: def.wilaya,
      timestamp: new Date().toISOString(),
      bodyTempC,
      ambientTempC,
      relativeHumidityPct,
      thiIndex,
      activityState,
      heartRateBpm,
      ruminationMinutesToday: Math.round(380 - (isCoolingAlert ? 60 : 0) + (Math.random() - 0.5) * 20),
      stepsCount: Math.round(4200 + (Math.random() - 0.5) * 300),
      batteryPct: Math.round(92 + (Math.random() - 0.5) * 3),
      coolingAlertActive: isCoolingAlert,
      coolingIntervention: {
        tunnelFanSpeedPct: isCoolingAlert ? 100 : thiIndex >= 70 ? 75 : 45,
        sprinklerIntervalMinutes: isCoolingAlert ? 3 : 15,
        mistingActive: isCoolingAlert,
        rumenBufferSupplementGrams: isCoolingAlert ? 280 : 180,
      },
    };

    // Store MQTT packet
    const topic = `sol/iot/livestock/${def.rfidTag}/telemetry`;
    this.recordMessage(topic, telemetry);

    return telemetry;
  }

  /**
   * Generates a single soil TDR reading
   */
  public generateSoilReading(def: typeof INITIAL_SOIL_SENSORS_DEF[0]): SoilTdrTelemetry {
    const vwcOffset = (Math.random() - 0.5) * 0.8;
    const vwcPct = Number(Math.max(8, Math.min(48, def.baseVwc + vwcOffset)).toFixed(1));
    const ecOffset = (Math.random() - 0.5) * 0.08;
    const ecDsM = Number(Math.max(0.2, def.baseEc + ecOffset).toFixed(2));
    const rootTempC = Number((def.baseRootTemp + (Math.random() - 0.5) * 0.6).toFixed(1));

    let irrigationStatus: 'OPTIMAL' | 'DEFICIT_IRRIGATE_NOW' | 'SATURATED_REST' = 'OPTIMAL';
    let recommendedWaterM3Ha = 0;

    if (vwcPct < 20) {
      irrigationStatus = 'DEFICIT_IRRIGATE_NOW';
      recommendedWaterM3Ha = 45; // m3/hectare
    } else if (vwcPct > 38) {
      irrigationStatus = 'SATURATED_REST';
      recommendedWaterM3Ha = 0;
    } else {
      irrigationStatus = 'OPTIMAL';
      recommendedWaterM3Ha = 15;
    }

    const telemetry: SoilTdrTelemetry = {
      sensorId: def.sensorId,
      zoneId: def.zoneId,
      zoneNameAr: def.zoneNameAr,
      wilaya: def.wilaya,
      cropType: def.cropType,
      timestamp: new Date().toISOString(),
      vwcPct,
      ecDsM,
      rootZoneTempC: rootTempC,
      shallowTempC: Number((rootTempC + 4.2).toFixed(1)),
      depthCm: def.depthCm,
      irrigationStatus,
      recommendedWaterM3Ha,
    };

    const topic = `sol/iot/soil/${def.zoneId}/tdr`;
    this.recordMessage(topic, telemetry);

    return telemetry;
  }

  public recordMessage(topic: string, payload: any) {
    const msg: IoTTopicMessage = {
      topic,
      timestamp: new Date().toISOString(),
      protocol: 'MQTT',
      qos: 1,
      payload,
    };
    this.messageHistory.unshift(msg);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.pop();
    }
  }

  public getRecentMessages(): IoTTopicMessage[] {
    return this.messageHistory;
  }
}

export const iotSimulator = new IoTTelemetrySimulator();
