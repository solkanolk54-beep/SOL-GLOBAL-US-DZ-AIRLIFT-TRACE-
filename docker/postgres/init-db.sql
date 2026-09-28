-- ==============================================================================
-- SOL Global / US-DZ Airlift & Livestock Trace Platform
-- PostgreSQL 15 + PostGIS Spatial Schema & Initial Seed
-- ==============================================================================

-- 1. Enable Spatial and UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Set timezone to Algeria (UTC+1)
SET TIME ZONE 'Africa/Algiers';

-- ==============================================================================
-- 2. Facilities & Agro-Industrial Zones (Polygon / Spatial Boundaries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS spatial_facilities (
    id VARCHAR(64) PRIMARY KEY,
    facility_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(64) NOT NULL, -- 'mega_dairy_complex', 'quarantine_terminal', 'feedlot_pivot'
    wilaya VARCHAR(64) NOT NULL,
    capacity_heads INTEGER NOT NULL DEFAULT 5000,
    boundary_polygon GEOMETRY(Polygon, 4326),
    centroid_location GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facilities_polygon ON spatial_facilities USING GIST (boundary_polygon);
CREATE INDEX IF NOT EXISTS idx_facilities_centroid ON spatial_facilities USING GIST (centroid_location);

-- ==============================================================================
-- 3. Airlift Flights & USDA Veterinary Clearance
-- ==============================================================================
CREATE TABLE IF NOT EXISTS airlift_shipments (
    flight_id VARCHAR(64) PRIMARY KEY,
    flight_number VARCHAR(64) NOT NULL,
    aircraft_type VARCHAR(128) NOT NULL DEFAULT 'Boeing 747-400F Livestock Cargo',
    origin_airport VARCHAR(128) NOT NULL, -- e.g., 'Austin-Bergstrom International (AUS)'
    origin_state VARCHAR(64) NOT NULL DEFAULT 'Texas',
    destination_airport VARCHAR(128) NOT NULL, -- e.g., 'Adrar Touat Cheikh Sidi Mohamed Belkebir (AZR)'
    destination_wilaya VARCHAR(64) NOT NULL DEFAULT 'Adrar',
    heads_on_board INTEGER NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'in_flight',
    usda_health_cert_no VARCHAR(128) NOT NULL,
    usda_verified BOOLEAN NOT NULL DEFAULT FALSE,
    cargo_hold_temp_c NUMERIC(4, 1) DEFAULT 16.5,
    cargo_hold_rh_pct NUMERIC(4, 1) DEFAULT 55.0,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. Livestock Core Registry (ISO 11784/11785 RFID & PostGIS Point)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS livestock (
    id VARCHAR(64) PRIMARY KEY,
    rfid_tag VARCHAR(64) UNIQUE NOT NULL,
    us_ear_tag VARCHAR(64) NOT NULL,
    dz_national_id VARCHAR(64) UNIQUE NOT NULL,
    breed VARCHAR(128) NOT NULL DEFAULT 'Purebred Holstein Friesian (هولشتاين أمريكي أصيل)',
    birth_date DATE NOT NULL,
    origin_state VARCHAR(64) NOT NULL DEFAULT 'Texas',
    current_wilaya VARCHAR(64) NOT NULL DEFAULT 'Adrar',
    farm_id VARCHAR(64) REFERENCES spatial_facilities(id),
    barn_number VARCHAR(32) NOT NULL DEFAULT 'Barn-A',
    pen_number VARCHAR(32) NOT NULL DEFAULT 'Pen-01',
    quarantine_status VARCHAR(64) NOT NULL DEFAULT 'quarantine_holding',
    quarantine_day INTEGER NOT NULL DEFAULT 1,
    
    -- Genetic Merit Profiles (US Holstein Association Standard)
    sire_name VARCHAR(128) NOT NULL DEFAULT 'Pine-Tree Dairy Kingpin-ET',
    sire_registration VARCHAR(64) NOT NULL DEFAULT 'HOUSA72851652',
    dam_name VARCHAR(128) NOT NULL DEFAULT 'Lone-Star Superstition 4402',
    genetic_merit_tpi INTEGER NOT NULL DEFAULT 2940,
    milk_yield_genomic_potential_l NUMERIC(7, 1) NOT NULL DEFAULT 13900.0,
    genomic_inbreeding_pct NUMERIC(4, 2) NOT NULL DEFAULT 4.0,

    -- Physiological & Lactation
    current_weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 635.0,
    average_milk_yield_l NUMERIC(5, 2) NOT NULL DEFAULT 35.0,
    target_milk_yield_l NUMERIC(5, 2) NOT NULL DEFAULT 38.0,
    lactation_number INTEGER NOT NULL DEFAULT 1,
    days_in_milk INTEGER NOT NULL DEFAULT 42,
    pregnancy_status VARCHAR(64) NOT NULL DEFAULT 'confirmed_pregnant',
    health_score INTEGER NOT NULL DEFAULT 96,
    rumination_min_day INTEGER NOT NULL DEFAULT 530,
    activity_index INTEGER NOT NULL DEFAULT 102,

    -- Spatial Geolocation Point
    gps_location GEOMETRY(Point, 4326),
    last_scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_livestock_rfid ON livestock (rfid_tag);
CREATE INDEX IF NOT EXISTS idx_livestock_dz_id ON livestock (dz_national_id);
CREATE INDEX IF NOT EXISTS idx_livestock_gps ON livestock USING GIST (gps_location);

-- ==============================================================================
-- 5. IoT Sensor Telemetry (Smart Collars & Soil TDR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS iot_collar_telemetry (
    id BIGSERIAL PRIMARY KEY,
    rfid_tag VARCHAR(64) NOT NULL REFERENCES livestock(rfid_tag) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    ambient_temp_c NUMERIC(4, 1) NOT NULL,
    relative_humidity_pct NUMERIC(4, 1) NOT NULL,
    thi_index NUMERIC(4, 1) NOT NULL,
    cooling_alert_active BOOLEAN NOT NULL DEFAULT FALSE,
    rumination_minutes INTEGER NOT NULL,
    activity_index INTEGER NOT NULL,
    battery_level_pct INTEGER NOT NULL DEFAULT 95,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collar_tag_time ON iot_collar_telemetry (rfid_tag, recorded_at DESC);

CREATE TABLE IF NOT EXISTS iot_soil_telemetry (
    id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(64) NOT NULL,
    zone_id VARCHAR(64) NOT NULL,
    crop_type VARCHAR(64) NOT NULL DEFAULT 'Alfalfa (برسيم حجازي)',
    volumetric_water_content_pct NUMERIC(4, 1) NOT NULL,
    electrical_conductivity_ds_m NUMERIC(4, 2) NOT NULL,
    root_zone_temp_c NUMERIC(4, 1) NOT NULL,
    irrigation_status VARCHAR(32) NOT NULL DEFAULT 'OPTIMAL',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. Farm-to-Fork Cryptographic Digital Passports
-- ==============================================================================
CREATE TABLE IF NOT EXISTS digital_passports (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(128) UNIQUE NOT NULL,
    batch_id VARCHAR(128) NOT NULL,
    product_type VARCHAR(64) NOT NULL,
    cow_rfid_list TEXT[] NOT NULL,
    farm_id VARCHAR(64) NOT NULL,
    volume_liters NUMERIC(8, 2) NOT NULL,
    destination_plant VARCHAR(128) NOT NULL,
    verification_hash VARCHAR(255) NOT NULL,
    inspected_by VARCHAR(255) NOT NULL DEFAULT 'SOL Global Traceability Auditor & Algerian Ministry of Agriculture',
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. Initial Seed Data
-- ==============================================================================

-- Seed Mega-Dairy Facility in Adrar with PostGIS Polygon
INSERT INTO spatial_facilities (id, facility_name, facility_type, wilaya, capacity_heads, centroid_location, boundary_polygon)
VALUES (
    'DZ-FARM-ADRAR-01',
    'Adrar Mega-Dairy Oasis Complex (المركب الصحراوي النموذجي بأدرار)',
    'mega_dairy_complex',
    'Adrar',
    10000,
    ST_SetSRID(ST_MakePoint(-0.2241, 27.9124), 4326),
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-0.2300 27.9100, -0.2180 27.9100, -0.2180 27.9150, -0.2300 27.9150, -0.2300 27.9100)')), 4326)
) ON CONFLICT (id) DO NOTHING;

-- Seed Airlift Shipment
INSERT INTO airlift_shipments (
    flight_id, flight_number, aircraft_type, origin_airport, origin_state,
    destination_airport, destination_wilaya, heads_on_board, status,
    usda_health_cert_no, usda_verified, cargo_hold_temp_c, cargo_hold_rh_pct,
    departure_time, estimated_arrival
) VALUES (
    'flight_tx_001',
    'SOL-AF-109-TX01',
    'Boeing 747-400F Livestock Cargo (Texas Skyway)',
    'Austin-Bergstrom International Airport (AUS)',
    'Texas',
    'Adrar Touat Cheikh Sidi Mohamed Belkebir (AZR)',
    'Adrar',
    185,
    'arrived_cleared',
    'USDA-APHIS-VET-2026-TX-90412',
    TRUE,
    16.8,
    52.0,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
) ON CONFLICT (flight_id) DO NOTHING;

-- Seed Initial Purebred Holstein Cattle
INSERT INTO livestock (
    id, rfid_tag, us_ear_tag, dz_national_id, farm_id, barn_number, pen_number,
    quarantine_status, quarantine_day, current_weight_kg, average_milk_yield_l,
    genetic_merit_tpi, gps_location
) VALUES
(
    'cow_001',
    'RFID-CTL-9021',
    'USA-TX-2024-9021',
    'DZ-ADR-01-0001',
    'DZ-FARM-ADRAR-01',
    'Barn-A',
    'Pen-01',
    'quarantine_holding',
    3,
    642.0,
    37.5,
    2985,
    ST_SetSRID(ST_MakePoint(-0.2241, 27.9124), 4326)
),
(
    'cow_002',
    'RFID-CTL-9022',
    'USA-TX-2024-9022',
    'DZ-ADR-01-0002',
    'DZ-FARM-ADRAR-01',
    'Barn-A',
    'Pen-02',
    'quarantine_holding',
    3,
    630.0,
    36.0,
    2940,
    ST_SetSRID(ST_MakePoint(-0.2238, 27.9127), 4326)
) ON CONFLICT (id) DO NOTHING;
