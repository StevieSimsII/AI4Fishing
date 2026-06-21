import { CURRENT_ENVIRONMENT, HOURLY_FORECAST } from "../../data/seed/environment";
import { PILOT_SPOTS } from "../../data/seed/pilot-spots";
import { SPECIES_PATTERNS } from "../../data/knowledge/species-patterns";
import type {
  DashboardSnapshot,
  EnvironmentalSnapshot,
  ForecastWindowSeed,
  FishingWindowsResponse,
  MapOverlayResponse,
  Recommendation,
  RecommendationQuery,
  RecommendationsResponse,
  SpeciesId,
} from "../domain";
import { describeRating, scoreZoneForSpecies, sortRecommendations } from "./engine";

function normalizeArea(area?: string): string {
  return area?.trim() || CURRENT_ENVIRONMENT.area;
}

function allSpecies(): SpeciesId[] {
  return Object.keys(SPECIES_PATTERNS) as SpeciesId[];
}

function scoreRecommendations(
  environment: EnvironmentalSnapshot,
  query: RecommendationQuery = {},
): Recommendation[] {
  const speciesFilters = query.species ? [query.species] : allSpecies();

  const candidates = PILOT_SPOTS.flatMap((zone) =>
    speciesFilters
      .filter((species) => zone.speciesPriority[species] > 0)
      .map((species) => scoreZoneForSpecies(zone, SPECIES_PATTERNS[species], environment)),
  );

  return sortRecommendations(candidates);
}

function generatedAt(): string {
  return new Date().toISOString();
}

export function getRecommendationsResponse(
  query: RecommendationQuery = {},
  environment: EnvironmentalSnapshot = CURRENT_ENVIRONMENT,
): RecommendationsResponse {
  const ranked = scoreRecommendations(environment, query);
  const limit = query.limit ?? 5;

  return {
    area: normalizeArea(query.area),
    generatedAt: generatedAt(),
    environment,
    recommendations: ranked.slice(0, limit),
  };
}

export function getMapOverlayResponse(
  query: RecommendationQuery = {},
  environment: EnvironmentalSnapshot = CURRENT_ENVIRONMENT,
): MapOverlayResponse {
  const bestPerZone = new Map<string, Recommendation>();

  for (const recommendation of scoreRecommendations(environment, query)) {
    const current = bestPerZone.get(recommendation.zoneId);

    if (!current || recommendation.score > current.score) {
      bestPerZone.set(recommendation.zoneId, recommendation);
    }
  }

  return {
    area: normalizeArea(query.area),
    generatedAt: generatedAt(),
    features: Array.from(bestPerZone.values())
      .sort((left, right) => right.score - left.score)
      .map((recommendation) => ({
        zoneId: recommendation.zoneId,
        zoneName: recommendation.zoneName,
        bodyOfWater: recommendation.bodyOfWater,
        score: recommendation.score,
        rating: describeRating(recommendation.score),
        species: recommendation.species,
        structureType: recommendation.structureType,
        lat: recommendation.coordinates.lat,
        lng: recommendation.coordinates.lng,
        mapX: recommendation.mapPosition.x,
        mapY: recommendation.mapPosition.y,
      })),
  };
}

export function getFishingWindowsResponse(
  query: RecommendationQuery = {},
  forecastWindows: ForecastWindowSeed[] = HOURLY_FORECAST,
  baseEnvironment: EnvironmentalSnapshot = CURRENT_ENVIRONMENT,
): FishingWindowsResponse {
  const windows = forecastWindows.map((windowSeed) => {
    const environment: EnvironmentalSnapshot = {
      ...baseEnvironment,
      label: windowSeed.timeLabel,
      timeOfDay: windowSeed.timeOfDay,
      tideMovement: windowSeed.tideMovement,
      tideStage: windowSeed.tideStage,
      solunarScore: windowSeed.solunarScore,
      windSpeedMph: windowSeed.windSpeedMph,
    };

    const recommendation = scoreRecommendations(environment, { ...query, limit: 1 })[0];

    return {
      timeLabel: windowSeed.timeLabel,
      score: recommendation.score,
      rating: describeRating(recommendation.score),
      recommendedZone: recommendation.zoneName,
      recommendedSpecies: recommendation.species,
      tideMovement: windowSeed.tideMovement,
      notes: windowSeed.notes,
    };
  });

  const bestWindow = windows.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );

  return {
    area: normalizeArea(query.area),
    generatedAt: generatedAt(),
    windows,
    bestWindow,
  };
}

export function getDashboardSnapshot(
  query: RecommendationQuery = {},
  environment: EnvironmentalSnapshot = CURRENT_ENVIRONMENT,
  forecastWindows: ForecastWindowSeed[] = HOURLY_FORECAST,
): DashboardSnapshot {
  const recommendations = getRecommendationsResponse(query, environment);

  return {
    generatedAt: recommendations.generatedAt,
    area: recommendations.area,
    recommendations,
    mapOverlay: getMapOverlayResponse(query, environment),
    windows: getFishingWindowsResponse(query, forecastWindows, environment),
  };
}

