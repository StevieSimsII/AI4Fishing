import type { SpeciesId } from "../../../shared/domain";
import {
  getDashboardSnapshotLive,
  getFishingWindowsResponseLive,
  getMapOverlayResponseLive,
  getRecommendationsResponseLive,
} from "../../../shared/scoring";
import {
  enrichDashboardSnapshot,
  enrichRecommendationsResponse,
} from "./explanations";
import { corsHeaders } from "./http";
import {
  recordTelemetry,
  telemetryInputFromDashboard,
  telemetryInputFromRecommendations,
} from "./telemetry";

export interface ApiResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function readSpecies(value: string | null): SpeciesId | undefined {
  return value === "speckled_trout" || value === "redfish" ? value : undefined;
}

function readLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(Math.floor(parsed), 25);
}

function ok(body: unknown, extraHeaders?: Record<string, string>): ApiResult {
  return {
    status: 200,
    body,
    headers: {
      ...corsHeaders(),
      ...(extraHeaders ?? {}),
    },
  };
}

export function optionsResult(): ApiResult {
  return {
    status: 204,
    body: null,
    headers: corsHeaders(),
  };
}

export async function handleDashboard(searchParams: URLSearchParams): Promise<ApiResult> {
  const query = {
    area: searchParams.get("area") ?? undefined,
    species: readSpecies(searchParams.get("species")),
  };
  const snapshot = await enrichDashboardSnapshot(await getDashboardSnapshotLive(query));
  const telemetry = await recordTelemetry(telemetryInputFromDashboard(snapshot, query));

  return ok(snapshot, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

export async function handleRecommendations(searchParams: URLSearchParams): Promise<ApiResult> {
  const query = {
    area: searchParams.get("area") ?? undefined,
    species: readSpecies(searchParams.get("species")),
    limit: readLimit(searchParams.get("limit")),
  };
  const response = await enrichRecommendationsResponse(await getRecommendationsResponseLive(query));
  const telemetry = await recordTelemetry(
    telemetryInputFromRecommendations("recommendations", response, query),
  );

  return ok(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

export async function handleMap(searchParams: URLSearchParams): Promise<ApiResult> {
  const query = {
    area: searchParams.get("area") ?? undefined,
    species: readSpecies(searchParams.get("species")),
  };
  const response = await getMapOverlayResponseLive(query);
  const telemetry = await recordTelemetry({
    endpoint: "map",
    area: response.area,
    species: query.species,
    generatedAt: response.generatedAt,
  });

  return ok(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

export async function handleWindows(searchParams: URLSearchParams): Promise<ApiResult> {
  const query = {
    area: searchParams.get("area") ?? undefined,
    species: readSpecies(searchParams.get("species")),
  };
  const response = await getFishingWindowsResponseLive(query);
  const telemetry = await recordTelemetry({
    endpoint: "windows",
    area: response.area,
    species: query.species,
    generatedAt: response.generatedAt,
    bestWindowScore: response.bestWindow.score,
  });

  return ok(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

export async function dispatchApiRoute(
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
): Promise<ApiResult | null> {
  const normalizedMethod = method.toUpperCase();
  const route = pathname.replace(/^\/api\/?/, "").replace(/^\/+|\/+$/g, "");

  if (normalizedMethod === "OPTIONS") {
    return optionsResult();
  }

  if (normalizedMethod !== "GET") {
    return {
      status: 405,
      body: { error: "Method not allowed." },
      headers: corsHeaders(),
    };
  }

  switch (route) {
    case "dashboard":
      return handleDashboard(searchParams);
    case "recommendations":
      return handleRecommendations(searchParams);
    case "map":
      return handleMap(searchParams);
    case "windows":
      return handleWindows(searchParams);
    default:
      return null;
  }
}
