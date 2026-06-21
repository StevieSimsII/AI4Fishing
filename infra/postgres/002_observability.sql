CREATE TABLE IF NOT EXISTS api_request_events (
    request_id UUID PRIMARY KEY,
    endpoint TEXT NOT NULL,
    area TEXT,
    species TEXT,
    request_limit INTEGER,
    generated_at TIMESTAMPTZ NOT NULL,
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    provider_status JSONB NOT NULL DEFAULT '[]'::JSONB,
    explanation_mode TEXT NOT NULL DEFAULT 'none',
    top_zone_name TEXT,
    top_score NUMERIC(6,2),
    best_window_score NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_recommendation_events (
    event_id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES api_request_events(request_id) ON DELETE CASCADE,
    recommendation_rank INTEGER NOT NULL,
    zone_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    species TEXT NOT NULL,
    score NUMERIC(6,2) NOT NULL,
    confidence_label TEXT NOT NULL,
    explanation_source TEXT NOT NULL DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_events_created_at ON api_request_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_events_endpoint ON api_request_events (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_recommendation_events_request_id ON api_recommendation_events (request_id);

