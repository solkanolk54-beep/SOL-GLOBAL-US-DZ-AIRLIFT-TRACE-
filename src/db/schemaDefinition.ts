/**
 * PostgreSQL Schema metadata and ER diagram definitions for frontend inspection
 */

export interface SchemaTableDef {
  name: string;
  descriptionAr: string;
  descriptionEn: string;
  primaryKey: string;
  postGisColumns?: string[];
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    description: string;
    isSpatial?: boolean;
    isFk?: boolean;
    fkRef?: string;
  }[];
}

export const POSTGRES_TABLES: SchemaTableDef[] = [
  {
    name: 'airlift_shipments',
    descriptionAr: 'جدول متابعة رحلات الشحن الجوي الـ 109 لقطيع الأبقار من الولايات الأمريكية إلى مطارات الحجر الجزائرية',
    descriptionEn: 'Trans-Atlantic cargo flight shipments (109 airlifts) from US livestock hubs to Algerian entry airports',
    primaryKey: 'id (UUID)',
    postGisColumns: ['origin_geom', 'destination_geom'],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary Key (UUID v4)' },
      { name: 'flight_number', type: 'VARCHAR(32)', nullable: false, description: 'Unique Flight Identification (e.g. SOL-AF-109-TX01)' },
      { name: 'flight_batch_index', type: 'INTEGER', nullable: false, description: 'Flight index sequence (1 to 109)' },
      { name: 'origin_airport_code', type: 'VARCHAR(8)', nullable: false, description: 'US Airport Hub (DFW, PHX, ABQ, IAH)' },
      { name: 'origin_state', type: 'VARCHAR(64)', nullable: false, description: 'Origin state (Texas, Arizona, New Mexico)' },
      { name: 'origin_geom', type: 'GEOMETRY(Point, 4326)', nullable: false, description: 'PostGIS spatial departure coordinates', isSpatial: true },
      { name: 'destination_airport_code', type: 'VARCHAR(8)', nullable: false, description: 'DZ Airport (AZR - Adrar, BSK - Biskra, ALG - Algiers)' },
      { name: 'destination_geom', type: 'GEOMETRY(Point, 4326)', nullable: false, description: 'PostGIS arrival coordinates', isSpatial: true },
      { name: 'target_wilaya', type: 'VARCHAR(64)', nullable: false, description: 'Destination Wilaya (Adrar, Biskra, Mila)' },
      { name: 'aircraft_model', type: 'VARCHAR(64)', nullable: false, description: 'Freighter model (Boeing 747-400F / 777F)' },
      { name: 'head_count', type: 'INTEGER', nullable: false, description: 'Number of purebred heifers/cows on board' },
      { name: 'departure_time', type: 'TIMESTAMPTZ', nullable: false, description: 'Scheduled departure timestamp' },
      { name: 'estimated_arrival_time', type: 'TIMESTAMPTZ', nullable: false, description: 'Estimated arrival time at Algerian port' },
      { name: 'status', type: 'flight_status_enum', nullable: false, description: 'scheduled, in_flight, landed, quarantine_holding, cleared' },
      { name: 'quarantine_stage', type: 'quarantine_stage_enum', nullable: false, description: 'airport_primary_48h, transit_escort, farm_quarantine_30d' },
      { name: 'usda_health_cert_number', type: 'VARCHAR(64)', nullable: false, description: 'USDA APHIS Veterinary Certificate Number' },
      { name: 'usda_verified_by', type: 'VARCHAR(128)', nullable: false, description: 'USDA authorized veterinarian officer' },
      { name: 'cabin_temp_celsius', type: 'NUMERIC(4,2)', nullable: true, description: 'In-flight cargo bay climate sensor (15-18°C)' },
      { name: 'cabin_humidity_pct', type: 'NUMERIC(4,2)', nullable: true, description: 'Relative humidity in cargo bay' },
      { name: 'mortality_rate_pct', type: 'NUMERIC(4,3)', nullable: false, description: 'Mortality percentage (standard < 0.05%)' },
    ],
  },
  {
    name: 'livestock',
    descriptionAr: 'السجل الرئيسي لكل بقرة حلوب هولشتاين، مربوط بشريحة الأذن الذكية RFID مع الموقع الجغرافي والجينات',
    descriptionEn: 'Master registry of individual Holstein cattle linked with ISO 11784 RFID ear tags and PostGIS geolocations',
    primaryKey: 'id (UUID)',
    postGisColumns: ['location_geom'],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary Key (UUID v4)' },
      { name: 'rfid_tag', type: 'VARCHAR(32)', nullable: false, description: 'ISO 11784/11785 FDX-B RFID tag (e.g. RFID-CTL-9021)' },
      { name: 'us_ear_tag', type: 'VARCHAR(32)', nullable: false, description: 'US National livestock ear tag' },
      { name: 'dz_national_id', type: 'VARCHAR(32)', nullable: false, description: 'Algerian Ministry of Agriculture identifier' },
      { name: 'breed', type: 'VARCHAR(64)', nullable: false, description: 'Purebred Holstein Friesian' },
      { name: 'airlift_shipment_id', type: 'UUID', nullable: true, description: 'Origin flight shipment', isFk: true, fkRef: 'airlift_shipments.id' },
      { name: 'current_wilaya', type: 'VARCHAR(64)', nullable: false, description: 'Current Wilaya (Adrar, Biskra, Mila)' },
      { name: 'farm_id', type: 'VARCHAR(64)', nullable: false, description: 'Farm Facility Code (e.g. DZ-FARM-ADRAR-01)' },
      { name: 'location_geom', type: 'GEOMETRY(Point, 4326)', nullable: false, description: 'Real-time PostGIS coordinates on farm pasture/barn', isSpatial: true },
      { name: 'quarantine_status', type: 'VARCHAR(32)', nullable: false, description: 'quarantine_holding, quarantine_cleared, medical_isolation' },
      { name: 'quarantine_day', type: 'INTEGER', nullable: false, description: 'Current day in quarantine protocol (1 to 30)' },
      { name: 'sire_name', type: 'VARCHAR(128)', nullable: false, description: 'Sire pedigree registered line' },
      { name: 'dam_name', type: 'VARCHAR(128)', nullable: false, description: 'Dam registered line' },
      { name: 'genetic_merit_tpi', type: 'INTEGER', nullable: false, description: 'Total Performance Index (TPI 2800 - 3100)' },
      { name: 'current_weight_kg', type: 'NUMERIC(6,2)', nullable: false, description: 'Live body weight (kg)' },
      { name: 'average_milk_yield_liters', type: 'NUMERIC(5,2)', nullable: false, description: 'Current 7-day average daily yield (L/day)' },
      { name: 'target_milk_yield_liters', type: 'NUMERIC(5,2)', nullable: false, description: 'Target daily production (30-40 L/day)' },
      { name: 'health_score', type: 'INTEGER', nullable: false, description: 'Overall biometric health index (0 to 100)' },
    ],
  },
  {
    name: 'health_records',
    descriptionAr: 'السجل البيطري الكامل: التحصينات (البروسيلا، الحمى القلاعية)، التلقيح الاصطناعي، ومراقبة الحجر',
    descriptionEn: 'Veterinary clinical logs: vaccinations, artificial insemination, quarantine clearance audits, and treatments',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary Key (UUID v4)' },
      { name: 'livestock_id', type: 'UUID', nullable: false, description: 'Foreign Key to livestock table', isFk: true, fkRef: 'livestock.id' },
      { name: 'rfid_tag', type: 'VARCHAR(32)', nullable: false, description: 'ISO RFID tag of the cow' },
      { name: 'record_type', type: 'health_record_type_enum', nullable: false, description: 'vaccination, insemination, quarantine_inspection, treatment' },
      { name: 'examination_date', type: 'TIMESTAMPTZ', nullable: false, description: 'Clinical examination timestamp' },
      { name: 'veterinarian_name', type: 'VARCHAR(128)', nullable: false, description: 'Attending veterinarian specialist' },
      { name: 'license_number', type: 'VARCHAR(64)', nullable: false, description: 'Official veterinary license number' },
      { name: 'vaccine_or_drug_name', type: 'VARCHAR(128)', nullable: true, description: 'Vaccine / pharmaceutical substance' },
      { name: 'batch_lot_number', type: 'VARCHAR(64)', nullable: true, description: 'Manufacturer batch lot number' },
      { name: 'quarantine_clearance_passed', type: 'BOOLEAN', nullable: true, description: 'Passed biosecurity quarantine threshold' },
      { name: 'clinical_notes', type: 'TEXT', nullable: true, description: 'Veterinary examination notes' },
    ],
  },
  {
    name: 'feed_logs',
    descriptionAr: 'حسابات التأقلم المناخي والعليقة المتوازنة للتصدي للإجهاد الحراري في مزارع أدرار وبسكرة وميلة',
    descriptionEn: 'Adaptive feed formulation logs and THI climate stress records to prevent thermal yield depression',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary Key (UUID v4)' },
      { name: 'farm_id', type: 'VARCHAR(64)', nullable: false, description: 'Farm identifier' },
      { name: 'wilaya', type: 'VARCHAR(64)', nullable: false, description: 'Adrar, Biskra, or Mila' },
      { name: 'recorded_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Telemetry recording timestamp' },
      { name: 'ambient_temp_celsius', type: 'NUMERIC(4,2)', nullable: false, description: 'Ambient temperature (°C)' },
      { name: 'relative_humidity_pct', type: 'NUMERIC(4,2)', nullable: false, description: 'Relative air humidity percentage' },
      { name: 'thi_index', type: 'NUMERIC(5,2)', nullable: false, description: 'Temperature-Humidity Index (THI)' },
      { name: 'stress_category', type: 'stress_category_enum', nullable: false, description: 'normal, mild_stress, moderate_stress, severe_stress' },
      { name: 'alfalfa_hay_kg', type: 'NUMERIC(5,2)', nullable: false, description: 'Alfalfa hay / برسيم حجازي (kg/cow/day)' },
      { name: 'corn_silage_kg', type: 'NUMERIC(5,2)', nullable: false, description: 'Corn silage / سيلاج الذرة (kg/cow/day)' },
      { name: 'soybean_meal_48_kg', type: 'NUMERIC(5,2)', nullable: false, description: 'Soybean meal 48% CP / كسب الصويا (kg/cow/day)' },
      { name: 'bypass_rumen_fat_kg', type: 'NUMERIC(4,2)', nullable: false, description: 'Rumen-protected bypass fats (kg/cow/day)' },
      { name: 'sodium_bicarbonate_grams', type: 'INTEGER', nullable: false, description: 'Rumen buffer bicarb dosage (grams/cow/day)' },
      { name: 'cooling_misting_fan_cycle_active', type: 'BOOLEAN', nullable: false, description: 'Active microclimate tunnel cooling state' },
    ],
  },
  {
    name: 'qr_traceability',
    descriptionAr: 'جواز السفر الرقمي المشفّر (Farm-to-Fork) لحاويات الحليب واللحوم مع التحاليل المخبرية والتوقيع المشفر',
    descriptionEn: 'Cryptographically signed Farm-to-Fork passports linking milk batches with RFID cattle and PostGIS origin',
    primaryKey: 'id (UUID)',
    postGisColumns: ['farm_geom'],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary Key (UUID v4)' },
      { name: 'batch_code', type: 'VARCHAR(64)', nullable: false, description: 'Unique Product Batch Code' },
      { name: 'token_hash', type: 'VARCHAR(128)', nullable: false, description: 'HMAC-SHA256 Cryptographic validation signature' },
      { name: 'product_type', type: 'VARCHAR(64)', nullable: false, description: 'Raw Milk Tanker, Certified Holstein Beef, etc.' },
      { name: 'farm_id', type: 'VARCHAR(64)', nullable: false, description: 'Origin farm identifier' },
      { name: 'farm_name', type: 'VARCHAR(128)', nullable: false, description: 'Official Farm Name' },
      { name: 'farm_wilaya', type: 'VARCHAR(64)', nullable: false, description: 'Origin Wilaya' },
      { name: 'farm_geom', type: 'GEOMETRY(Point, 4326)', nullable: false, description: 'PostGIS spatial location of origin farm', isSpatial: true },
      { name: 'airlift_flight_ref', type: 'VARCHAR(32)', nullable: false, description: 'Original US airlift flight reference' },
      { name: 'usda_cert_ref', type: 'VARCHAR(64)', nullable: false, description: 'Original USDA health certificate number' },
      { name: 'contributing_rfid_tags', type: 'TEXT[]', nullable: false, description: 'Array of cow RFID ear tags contributing to batch' },
      { name: 'volume_liters', type: 'NUMERIC(8,2)', nullable: false, description: 'Certified volume in liters' },
      { name: 'fat_percentage', type: 'NUMERIC(4,2)', nullable: false, description: 'Laboratory Fat % (e.g. 3.85%)' },
      { name: 'protein_percentage', type: 'NUMERIC(4,2)', nullable: false, description: 'Laboratory Protein % (e.g. 3.28%)' },
      { name: 'ph_level', type: 'NUMERIC(3,2)', nullable: false, description: 'Acidity pH level (e.g. 6.65)' },
      { name: 'acidity_dornic', type: 'NUMERIC(4,2)', nullable: false, description: 'Titratable Acidity in Dornic degrees (°D)' },
      { name: 'antibiotic_residue_negative', type: 'BOOLEAN', nullable: false, description: 'Lab-certified antibiotic negative test' },
      { name: 'cold_chain_temp_c', type: 'NUMERIC(4,2)', nullable: false, description: 'Continuous tanker temperature (< 4°C)' },
      { name: 'destination_plant', type: 'VARCHAR(128)', nullable: false, description: 'Destination dairy processing facility' },
    ],
  },
];
