import { CURRENT_ENVIRONMENT, HOURLY_FORECAST } from "../../data/seed/environment";
import { getPilotAreaConfig } from "../../data/seed/pilot-areas";
import type {
  DashboardSnapshot,
  EnvironmentalSnapshot,
  ForecastWindowSeed,
  RecommendationQuery,
  Season,
  TideMovement,
  TideStage,
  TimeOfDay,
  WindDirection,
} from "../domain";
import {
  getDashboardSnapshot,
  getFishingWindowsResponse,
  getMapOverlayResponse,
  getRecommendationsResponse,
} from "./service";

interface WindyResponse {
  hours?: Array<number | string>;
  ts?: Array<number | string>;
  forecast?: Record<string, unknown>;
  [key: string]: unknown;
}

interface WeatherHour {
  timestamp: Date;
  windSpeedMph: number;
  windDirection: WindDirection;
  tempF: number;
  pressureMb?: number;
  cloudCoverPercent: number;
}

interface TidePrediction {
  timestamp: Date;
  valueFeet: number;
}

interface LiveEnvironmentalBundle {
  environment: EnvironmentalSnapshot;
  windows: ForecastWindowSeed[];
}

const LIVE_CACHE = new Map<string, { expiresAt: number; value: LiveEnvironmentalBundle }>();
const LIVE_CACHE_TTL_MS = 15 * 60 * 1000;
const NOAA_DEFAULT_BASE_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/";
const WINDY_POINT_FORECAST_URL = "https://api.windy.com/api/point-forecast/v2";

function readArray(source: Record<string, unknown>, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const direct = source[key];
    if (Array.isArray(direct)) {
      return direct;
    }
  }

  for (const [key, value] of Object.entries(source)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const normalized = key.toLowerCase();
    if (keys.some((candidate) => normalized === candidate.toLowerCase())) {
      return value;
    }
  }

  return undefined;
}

function toDate(value: number | string): Date {
  if (typeof value === "number") {
    return new Date(value > 9999999999 ? value : value * 1000);
  }

  return new Date(value);
}

function toWindDirection(degrees: number): WindDirection {
  const directions: WindDirection[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

function mphFromMps(value: number): number {
  return value * 2.23694;
}

function fahrenheitFromCelsius(value: number): number {
  return value * (9 / 5) + 32;
}

function deriveWindFromComponents(u: number, v: number): { speedMph: number; direction: WindDirection } {
  const speedMps = Math.sqrt(u * u + v * v);
  const directionDegrees = (Math.atan2(-u, -v) * 180) / Math.PI;
  return {
    speedMph: mphFromMps(speedMps),
    direction: toWindDirection(directionDegrees),
  };
}

function detectSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return "spring";
  }
  if (month >= 6 && month <= 8) {
    return "summer";
  }
  if (month >= 9 && month <= 11) {
    return "fall";
  }
  return "winter";
}

function detectTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour < 5) {
    return "pre-dawn";
  }
  if (hour < 8) {
    return "sunrise";
  }
  if (hour < 11) {
    return "morning";
  }
  if (hour < 15) {
    return "midday";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeRecentWeather(hour: WeatherHour): string {
  return `Windy forecast shows ${hour.windDirection} wind near ${Math.round(hour.windSpeedMph)} mph with ${Math.round(hour.cloudCoverPercent)}% cloud cover.`;
}

function moonPhaseFraction(date: Date): number {
  const lunarMonth = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSinceKnownNewMoon = (date.getTime() - knownNewMoon) / 86400000;
  const normalized = ((daysSinceKnownNewMoon % lunarMonth) + lunarMonth) % lunarMonth;
  return normalized / lunarMonth;
}

function moonPhaseLabel(date: Date): string {
  const phase = moonPhaseFraction(date);

  if (phase < 0.03 || phase > 0.97) {
    return "New moon";
  }
  if (phase < 0.22) {
    return "Waxing crescent";
  }
  if (phase < 0.28) {
    return "First quarter";
  }
  if (phase < 0.47) {
    return "Waxing gibbous";
  }
  if (phase < 0.53) {
    return "Full moon";
  }
  if (phase < 0.72) {
    return "Waning gibbous";
  }
  if (phase < 0.78) {
    return "Last quarter";
  }
  return "Waning crescent";
}

function calculateSolunarScore(date: Date, tideMovement: TideMovement): number {
  const phase = moonPhaseFraction(date);
  const timeOfDay = detectTimeOfDay(date);
  const moonBoost = Math.max(0, 1 - Math.abs(phase - 0.5) * 1.7);
  const moonScore = 50 + moonBoost * 28;
  const timeBoost =
    timeOfDay === "sunrise" || timeOfDay === "pre-dawn"
      ? 16
      : timeOfDay === "morning" || timeOfDay === "evening"
        ? 10
        : 4;
  const tideBoost = tideMovement === "slack" ? 2 : 10;
  return Math.max(35, Math.min(96, Math.round(moonScore + timeBoost + tideBoost)));
}

function extractTimestamps(response: WindyResponse): Date[] {
  const candidates = [response.hours, response.ts];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map(toDate).filter((value) => !Number.isNaN(value.getTime()));
    }
  }

  throw new Error("Windy response did not include forecast timestamps.");
}

function extractWindyHours(payload: WindyResponse): WeatherHour[] {
  const timestamps = extractTimestamps(payload);
  const container = (payload.forecast ?? payload) as Record<string, unknown>;

  const temperatureSeries = readArray(container, ["temp-surface", "temp"]);
  const pressureSeries = readArray(container, ["pressure-surface", "pressure"]);
  const cloudSeries = readArray(container, ["cloudcover-surface", "cloudcover"]);
  const windSeries = readArray(container, ["wind-surface", "wind"]);
  const uSeries = readArray(container, ["UGRD-surface", "UGRD", "wind_u-surface", "wind_u"]);
  const vSeries = readArray(container, ["VGRD-surface", "VGRD", "wind_v-surface", "wind_v"]);

  return timestamps
    .map((timestamp, index) => {
      let windSpeedMph = 0;
      let windDirection: WindDirection = "N";

      const windPoint = windSeries?.[index];
      if (windPoint && typeof windPoint === "object" && windPoint !== null) {
        const speed = Number((windPoint as { speed?: unknown }).speed ?? 0);
        const direction = Number((windPoint as { dir?: unknown }).dir ?? 0);
        windSpeedMph = speed > 0 ? mphFromMps(speed) : 0;
        windDirection = toWindDirection(direction);
      } else if (uSeries?.[index] != null && vSeries?.[index] != null) {
        const derived = deriveWindFromComponents(Number(uSeries[index]), Number(vSeries[index]));
        windSpeedMph = derived.speedMph;
        windDirection = derived.direction;
      }

      const tempC = Number(temperatureSeries?.[index] ?? 0);
      const pressureMb = pressureSeries?.[index] != null ? Number(pressureSeries[index]) : undefined;
      const cloudCoverPercent = Number(cloudSeries?.[index] ?? 0);

      return {
        timestamp,
        windSpeedMph: Math.round(windSpeedMph),
        windDirection,
        tempF: Math.round(fahrenheitFromCelsius(tempC)),
        pressureMb: pressureMb ? Math.round(pressureMb) : undefined,
        cloudCoverPercent: Math.round(cloudCoverPercent),
      };
    })
    .filter((hour) => !Number.isNaN(hour.tempF));
}

function buildNoaaUrl(stationId: string, beginDate: Date, endDate: Date): string {
  const baseUrl = process.env.NOAA_COOPS_BASE_URL || NOAA_DEFAULT_BASE_URL;
  const url = new URL("datagetter", baseUrl);

  const formatDate = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
  };

  url.searchParams.set("begin_date", formatDate(beginDate));
  url.searchParams.set("end_date", formatDate(endDate));
  url.searchParams.set("station", stationId);
  url.searchParams.set("product", "predictions");
  url.searchParams.set("datum", "MLLW");
  url.searchParams.set("interval", "h");
  url.searchParams.set("units", "english");
  url.searchParams.set("time_zone", "lst_ldt");
  url.searchParams.set("format", "json");
  return url.toString();
}

