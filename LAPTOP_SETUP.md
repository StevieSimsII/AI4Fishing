# InshoreIQ — What to do on your laptop

This gets the POC running locally so you can open the dashboard in a browser and see fishing recommendations.

**Repo:** https://github.com/StevieSimsII/AI4Fishing  
**PR with these changes:** https://github.com/StevieSimsII/AI4Fishing/pull/1  
**Branch:** `cursor/operational-local-demo-b489`

---

## 1. Prerequisites

Install if you do not already have them:

- **Git**
- **Node.js 22+** (includes `npm`)

Check:

```bash
node -v
npm -v
git --version
```

---

## 2. Get the code

```bash
git clone https://github.com/StevieSimsII/AI4Fishing.git
cd AI4Fishing
git fetch origin cursor/operational-local-demo-b489
git checkout cursor/operational-local-demo-b489
```

If you already cloned the repo:

```bash
cd AI4Fishing
git fetch origin
git checkout cursor/operational-local-demo-b489
git pull origin cursor/operational-local-demo-b489
```

---

## 3. One-time setup

From the repo root:

```bash
npm run setup
```

This will:

- install `functions` and `web` dependencies
- create `functions/local.settings.json` from the sample (safe local defaults)

Optional frontend env file (not required on localhost):

```bash
cp web/.env.example web/.env.local
```

`web/.env.local` can contain:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
```

---

## 4. Start the app (two terminals)

### Terminal A — API

```bash
npm run dev:api
```

You should see:

```text
[local-api] InshoreIQ API listening on http://localhost:7071/api
```

### Terminal B — Web

```bash
npm run dev:web
```

Open:

**http://localhost:3000**

---

## 5. Quick checks

With the API running:

```bash
npm run smoke:api
```

Or open these directly:

- http://localhost:7071/api/dashboard
- http://localhost:7071/api/recommendations
- http://localhost:7071/api/map
- http://localhost:7071/api/windows

Expected: JSON with top spots, map features, and hourly windows for the Delacroix cluster.

---

## 6. Optional: live weather (Windy)

Tide data already works from NOAA Shell Beach without keys.

For live weather instead of seed weather:

1. Open `functions/local.settings.json`
2. Set:

```json
"WINDY_API_KEY": "your-real-windy-key"
```

3. Restart `npm run dev:api`

Leave Azure OpenAI and Postgres empty for local demos. Empty/placeholder values are ignored on purpose.

---

## 7. What you should see in the UI

- Current conditions (wind / tide / water temp)
- Top 5 recommended spots with scores and explanations
- Opportunity map dots
- Hourly fishing windows

If the page says it cannot reach the API:

1. Confirm Terminal A is still running on port `7071`
2. Refresh http://localhost:3000
3. Confirm nothing else is bound to `7071` or `3000`

---

## 8. Common commands

| Goal | Command |
| --- | --- |
| Install / create local settings | `npm run setup` |
| Start API | `npm run dev:api` |
| Start web | `npm run dev:web` |
| Smoke-test API | `npm run smoke:api` |
| Build everything | `npm run build` |
| Lint web | `npm run lint` |

---

## 9. Notes

- You do **not** need Azure Functions Core Tools for this local path.
- Local API is a plain Node server that exposes the same `/api/*` routes.
- Without a Windy key, weather falls back to seed data; NOAA tides still load live when available.
- `functions/local.settings.json` is gitignored — keep real keys only on your machine or in Azure.

---

## 10. If something breaks

1. Re-run setup:

```bash
npm run setup
```

2. Rebuild/start API cleanly:

```bash
npm --prefix functions run build
npm --prefix functions run start:local
```

3. Confirm dashboard JSON:

```bash
curl http://localhost:7071/api/dashboard
```

If that works but the browser does not, the web app is the problem (wrong port / stale tab). If that fails, the API/settings are the problem.
