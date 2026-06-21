import { randomUUID } from "node:crypto";
import type {
  DashboardSnapshot,
  EnvironmentalSnapshot,
  Recommendation,
  RecommendationsResponse,
} from "../../../shared/domain";
import { getPostgresPool } from "./postgres";

interface TelemetryInput {
  endpoint: "dashboard" | "recommendations" | "map" | "windows";
  area?: string;
  species?: string;
  limit?: number;
  environment?: EnvironmentalSnapshot;
  recommendations?: Recommendation[];
  bestWindowScore?: number;
  generatedAt?: string;
}

interface TelemetryResult {
  requestId: string;
  storage: "postgres" | "console";
}

function isFallbackEnvironment(environment?: EnvironmentalSnapshot): boolean {
  return Boolean(
    environment?.dataSources?.some((source) => source.type === "fallback"),
  );
}

function explanationMode(recommendations?: Recommendation[]): string {
  const sources = new Set(
    (recommendations ?? [])
      .map((recommendation) => recommendation.explanationSource)
      .filter((value): value is NonNullable<typeof value> => value !== undefined),
  );

  if (sources.size === 0) {
    return "none";
  }

  return Array.from(sources).sort().join(",");
}

async function logToConsole(result: TelemetryInput, requestId: string): Promise<TelemetryResult> {
  console.info(
    JSON.stringify({
      type: "inshoreiq-api-telemetry",
      requestId,
      endpoint: result.endpoint,
      area: result.area,
      species: result.species,
      generatedAt: result.generatedAt,
      fallback: isFallbackEnvironment(result.environment),
      topRecommendation: result.recommendations?.[0]
        ? {
            zoneName: result.recommendations[0].zoneName,
            species: result.recommendations[0].species,
            score: result.recommendations[0].score,
            explanationSource: result.recommendations[0].explanationSource ?? "none",
          }
        : null,
      bestWindowScore: result.bestWindowScore ?? null,
    }),
  );

  return {
    requestId,
    storage: "console",
  };
}

export async function recordTelemetry(result: TelemetryInput): Promise<TelemetryResult> {
  const requestId = randomUUID();
  const pool = getPostgresPool();

  if (!pool) {
    return logToConsole(result, requestId);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO api_request_events (
          request_id,
          endpoint,
          area,
          species,
          request_limit,
          generated_at,
          fallback_used,
          provider_status,
          explanation_mode,
          top_zone_name,
          top_score,
          best_window_score
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12
        )
      `,
      [
        requestId,
        result.endpoint,
        result.area ?? null,
        result.species ?? null,
        result.limit ?? null,
        result.generatedAt ?? new Date().toISOString(),
        isFallbackEnvironment(result.environment),
        JSON.stringify(result.environment?.dataSources ?? []),
        explanationMode(result.recommendations),
        result.recommendations?.[0]?.zoneName ?? null,
        result.recommendations?.[0]?.score ?? null,
        result.bestWindowScore ?? null,
      ],
    );

    for (const recommendation of result.recommendations ?? []) {
      await client.query(
        `
          INSERT INTO api_recommendation_events (
            event_id,
            request_id,
            recommendation_rank,
            zone_id,
            zone_name,
            species,
            score,
            confidence_label,
            explanation_source
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9
          )
        `,
        [
          randomUUID(),
          requestId,
          recommendation.rank,
          recommendation.zoneId,
          recommendation.zoneName,
          recommendation.species,
          recommendation.score,
          recommendation.confidenceLabel,
          recommendation.explanationSource ?? "none",
        ],
      );
    }

    await client.query("COMMIT");

    return {
      requestId,
      storage: "postgres",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function telemetryInputFromRecommendations(
  endpoint: "dashboard" | "recommendations",
  response: RecommendationsResponse,
  query: {
    area?: string;
    species?: string;
    limit?: number;
  },
): TelemetryInput {
  return {
    endpoint,
    area: response.area,
    species: query.species,
    limit: query.limit,
    environment: response.environment,
    recommendations: response.recommendations,
    generatedAt: response.generatedAt,
  };
}

export function telemetryInputFromDashboard(
  snapshot: DashboardSnapshot,
  query: {
    area?: string;
    species?: string;
    limit?: number;
  },
): TelemetryInput {
  return {
    endpoint: "dashboard",
    area: snapshot.area,
    species: query.species,
    limit: query.limit,
    environment: snapshot.recommendations.environment,
    recommendations: snapshot.recommendations.recommendations,
    bestWindowScore: snapshot.windows.bestWindow.score,
    generatedAt: snapshot.generatedAt,
  };
}

