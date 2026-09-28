/**
 * SOL Global / US-DZ Airlift & Livestock Trace System Architecture
 * Core Domain Types and Interfaces
 */

export type FlightStatus = 'scheduled' | 'boarding' | 'in_flight' | 'landed' | 'quarantine_holding' | 'cleared';

export type QuarantineStage = 'airport_primary_48h' | 'transit_escort' | 'farm_quarantine_30d' | 'herd_integrated';

export type LivestockBreed = 'Purebred Holstein Friesian';

export type WilayaLocation = 'Adrar' | 'Biskra' | 'Mila' | 'El Oued' | 'Ghardaia';

export interface AirliftShipment {
  id: string;
  flightNumber: string; // e.g. "SOL-AF-109-TX01"
  flightBatchIndex: number; // 1 to 109
  originAirport: {
    code: string; // e.g. "DFW", "PHX", "ABQ", "IAH"
    name: string;
    state: string; // Texas, Arizona, New Mexico
    coordinates: [number, number]; // [lat, lng]
  };
  destinationAirport: {
    code: string; // "AZR" (Adrar), "BSK" (Biskra), "ALG" (Algiers)
    name: string;
    wilaya: WilayaLocation;
    coordinates: [number, number];
  };
  destinationFarm: {
    farmId: string;
    name: string;
    wilaya: WilayaLocation;
    coordinates: [number, number];
  };
  aircraftModel: string; // e.g. "Boeing 747-400F Cargo" or "Boeing 777F"
  departureTime: string;
  estimatedArrivalTime: string;
  status: FlightStatus;
  quarantineStage: QuarantineStage;
  headCount: number;
  usdaHealthCertNumber: string; // e.g. "USDA-APHIS-2026-DZ-8941"
  usdaVerifiedBy: string; // e.g. "Dr. Marcus Vance, DVM (APHIS Authorized)"
  usdaVerificationDate: string;
  usdaStatus: 'verified' | 'pending_audit' | 'flagged';
  quarantineRemainingHours: number;
  cabinTelemetry: {
    ambientTempC: number;
    relativeHumidityPct: number;
    airChangeRatePerHour: number;
    oxygenLevelPct: number;
    co2LevelPpm: number;
  };
  mortalityRatePct: number;
  notes: string;
}

export interface WeightRecord {
  date: string;
  weightKg: number;
}

export interface MilkYieldRecord {
  date: string;
  morningYieldL: number;
  noonYieldL: number;
  eveningYieldL: number;
  totalDailyYieldL: number;
  fatPct: number;
  proteinPct: number;
  somaticCellCountK: number; // SCC in thousands/ml (e.g. 120k)
  electricalConductivityMs: number; // Mastitis check
}

export interface VaccinationRecord {
  id: string;
  date: string;
  vaccineName: string; // e.g. "Brucella Abortus Strain 19", "Foot-and-Mouth (A/O/SAT2)", "BVD/IBR Bovine"
  batchNumber: string;
  veterinarian: string;
  nextBoosterDate: string;
  status: 'valid' | 'due' | 'administered';
}

export interface HealthRecord {
  id: string;
  livestockId: string;
  rfidTag: string;
  recordType: 'vaccination' | 'artificial_insemination' | 'quarantine_inspection' | 'pregnancy_check' | 'clinical_treatment';
  examinationDate: string;
  veterinarianName: string;
  licenseNumber: string;
  title: string;
  vaccineOrDrugName?: string;
  batchLotNumber?: string;
  bodyTemperatureC?: number;
  quarantineClearancePassed: boolean;
  clinicalNotes?: string;
}

export interface LivestockCow {
  id: string; // Database UUID
  rfidTag: string; // ISO 11784/11785 FDX-B, e.g. "RFID-CTL-9021" / "840003298492001"
  usEarTag: string; // US National Ear Tag, e.g. "USA-TX-2024-8849"
  dzNationalId: string; // Algerian Ministry of Agriculture tag, e.g. "DZ-ADR-01-9021"
  breed: LivestockBreed;
  airliftShipmentId: string;
  flightNumber: string;
  birthDate: string;
  originState: string; // "Texas", "Arizona", "New Mexico"
  currentWilaya: WilayaLocation;
  farmId: string;
  farmName: string;
  barnNumber: string;
  penNumber: string;
  quarantineStatus: 'quarantine_holding' | 'quarantine_cleared' | 'medical_isolation';
  quarantineDay: number; // 1 to 30
  geneticMerit: {
    sireName: string; // e.g. "Pine-Tree Dairy Kingpin"
    sireRegistration: string;
    damName: string; // e.g. "Lone-Star Holstein 4402-ET"
    geneticMeritTpi: number; // Total Performance Index, e.g. 2940
    milkYieldGenomicPotentialL: number; // e.g. 13,500 L / 305 days
    genomicInbreedingPct: number;
  };
  currentWeightKg: number;
  weightHistory: WeightRecord[];
  lactationCycle: {
    lactationNumber: number; // 1st lactation, 2nd, etc.
    daysInMilk: number; // DIM
    inseminationDate: string;
    inseminationBull: string;
    pregnancyStatus: 'confirmed_pregnant' | 'open' | 'inseminated_monitoring';
    expectedCalvingDate?: string;
  };
  averageMilkYieldL: number; // Last 7-day avg
  targetMilkYieldL: number; // 30 - 40 L/day
  recentMilkYields: MilkYieldRecord[];
  vaccinations: VaccinationRecord[];
  healthScore: number; // 1 to 100
  ruminationMinutesPerDay: number;
  activityIndex: number;
  gpsCoordinates: [number, number];
}