function parseTidePredictions(payload: unknown): TidePrediction[] {
  const predictions = Array.isArray((payload as { predictions?: unknown[] })?.predictions)
    ? ((payload as { predictions: Array<{ t: string; v: string }> }).predictions ?? [])
    : [];

  return predictions
    .map((prediction) => ({
      timestamp: new Date(prediction.t),
      valueFeet: Number(prediction.v),
    }))
    .filter(
      (prediction) =>
        !Number.isNaN(prediction.timestamp.getTime()) && !Number.isNaN(prediction.valueFeet),
    );
}

function findClosestIndex<T>(items: T[], readTime: (item: T) => number, target: number): number {
  return items.reduce((bestIndex, item, index) => {
    const currentDelta = Math.abs(readTime(item) - target);
    const bestDelta = Math.abs(readTime(items[bestIndex]) - target);
    return currentDelta < bestDelta ? index : bestIndex;
  }, 0);
}

function deriveTideMovement(current: TidePrediction, prev?: TidePrediction, next?: TidePrediction): TideMovement {
  if (!prev || !next) {
    return "slack";
  }

  const backwardDelta = current.valueFeet - prev.valueFeet;
  const forwardDelta = next.valueFeet - current.valueFeet;
  const averageDelta = (backwardDelta + forwardDelta) / 2;

  if (Math.abs(averageDelta) < 0.05) {
    return "slack";
  }

  return averageDelta > 0 ? "incoming" : "outgoing";
}

function deriveTideStage(predictions: TidePrediction[], currentValue: number): TideStage {
  const values = predictions.map((prediction) => prediction.valueFeet);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range <= 0.01) {
    return "mid";
  }

  const ratio = (currentValue - min) / range;
  if (ratio <= 0.33) {
    return "low";
  }
  if (ratio >= 0.67) {
    return "high";
  }
  return "mid";
}

function toForecastWindow(
  hour: WeatherHour,
  tidePredictions: TidePrediction[],
  windowIndex: number,
): ForecastWindowSeed {
  const closestIndex = findClosestIndex(
    tidePredictions,
    (prediction) => prediction.timestamp.getTime(),
    hour.timestamp.getTime(),
  );
  const currentTide = tidePredictions[closestIndex];
  const prevTide = tidePredictions[Math.max(0, closestIndex - 1)];
  const nextTide = tidePredictions[Math.min(tidePredictions.length - 1, closestIndex + 1)];
  const tideMovement = deriveTideMovement(currentTide, prevTide, nextTide);
  const tideStage = deriveTideStage(tidePredictions, currentTide.valueFeet);
  const solunarScore = calculateSolunarScore(hour.timestamp, tideMovement);

  return {
    timeLabel: formatTimeLabel(hour.timestamp),
    timeOfDay: detectTimeOfDay(hour.timestamp),
    tideMovement,
    tideStage,
    solunarScore,
    windSpeedMph: hour.windSpeedMph,
    notes:
      windowIndex === 0
        ? `Live ${tideMovement} tide with ${hour.windDirection} wind around ${hour.windSpeedMph} mph.`
        : `${tideMovement} tide and ${hour.windDirection} wind near ${hour.windSpeedMph} mph.`,
  };
}

function isConfiguredSecret(value?: string | null): boolean {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return ![
    "replace_with",
    "replace-with",
    "your_",
    "your-",
    "changeme",
    "todo",
    "xxx",
  ].some((marker) => lowered.includes(marker));
}

