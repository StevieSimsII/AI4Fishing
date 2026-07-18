# InshoreIQ Next Steps Checklist

Use this in order.

## Already done

- [x] Confirm web-first POC direction
- [x] Scaffold Next.js app, Azure Functions package, shared domain/scoring modules, and repo structure
- [x] Add pilot seed geography and species knowledge
- [x] Build deterministic scoring engine and recommendation APIs
- [x] Ship the first dashboard UI and Postgres/PostGIS baseline schema

## Phase 1: Live environmental ingestion

### 0. Lock in provider choices
- [x] Use **Windy Point Forecast API** for weather inputs
- [x] Use **NOAA CO-OPS Tides & Currents API** for tide predictions and water levels
- [x] Use **NOAA NBS/NCEI bathymetry** as the primary public depth source
- [x] Use **USACE open data / survey layers** as the supplemental source for channels and local hydro data

### 1. Create adapter modules
- [x] Add a **Windy** weather adapter in `functions\src\` for wind, temperature, pressure, and cloud cover
- [x] Add a **NOAA CO-OPS** tides adapter in `functions\src\` for tide movement, stage, timing, and station metadata
- [x] Add a solunar adapter in `functions\src\` for moon phase and major/minor periods
- [ ] Add a bathymetry ingestion module for **NOAA NBS/NCEI** depth layers
- [ ] Add a supplemental depth/channel ingestion module for **USACE** GIS layers
- [x] Define required environment variables in `functions\local.settings.sample.json`, including the Windy API key/config values

### 2. Normalize the live payload
- [x] Update `shared\domain\types.ts` with the final live snapshot shape
- [x] Create a single normalized environmental snapshot contract shared by web and functions
- [x] Map Windy fields into the shared weather snapshot shape used by scoring
- [x] Map NOAA CO-OPS tide responses into the shared tide snapshot shape used by scoring
- [ ] Define the internal depth/contour model used to turn NOAA/USACE GIS data into fishing zones
- [x] Keep the scoring engine interface stable so the UI does not need to change

### 3. Add caching and persistence
- [x] Add a snapshot service in `functions\src\` that fetches and stores current conditions
- [x] Cache external API responses so recommendation requests do not call providers every time
- [ ] Store snapshots using the `environmental_snapshots` table shape in `infra\postgres\001_init.sql`
- [x] Decide and implement cache TTLs for weather, tides, and solunar data
- [ ] Preprocess NOAA/USACE depth layers into reusable zone/structure records instead of querying raw GIS data on every request

### 4. Replace seed-backed reads
- [x] Remove the hard dependency on `data\seed\environment.ts` for runtime requests
- [x] Update `shared\scoring\service.ts` to consume live snapshots
- [x] Wire `dashboard`, `recommendations`, `map`, and `windows` responses to live data
- [x] Keep a safe local fallback only if live providers are unavailable during development

### 5. Verify the live flow
- [x] Confirm all four API endpoints still return the expected response shape
- [x] Add a local Node API server so the dashboard can run without Azure Functions Core Tools
- [x] Harden local settings so placeholder Postgres/CORS values do not break requests
- [ ] Confirm the dashboard still renders with live conditions in a browser
- [x] Confirm builds and lint pass after ingestion is wired in

## Phase 2: Explanations and telemetry

### 6. Explanation generation
- [x] Add an explanation service for turning structured rationale into cleaner natural-language output
- [x] Use Azure OpenAI only for explanation wording, not for core scoring
- [x] Keep the deterministic reason inputs available alongside generated text

### 7. Telemetry and pilot tracking
- [x] Log recommendation requests with area, timestamp, and selected species
- [x] Log the top returned spots and confidence scores for each request
- [ ] Add basic success metrics for pilot usage and recommendation engagement
- [ ] Define what should be stored now versus later for user-specific analytics

## Deployment prep

- [x] Convert the frontend to a static GitHub Pages-friendly app that fetches Azure Functions directly
- [x] Add GitHub Pages deployment workflow
- [x] Add frontend API base URL environment template
- [x] Add Functions CORS and Postgres/Azure OpenAI config placeholders

## Suggested file focus for the next coding pass

- `functions\src\...` for live adapters and orchestration
- `functions\local.settings.sample.json` for Windy and other provider config
- `shared\domain\types.ts` for normalized snapshot types
- `shared\scoring\service.ts` for replacing seed-backed reads
- `data\seed\` or a new ingestion/output folder for preprocessed depth and zone data
- `infra\postgres\001_init.sql` for any storage changes

## Definition of done for the next milestone

- [x] Live weather, tide, and solunar data feed the recommendation engine
- [x] Public bathymetry/depth sources are selected and mapped into usable zone data
- [x] Runtime requests no longer depend on static environmental seed data
- [ ] Web dashboard and API responses remain stable
- [x] The repo still builds cleanly end to end
