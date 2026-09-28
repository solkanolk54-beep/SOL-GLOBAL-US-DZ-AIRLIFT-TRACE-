-- ============================================================================
-- SOL Global / US-DZ Airlift & Livestock Trace System Architecture
-- Database Schema: PostgreSQL 16+ with PostGIS Spatial Extension
-- ============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumerated Domain Types
CREATE TYPE flight_status_enum AS ENUM (
    'scheduled', 
    'boarding', 
    'in_flight', 
    'landed', 
    'quarantine_holding', 
    'cleared'
);

CREATE TYPE quarantine_stage_enum AS ENUM (
    'airport_primary_48h', 
    'transit_escort', 
    'farm_quarantine_30d', 
    'herd_integrated'
);

CREATE TYPE usda_status_enum AS ENUM (
    'verified', 
    'pending_audit', 
    'flagged'
);

CREATE TYPE health_record_type_enum AS ENUM (
    'vaccination', 
    'artificial_insemination', 
    'quarantine_inspection', 
    'pregnancy_check', 
    'clinical_treatment'
);

CREATE TYPE stress_category_enum AS ENUM (
    'normal', 
    'mild_stress', 
    'moderate_stress', 
    'severe_stress', 
    'emergency'
);

-- ============================================================================
-- TABLE 1: airlift_shipments
-- Tracks trans-Atlantic cargo flights (109 scheduled airlifts) transporting
-- purebred Holstein cattle from US breeding hubs to Algerian quarantine ports.
-- ============================================================================
CREATE TABLE IF NOT EXISTS airlift_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number VARCHAR(32) NOT NULL UNIQUE,       -- e.g. 'SOL-AF-109-TX01'
    flight_batch_index INT NOT NULL CHECK (flight_batch_index BETWEEN 1 AND 109),
    
    -- Origin Hub (US)
    origin_airport_code VARCHAR(8) NOT NULL,         -- 'DFW', 'PHX', 'ABQ', 'IAH'
    origin_airport_name VARCHAR(128) NOT NULL,
    origin_state VARCHAR(64) NOT NULL,               -- 'Texas', 'Arizona', 'New Mexico'
    origin_geom GEOMETRY(Point, 4326) NOT NULL,      -- Departure coordinates
    
    -- Destination Port & Target Farm (DZ)
    destination_airport_code VARCHAR(8) NOT NULL,    -- 'AZR' (Adrar), 'BSK' (Biskra), 'ALG' (Algiers)
    destination_airport_name VARCHAR(128) NOT NULL,
    destination_geom GEOMETRY(Point, 4326) NOT NULL, -- Arrival coordinates
    target_farm_id VARCHAR(64) NOT NULL,
    target_wilaya VARCHAR(64) NOT NULL,              -- 'Adrar', 'Biskra', 'Mila'
    
    -- Aircraft & Cargo Telemetry
    aircraft_model VARCHAR(64) NOT NULL DEFAULT 'Boeing 747-400F Cargo',
    head_count INT NOT NULL CHECK (head_count > 0),
    departure_time TIMESTAMPTZ NOT NULL,
    estimated_arrival_time TIMESTAMPTZ NOT NULL,
    actual_arrival_time TIMESTAMPTZ,
    status flight_status_enum NOT NULL DEFAULT 'scheduled',
    quarantine_stage quarantine_stage_enum NOT NULL DEFAULT 'airport_primary_48h',
    
    -- USDA APHIS Veterinary Certification
    usda_health_cert_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. 'USDA-APHIS-2026-DZ-8941'
    usda_verified_by VARCHAR(128) NOT NULL,
    usda_verification_date DATE NOT NULL,
    usda_status usda_status_enum NOT NULL DEFAULT 'verified',
    
    -- In-Flight Environmental & Safety Parameters
    cabin_temp_celsius NUMERIC(4, 2) DEFAULT 16.5,
    cabin_humidity_pct NUMERIC(4, 2) DEFAULT 55.0,
    ventilation_rate_per_hour NUMERIC(5, 2) DEFAULT 32.0,
    mortality_rate_pct NUMERIC(4, 3) DEFAULT 0.000,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial and B-Tree Indexes for Airlift Shipments
CREATE INDEX idx_airlift_origin_geom ON airlift_shipments USING GIST (origin_geom);
CREATE INDEX idx_airlift_dest_geom ON airlift_shipments USING GIST (destination_geom);
CREATE INDEX idx_airlift_status ON airlift_shipments (status);
CREATE INDEX idx_airlift_usda_cert ON airlift_shipments (usda_health_cert_number);

