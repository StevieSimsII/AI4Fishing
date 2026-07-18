# InshoreIQ POC

InshoreIQ is a web-first proof of concept for a Louisiana inshore fishing intelligence platform. The current build uses a static Next.js frontend for GitHub Pages, Azure Functions for live environmental APIs, deterministic scoring, optional Azure OpenAI explanations, and telemetry-ready persistence hooks for Postgres.

## Repository layout

- `web/` - Next.js dashboard UI
- `functions/` - Azure Functions API + local Node API server
- `shared/` - shared domain models and scoring engine
- `data/` - pilot geography, fishing knowledge, and forecast seed data
- `infra/` - PostgreSQL/PostGIS baseline schema and local infrastructure

## What the current prototype includes

- Top 5 fishing recommendations for the Delacroix pilot area
- Confidence-scored opportunity map
- Hourly fishing window forecast
- Optional Azure OpenAI-enhanced explanation strings with deterministic fallback
- Live Windy + NOAA ingestion with 15-minute caching and seed fallback
- Telemetry headers and Postgres-ready request logging
- Shared scoring logic reused by both the frontend contracts and Azure Functions

## Quick start (local, no Azure tooling required)

```bash
# 1) Install deps and create functions/local.settings.json
npm run setup

# 2) Start the API on http://localhost:7071/api
npm run dev:api

# 3) In another terminal, start the web app
npm run dev:web
```

Open `http://localhost:3000`. The web app defaults to `http://localhost:7071/api` on localhost.

Optional smoke check while the API is running:

```bash
npm run smoke:api
```

### Local API notes

- `npm run dev:api` builds the Functions package and starts a plain Node HTTP server that exposes the same `/api/*` routes.
- Copying `functions/local.settings.sample.json` creates a local-friendly config:
  - `CORS_ALLOWED_ORIGIN=*`
  - empty `POSTGRES_URL` (telemetry falls back to console logs)
  - empty `WINDY_API_KEY` (seed weather fallback; NOAA tides still attempt a live public fetch)
- Add a real `WINDY_API_KEY` when you want live weather.
- Azure Functions Core Tools (`func start`) remain optional for Azure-shaped local hosting.

## Commands

From the repository root:

```bash
npm run setup
npm run dev:api
npm run dev:web
npm run lint
npm run build
npm run smoke:api
```

## API endpoints

The API package exposes:

- `GET /api/dashboard`
- `GET /api/recommendations`
- `GET /api/map`
- `GET /api/windows`

## Selected public data providers

- **Weather:** Windy Point Forecast API
- **Tides and water levels:** NOAA CO-OPS Tides & Currents API
- **Bathymetry / depth:** NOAA NBS and NOAA NCEI bathymetry datasets
- **Supplemental channel and survey depth:** USACE open data / CorpsMap layers

## Static frontend deployment

The frontend is prepared for GitHub Pages.

1. Set a repository variable named `NEXT_PUBLIC_API_BASE_URL` to your deployed Azure Functions base URL, for example:
   - `https://your-function-app.azurewebsites.net/api`
2. Keep the live API keys only in Azure Functions / local settings.
3. The workflow at `.github/workflows/deploy-pages.yml` builds the static site and deploys `web/out` to Pages.

For local frontend development against the API, copy `web/.env.example` to `web/.env.local` and set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
```

## Function configuration

`functions/local.settings.sample.json` includes placeholders for:

- `WINDY_API_KEY`
- `NOAA_COOPS_BASE_URL`
- `NOAA_PRIMARY_STATION_ID`
- `CORS_ALLOWED_ORIGIN`
- `POSTGRES_URL`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`

Placeholder or empty secrets are ignored so local demos keep working.

## Data model direction

The current implementation is seed-data driven so the product workflow is usable immediately. The schema in `infra/postgres/001_init.sql` establishes the longer-term PostgreSQL + PostGIS storage model for:

- pilot areas
- fishing zones
- structure features
- environmental snapshots
- fishing observations
- user catches

Telemetry tables are defined in `infra/postgres/002_observability.sql`.
