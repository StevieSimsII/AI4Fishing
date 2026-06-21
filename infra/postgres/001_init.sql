CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS pilot_areas (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    description TEXT,
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fishing_zones (
    id UUID PRIMARY KEY,
    pilot_area_id UUID NOT NULL REFERENCES pilot_areas(id),
    name TEXT NOT NULL,
    water_body TEXT NOT NULL,
    structure_type TEXT NOT NULL,
    depth_min_ft NUMERIC(5,2) NOT NULL,
    depth_max_ft NUMERIC(5,2) NOT NULL,
    centroid GEOMETRY(Point, 4326) NOT NULL,
    zone_shape GEOMETRY(Polygon, 4326),
    seasonal_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS structure_features (
    id UUID PRIMARY KEY,
    fishing_zone_id UUID NOT NULL REFERENCES fishing_zones(id),
    feature_name TEXT NOT NULL,
    feature_type TEXT NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    source_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS environmental_snapshots (
    id UUID PRIMARY KEY,
    pilot_area_id UUID NOT NULL REFERENCES pilot_areas(id),
    observed_at TIMESTAMPTZ NOT NULL,
    wind_direction TEXT NOT NULL,
    wind_speed_mph NUMERIC(5,2) NOT NULL,
    tide_stage TEXT NOT NULL,
    tide_movement TEXT NOT NULL,
    water_temp_f NUMERIC(5,2),
    moon_phase TEXT,
    solunar_score NUMERIC(5,2),
    raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS fishing_observations (
    id UUID PRIMARY KEY,
    fishing_zone_id UUID NOT NULL REFERENCES fishing_zones(id),
    species TEXT NOT NULL,
    season TEXT NOT NULL,
    tide_movement TEXT NOT NULL,
    preferred_structure TEXT NOT NULL,
    preferred_depth_ft NUMERIC(5,2),
    confidence_label TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    extracted_notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_catches (
    id UUID PRIMARY KEY,
    fishing_zone_id UUID NOT NULL REFERENCES fishing_zones(id),
    species TEXT NOT NULL,
    catch_length_in NUMERIC(5,2),
    catch_weight_lb NUMERIC(5,2),
    caught_at TIMESTAMPTZ NOT NULL,
    lure_used TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fishing_zones_centroid ON fishing_zones USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_structure_features_geometry ON structure_features USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_environmental_snapshots_observed_at ON environmental_snapshots (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_observations_species ON fishing_observations (species);