-- ============================================================================
-- TABLE 2: livestock
-- Master record for each individual cow, keyed to ISO 11784/11785 RFID chip,
-- maintaining purebred pedigree, real-time spatial location, and yield targets.
-- ============================================================================
CREATE TABLE IF NOT EXISTS livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfid_tag VARCHAR(32) NOT NULL UNIQUE,            -- ISO 11784/11785 FDX-B (e.g. 'RFID-CTL-9021')
    us_ear_tag VARCHAR(32) NOT NULL,                 -- US National Identification Tag
    dz_national_id VARCHAR(32) NOT NULL UNIQUE,      -- Algerian Ministry of Agriculture Tag
    breed VARCHAR(64) NOT NULL DEFAULT 'Purebred Holstein Friesian',
    
    -- Airlift Lineage
    airlift_shipment_id UUID REFERENCES airlift_shipments(id) ON DELETE SET NULL,
    flight_number VARCHAR(32) NOT NULL,
    origin_state VARCHAR(64) NOT NULL,               -- 'Texas', 'Arizona', 'New Mexico'
    birth_date DATE NOT NULL,
    
    -- Current Physical Location (PostGIS Spatial Coordinate)
    current_wilaya VARCHAR(64) NOT NULL,             -- 'Adrar', 'Biskra', 'Mila'
    farm_id VARCHAR(64) NOT NULL,
    farm_name VARCHAR(128) NOT NULL,
    barn_number VARCHAR(32) NOT NULL,
    pen_number VARCHAR(32) NOT NULL,
    location_geom GEOMETRY(Point, 4326) NOT NULL,    -- Accurate GPS coordinate on farm
    
    -- Quarantine & Biosecurity Status
    quarantine_status VARCHAR(32) NOT NULL DEFAULT 'quarantine_holding', -- 'quarantine_holding', 'quarantine_cleared', 'medical_isolation'
    quarantine_day INT NOT NULL DEFAULT 1 CHECK (quarantine_day BETWEEN 1 AND 30),
    
    -- Genetic Blueprint & Pedigree Merit
    sire_name VARCHAR(128) NOT NULL,
    sire_registration VARCHAR(64),
    dam_name VARCHAR(128) NOT NULL,
    genetic_merit_tpi INT NOT NULL,                  -- Total Performance Index (e.g. 2940)
    genomic_inbreeding_pct NUMERIC(4, 2) DEFAULT 4.20,
    genomic_potential_liters_305d INT DEFAULT 13500,
    
    -- Physiological & Yield Monitoring
    current_weight_kg NUMERIC(6, 2) NOT NULL,
    lactation_number INT NOT NULL DEFAULT 1,
    days_in_milk INT NOT NULL DEFAULT 45,
    pregnancy_status VARCHAR(32) NOT NULL DEFAULT 'confirmed_pregnant',
    last_insemination_date DATE,
    expected_calving_date DATE,
    
    average_milk_yield_liters NUMERIC(5, 2) NOT NULL DEFAULT 35.5, -- Target 30-40 L/Day
    target_milk_yield_liters NUMERIC(5, 2) NOT NULL DEFAULT 38.0,
    rumination_minutes_day INT DEFAULT 520,
    health_score INT NOT NULL DEFAULT 95 CHECK (health_score BETWEEN 0 AND 100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial and Query Indexes for Livestock
CREATE INDEX idx_livestock_geom ON livestock USING GIST (location_geom);
CREATE INDEX idx_livestock_rfid ON livestock (rfid_tag);
CREATE INDEX idx_livestock_wilaya_farm ON livestock (current_wilaya, farm_id);
CREATE INDEX idx_livestock_quarantine ON livestock (quarantine_status);

-- ============================================================================
-- TABLE 3: health_records
-- Complete veterinary history including vaccination schedules, artificial
-- insemination, quarantine clearance audits, and therapeutic treatments.
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    rfid_tag VARCHAR(32) NOT NULL,
    record_type health_record_type_enum NOT NULL,
    examination_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    veterinarian_name VARCHAR(128) NOT NULL,
    license_number VARCHAR(64) NOT NULL,
    
    -- Clinical Details
    title VARCHAR(256) NOT NULL,
    vaccine_or_drug_name VARCHAR(128),
    batch_lot_number VARCHAR(64),
    dosage_administered VARCHAR(64),
    body_temperature_c NUMERIC(4, 2),
    quarantine_clearance_passed BOOLEAN DEFAULT TRUE,
    clinical_notes TEXT,
    next_follow_up_date DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_cow ON health_records (livestock_id);
CREATE INDEX idx_health_records_rfid ON health_records (rfid_tag);
CREATE INDEX idx_health_records_date ON health_records (examination_date);

-- ============================================================================
-- TABLE 4: feed_logs
-- Adaptive microclimate calculations and balanced ration recipes to mitigate
-- heat stress (THI index) across desert and semi-arid wilayas (Adrar, Biskra).
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id VARCHAR(64) NOT NULL,
    wilaya VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Microclimate & Thermal Parameters
    ambient_temp_celsius NUMERIC(4, 2) NOT NULL,
    relative_humidity_pct NUMERIC(4, 2) NOT NULL,
    thi_index NUMERIC(5, 2) NOT NULL,                -- Temperature Humidity Index
    stress_category stress_category_enum NOT NULL,
    
    -- Nutritional Formulation Components (kg/cow/day)
    alfalfa_hay_kg NUMERIC(5, 2) NOT NULL,          -- Berseem / برسيم حجازي
    corn_silage_kg NUMERIC(5, 2) NOT NULL,          -- سيلاج الذرة
    soybean_meal_48_kg NUMERIC(5, 2) NOT NULL,      -- كسب الصويا
    cottonseed_whole_kg NUMERIC(5, 2) NOT NULL,
    bypass_rumen_fat_kg NUMERIC(4, 2) NOT NULL,     -- دهون محمية
    sodium_bicarbonate_grams INT NOT NULL,           -- بيكربونات الصوديوم لمعادلة حموضة الكرش
    
    -- Water & Cooling Protocols
    water_intake_liters_day NUMERIC(6, 2) NOT NULL,
    cooling_misting_fan_cycle_active BOOLEAN NOT NULL DEFAULT TRUE,
    predicted_yield_mitigation_liters NUMERIC(4, 2) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_logs_farm_date ON feed_logs (farm_id, recorded_at);
CREATE INDEX idx_feed_logs_thi ON feed_logs (thi_index);

-- ============================================================================
-- TABLE 5: qr_traceability
-- Cryptographically signed Farm-to-Fork passports linking raw milk batches
-- and meat shipments directly to RFID cow origin, PostGIS coordinates, and lab tests.
-- ============================================================================
CREATE TABLE IF NOT EXISTS qr_traceability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code VARCHAR(64) NOT NULL UNIQUE,          -- e.g. 'SOL-BATCH-DZ-2026-0927-MK'
    token_hash VARCHAR(128) NOT NULL UNIQUE,         -- HMAC-SHA256 signature
    product_type VARCHAR(64) NOT NULL,               -- 'A-Grade Raw Milk', 'Certified Beef'
    
    farm_id VARCHAR(64) NOT NULL,
    farm_name VARCHAR(128) NOT NULL,
    farm_wilaya VARCHAR(64) NOT NULL,
    farm_geom GEOMETRY(Point, 4326) NOT NULL,        -- PostGIS origin coordinates
    
    airlift_flight_ref VARCHAR(32) NOT NULL,         -- Lineage flight number
    usda_cert_ref VARCHAR(64) NOT NULL,
    contributing_rfid_tags TEXT[] NOT NULL,          -- Array of cow RFID chips
    cow_count INT NOT NULL,
    volume_liters NUMERIC(8, 2) NOT NULL,
    collection_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Laboratory Chemical & Biological Metrics
    fat_percentage NUMERIC(4, 2) NOT NULL,           -- e.g. 3.85%
    protein_percentage NUMERIC(4, 2) NOT NULL,       -- e.g. 3.28%
    lactose_percentage NUMERIC(4, 2) NOT NULL,       -- e.g. 4.80%
    ph_level NUMERIC(3, 2) NOT NULL,                 -- e.g. 6.65
    acidity_dornic NUMERIC(4, 2) NOT NULL,           -- e.g. 15.5 °D
    somatic_cell_count INT NOT NULL,                 -- e.g. 110,000 / ml
    antibiotic_residue_negative BOOLEAN NOT NULL DEFAULT TRUE,
    cold_chain_temp_c NUMERIC(4, 2) NOT NULL DEFAULT 3.8,
    
    destination_plant VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_trace_geom ON qr_traceability USING GIST (farm_geom);
CREATE INDEX idx_qr_trace_batch ON qr_traceability (batch_code);
CREATE INDEX idx_qr_trace_token ON qr_traceability (token_hash);

-- ============================================================================
-- Spatial Query Helper Functions & PostGIS Views
-- ============================================================================

-- Function: Compute distance between quarantine airport and mega-farm in kilometers
CREATE OR REPLACE FUNCTION calculate_quarantine_transfer_distance_km(
    flight_dest_code VARCHAR(8), 
    farm_wilaya_name VARCHAR(64)
) 
RETURNS NUMERIC AS $$
DECLARE
    distance_meters DOUBLE PRECISION;
BEGIN
    SELECT ST_DistanceSphere(a.destination_geom, l.location_geom)
    INTO distance_meters
    FROM airlift_shipments a
    CROSS JOIN livestock l
    WHERE a.destination_airport_code = flight_dest_code
      AND l.current_wilaya = farm_wilaya_name
    LIMIT 1;

    RETURN ROUND((distance_meters / 1000.0)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- View: Real-time Livestock Herd Production & Thermal Alert Dashboard
CREATE OR REPLACE VIEW view_herd_wilaya_summary AS
SELECT 
    l.current_wilaya,
    COUNT(l.id) AS total_head_count,
    ROUND(AVG(l.average_milk_yield_liters), 2) AS avg_milk_yield_liters,
    ROUND(AVG(l.health_score), 1) AS avg_health_score,
    COUNT(CASE WHEN l.quarantine_status = 'quarantine_holding' THEN 1 END) AS in_quarantine_count,
    COUNT(CASE WHEN l.quarantine_status = 'quarantine_cleared' THEN 1 END) AS cleared_herd_count,
    ST_Centroid(ST_Collect(l.location_geom)) AS wilaya_herd_centroid
FROM livestock l
GROUP BY l.current_wilaya;