export interface ClimateTelemetry {
  wilaya: WilayaLocation;
  ambientTempC: number;
  relativeHumidityPct: number;
  thi: number; // Temperature Humidity Index
  stressCategory: 'normal' | 'mild_stress' | 'moderate_stress' | 'severe_stress' | 'emergency';
  windSpeedKmh: number;
  solarRadiationWm2: number;
  timestamp: string;
  predictedDropInMilkLiters: number;
}

export interface FeedRationRecipe {
  wilaya: WilayaLocation;
  thiIndex: number;
  targetDailyYieldL: number;
  ingredients: {
    nameAr: string;
    nameEn: string;
    amountKgDay: number;
    dryMatterPct: number;
    crudeProteinPct: number;
    netEnergyMcal: number;
    purpose: string;
  }[];
  waterRequirementLitersDay: number;
  activeCoolingProtocol: {
    mistingIntervalSeconds: number;
    fanSpeedPct: number;
    sprinklerFrequencyMinutes: number;
    nighttimeHyperVentilation: boolean;
  };
  rumenBufferGramsDay: number; // Sodium bicarbonate / potassium carbonate
}

export interface QrPassportPayload {
  token: string;
  batchId: string;
  productType: 'Raw A-Grade Milk (حليب خام ممتاز)' | 'Pasteurized Tanker Milk' | 'Certified Holstein Beef';
  cowRfidList: string[];
  headCountSupplying: number;
  farmId: string;
  farmName: string;
  farmWilaya: WilayaLocation;
  farmCoordinates: [number, number];
  airliftShipmentNumber: string;
  usdaHealthCertReference: string;
  milkingTimestamp: string;
  volumeLiters: number;
  labAnalysis: {
    fatPercentage: number; // e.g. 3.85%
    proteinPercentage: number; // e.g. 3.28%
    lactosePercentage: number; // e.g. 4.80%
    phValue: number; // e.g. 6.65
    acidityDornic: number; // 15°D - 16°D
    somaticCellCount: number; // < 150,000 / ml
    antibioticResidue: 'Negative (خالٍ من المضادات الحيوية)' | 'Positive';
    aflatoxinM1: '< 0.05 ppb (EU/DZ Standard)';
  };
  coldChainTemperatureC: number; // e.g. 3.8°C
  destinationDairyPlant: string; // e.g. "GIPLAIT Complex / Baladna Dairy Processing Unit"
  hmacSignature: string;
  issuedAt: string;
}

export interface OfflineSyncItem {
  id: string;
  type: 'rfid_scan' | 'milk_yield' | 'health_record' | 'ration_update';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}

export type CowActivityState =
  | 'grazing'
  | 'rumination'
  | 'resting'
  | 'active'
  | 'heat_stressed_lethargic';

export interface SmartCollarTelemetry {
  deviceId: string; // e.g. "COLLAR-9021"
  rfidTag: string; // e.g. "RFID-CTL-9021"
  cowName: string;
  farmId: string;
  wilaya: WilayaLocation;
  timestamp: string;
  bodyTempC: number; // 38.5 - 40.5
  ambientTempC: number;
  relativeHumidityPct: number;
  thiIndex: number; // Computed: (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
  activityState: CowActivityState;
  heartRateBpm: number;
  ruminationMinutesToday: number;
  stepsCount: number;
  batteryPct: number;
  coolingAlertActive: boolean; // True if thiIndex >= 75
  coolingIntervention: {
    tunnelFanSpeedPct: number;
    sprinklerIntervalMinutes: number;
    mistingActive: boolean;
    rumenBufferSupplementGrams: number;
  };
}

export interface SoilTdrTelemetry {
  sensorId: string; // e.g. "TDR-ADRAR-01"
  zoneId: string; // e.g. "adrar_pivot_alfalfa"
  zoneNameAr: string; // e.g. "حقل البرسيم الحجازي - محور الرش 01 أدرار"
  wilaya: WilayaLocation;
  cropType: 'Alfalfa (برسيم حجازي)' | 'Corn Silage (سيلاج ذرة)' | 'High Plains Pasture (مرعى طبيعي)';
  timestamp: string;
  vwcPct: number; // Volumetric Water Content % (12% - 40%)
  ecDsM: number; // Electrical Conductivity / Salinity in dS/m (0.6 - 3.5)
  rootZoneTempC: number; // Soil temp at root depth
  shallowTempC: number;
  depthCm: number; // Probe depth (e.g. 30cm or 60cm)
  irrigationStatus: 'OPTIMAL' | 'DEFICIT_IRRIGATE_NOW' | 'SATURATED_REST';
  recommendedWaterM3Ha: number;
}

export interface IoTTopicMessage {
  topic: string;
  timestamp: string;
  protocol: 'MQTT' | 'MQTT-over-WSS';
  qos: 0 | 1 | 2;
  payload: SmartCollarTelemetry | SoilTdrTelemetry | any;
}

export interface IoTSimulatorState {
  isRunning: boolean;
  intervalMs: number;
  totalPacketsSent: number;
  lastPacketTime: string | null;
  heatwaveMode: boolean;
  activeCollars: SmartCollarTelemetry[];
  activeSoilSensors: SoilTdrTelemetry[];
}