async function fetchWindyWeather(area: ReturnType<typeof getPilotAreaConfig>): Promise<WeatherHour[]> {
  const apiKey = process.env.WINDY_API_KEY?.trim();
  if (!isConfiguredSecret(apiKey) || !apiKey) {
    throw new Error("WINDY_API_KEY is not configured.");
  }

  const response = await fetch(WINDY_POINT_FORECAST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      lat: area.center.lat,
      lon: area.center.lng,
      model: area.windyModel,
      parameters: ["wind", "temp", "pressure", "cloudcover"],
      levels: ["surface"],
      key: apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Windy request failed with status ${response.status}.`);
  }

  return extractWindyHours((await response.json()) as WindyResponse);
}

async function fetchNoaaTides(area: ReturnType<typeof getPilotAreaConfig>): Promise<TidePrediction[]> {
  const beginDate = new Date();
  const endDate = new Date(beginDate.getTime() + 24 * 60 * 60 * 1000);
  const response = await fetch(buildNoaaUrl(area.noaaStation.id, beginDate, endDate));

  if (!response.ok) {
    throw new Error(`NOAA CO-OPS request failed with status ${response.status}.`);
  }

  return parseTidePredictions(await response.json());
}

function buildFallbackEnvironment(reason: string): EnvironmentalSnapshot {
  return {
    ...CURRENT_ENVIRONMENT,
    dataSources: [
      {
        name: "Seed fallback",
        type: "fallback",
        url: "local-seed-data",
        detail: reason,
      },
    ],
    depthSourceNotes: [
      "Pilot depth ranges remain curated from NOAA NBS/NCEI and USACE-backed zone modeling.",
    ],
  };
}

function weatherHoursFromSeed(): WeatherHour[] {
  const baseTime = new Date();
  return HOURLY_FORECAST.map((window, index) => {
    const timestamp = new Date(baseTime.getTime() + index * 60 * 60 * 1000);
    return {
      timestamp,
      windSpeedMph: window.windSpeedMph,
      windDirection: CURRENT_ENVIRONMENT.windDirection,
      tempF: CURRENT_ENVIRONMENT.waterTempF,
      pressureMb: CURRENT_ENVIRONMENT.pressureMb,
      cloudCoverPercent: CURRENT_ENVIRONMENT.cloudCoverPercent ?? 35,
    };
  });
}

function tidePredictionsFromSeed(): TidePrediction[] {
  const baseTime = new Date();
  return HOURLY_FORECAST.map((window, index) => {
    const stageOffset =
      window.tideStage === "high" ? 1.4 : window.tideStage === "low" ? 0.2 : 0.8;
    const movementOffset =
      window.tideMovement === "incoming" ? index * 0.08 : window.tideMovement === "outgoing" ? -index * 0.08 : 0;
    return {
      timestamp: new Date(baseTime.getTime() + index * 60 * 60 * 1000),
      valueFeet: Number((stageOffset + movementOffset).toFixed(2)),
    };
  });
}

async function settledValue<T>(promise: Promise<T>, label: string): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await promise };
  } catch (error) {
    const detail = error instanceof Error ? error.message : `Unknown ${label} error.`;
    console.warn(`[live-service] ${label} unavailable: ${detail}`);
    return { error: detail };
  }
}

function buildLiveEnvironment(
  area: ReturnType<typeof getPilotAreaConfig>,
  currentHour: WeatherHour,
  tidePredictions: TidePrediction[],
): EnvironmentalSnapshot {
  const closestIndex = findClosestIndex(
    tidePredictions,
    (prediction) => prediction.timestamp.getTime(),
    currentHour.timestamp.getTime(),
  );
  const currentTide = tidePredictions[closestIndex];
  const prevTide = tidePredictions[Math.max(0, closestIndex - 1)];
  const nextTide = tidePredictions[Math.min(tidePredictions.length - 1, closestIndex + 1)];
  const tideMovement = deriveTideMovement(currentTide, prevTide, nextTide);
  const tideStage = deriveTideStage(tidePredictions, currentTide.valueFeet);
  const observedAt = currentHour.timestamp.toISOString();

  return {
    area: area.area,
    observedAt,
    label: `Current conditions as of ${formatTimeLabel(currentHour.timestamp)}`,
    windDirection: currentHour.windDirection,
    windSpeedMph: currentHour.windSpeedMph,
    pressureMb: currentHour.pressureMb,
    tideMovement,
    tideStage,
    tideStation: area.noaaStation,
    season: detectSeason(currentHour.timestamp),
    timeOfDay: detectTimeOfDay(currentHour.timestamp),
    waterTempF: currentHour.tempF,
    recentWeather: describeRecentWeather(currentHour),
    moonPhase: moonPhaseLabel(currentHour.timestamp),
    solunarScore: calculateSolunarScore(currentHour.timestamp, tideMovement),
    cloudCoverPercent: currentHour.cloudCoverPercent,
    dataSources: area.dataSources,
    depthSourceNotes: [
      "Depth ranges in scoring still come from curated pilot zones tied to NOAA NBS/NCEI bathymetry and USACE hydro layers.",
    ],
  };
}

async function buildLiveEnvironmentalBundle(areaName?: string): Promise<LiveEnvironmentalBundle> {
  const area = getPilotAreaConfig(areaName);
  const cached = LIVE_CACHE.get(area.key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const [weatherResult, tideResult] = await Promise.all([
    settledValue(fetchWindyWeather(area), "Windy weather"),
    settledValue(fetchNoaaTides(area), "NOAA tides"),
  ]);

  const weatherHours =
    weatherResult.value && weatherResult.value.length > 0
      ? weatherResult.value
      : weatherHoursFromSeed();
  const tidePredictions =
    tideResult.value && tideResult.value.length >= 3
      ? tideResult.value
      : tidePredictionsFromSeed();

  const liveWeather = Boolean(weatherResult.value && weatherResult.value.length > 0);
  const liveTides = Boolean(tideResult.value && tideResult.value.length >= 3);

  if (!liveWeather && !liveTides) {
    const detail = [weatherResult.error, tideResult.error].filter(Boolean).join(" ");
    return {
      environment: buildFallbackEnvironment(
        detail || "Live providers unavailable; using seed environmental snapshot.",
      ),
      windows: HOURLY_FORECAST,
    };
  }

  const upcomingWeatherHours = weatherHours.slice(0, 6);
  const currentHour = upcomingWeatherHours[0];
  const environment = buildLiveEnvironment(area, currentHour, tidePredictions);
  const providerNotes = [
    liveWeather ? "Windy Point Forecast" : `Weather seed fallback (${weatherResult.error ?? "missing"})`,
    liveTides ? "NOAA CO-OPS tides" : `Tide seed fallback (${tideResult.error ?? "missing"})`,
  ];

  environment.dataSources = [
    ...(liveWeather || liveTides
      ? area.dataSources.filter((source) => {
          if (source.type === "weather") {
            return liveWeather;
          }
          if (source.type === "tide") {
            return liveTides;
          }
          return true;
        })
      : []),
    ...(!liveWeather || !liveTides
      ? [
          {
            name: "Partial seed fallback",
            type: "fallback" as const,
            url: "local-seed-data",
            detail: providerNotes.join("; "),
          },
        ]
      : []),
  ];

  const windows = upcomingWeatherHours.map((hour, index) =>
    toForecastWindow(hour, tidePredictions, index),
  );
  const bundle = { environment, windows };

  LIVE_CACHE.set(area.key, {
    expiresAt: Date.now() + LIVE_CACHE_TTL_MS,
    value: bundle,
  });

  return bundle;
}

export async function getRecommendationsResponseLive(query: RecommendationQuery = {}) {
  const liveData = await buildLiveEnvironmentalBundle(query.area);
  return getRecommendationsResponse(query, liveData.environment);
}

export async function getMapOverlayResponseLive(query: RecommendationQuery = {}) {
  const liveData = await buildLiveEnvironmentalBundle(query.area);
  return getMapOverlayResponse(query, liveData.environment);
}

export async function getFishingWindowsResponseLive(query: RecommendationQuery = {}) {
  const liveData = await buildLiveEnvironmentalBundle(query.area);
  return getFishingWindowsResponse(query, liveData.windows, liveData.environment);
}

export async function getDashboardSnapshotLive(
  query: RecommendationQuery = {},
): Promise<DashboardSnapshot> {
  const liveData = await buildLiveEnvironmentalBundle(query.area);
  return getDashboardSnapshot(query, liveData.environment, liveData.windows);
}

