import { SCORING_WEIGHTS } from "./constants";
import type {
  EnvironmentalSnapshot,
  FishingZone,
  OpportunityRating,
  Recommendation,
  SpeciesPattern,
  StructureType,
  WindDirection,
} from "../domain";

const DIRECTION_ANGLES: Record<WindDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

function angleDifference(from: number, to: number): number {
  const delta = Math.abs(from - to) % 360;
  return delta > 180 ? 360 - delta : delta;
}

function directionScore(preferred: WindDirection[], actual: WindDirection): number {
  const bestDifference = Math.min(
    ...preferred.map((direction) =>
      angleDifference(DIRECTION_ANGLES[direction], DIRECTION_ANGLES[actual]),
    ),
  );

  if (bestDifference === 0) {
    return 100;
  }

  if (bestDifference <= 45) {
    return 82;
  }

  if (bestDifference <= 90) {
    return 62;
  }

  return 38;
}

function overlapScore(
  a: { min: number; max: number },
  b: { min: number; max: number },
): number {
  const overlap = Math.max(0, Math.min(a.max, b.max) - Math.max(a.min, b.min));
  const span = Math.max(a.max, b.max) - Math.min(a.min, b.min);

  if (overlap > 0) {
    return Math.round((overlap / span) * 55 + 45);
  }

  const midpointDelta = Math.abs((a.min + a.max) / 2 - (b.min + b.max) / 2);
  return Math.max(30, Math.round(90 - midpointDelta * 12));
}

function structureScore(structureType: StructureType, pattern: SpeciesPattern): number {
  return pattern.preferredStructures.includes(structureType) ? 100 : 52;
}

function tideScore(zone: FishingZone, pattern: SpeciesPattern, environment: EnvironmentalSnapshot): number {
  const zoneMatches = zone.preferredTideMovements.includes(environment.tideMovement);
  const speciesMatches = pattern.preferredTideMovements.includes(environment.tideMovement);

  if (zoneMatches && speciesMatches) {
    return 100;
  }

  if (zoneMatches || speciesMatches) {
    return 72;
  }

  return environment.tideMovement === "slack" ? 48 : 34;
}

function seasonScore(zone: FishingZone, pattern: SpeciesPattern, environment: EnvironmentalSnapshot): number {
  const zoneMatches = zone.productiveSeasons.includes(environment.season);
  const speciesMatches = pattern.primeSeasons.includes(environment.season);

  if (zoneMatches && speciesMatches) {
    return 100;
  }

  if (zoneMatches || speciesMatches) {
    return 68;
  }

  return 40;
}

function solunarScore(zone: FishingZone, pattern: SpeciesPattern, environment: EnvironmentalSnapshot): number {
  const timeBoost =
    zone.bestTimes.includes(environment.timeOfDay) && pattern.primeTimes.includes(environment.timeOfDay)
      ? 1
      : zone.bestTimes.includes(environment.timeOfDay) || pattern.primeTimes.includes(environment.timeOfDay)
        ? 0.86
        : 0.72;

  return Math.min(100, Math.round(environment.solunarScore * timeBoost));
}

function windExposureAdjustment(environment: EnvironmentalSnapshot): number {
  if (environment.windSpeedMph <= 10) {
    return 0;
  }

  if (environment.windSpeedMph <= 15) {
    return 4;
  }

  return 10;
}

function confidenceLabel(score: number): OpportunityRating {
  if (score >= 85) {
    return "excellent";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 55) {
    return "fair";
  }

  return "poor";
}

function speciesName(pattern: SpeciesPattern): string {
  return pattern.displayName.toLowerCase();
}

function buildReason(zone: FishingZone, pattern: SpeciesPattern, environment: EnvironmentalSnapshot): string {
  const tidePhrase =
    environment.tideMovement === "incoming"
      ? "Incoming tide is pushing bait onto the structure"
      : environment.tideMovement === "outgoing"
        ? "Outgoing tide is pulling bait through the structure"
        : "Slack water keeps this area in play because of depth and cover";

  return `${tidePhrase}, while the ${environment.windDirection.toLowerCase()} wind keeps ${zone.name} protected. ${pattern.displayName} typically set up in ${zone.depthFeet.min}-${zone.depthFeet.max} feet around the ${zone.structureType} during ${environment.timeOfDay}.`;
}

export function scoreZoneForSpecies(
  zone: FishingZone,
  pattern: SpeciesPattern,
  environment: EnvironmentalSnapshot,
): Recommendation {
  const tide = tideScore(zone, pattern, environment);
  const wind = Math.max(
    28,
    directionScore(zone.windShelterDirections, environment.windDirection) -
      windExposureAdjustment(environment),
  );
  const structure = structureScore(zone.structureType, pattern);
  const depth = overlapScore(zone.depthFeet, pattern.idealDepthFeet);
  const season = seasonScore(zone, pattern, environment);
  const solunar = solunarScore(zone, pattern, environment);

  const weightedScore =
    tide * SCORING_WEIGHTS.tide +
    wind * SCORING_WEIGHTS.wind +
    structure * SCORING_WEIGHTS.structure +
    depth * SCORING_WEIGHTS.depth +
    season * SCORING_WEIGHTS.season +
    solunar * SCORING_WEIGHTS.solunar;

  const suitability = zone.speciesPriority[pattern.species];
  const total = Math.round(weightedScore * suitability);

  return {
    rank: 0,
    zoneId: zone.id,
    zoneName: zone.name,
    area: zone.area,
    bodyOfWater: zone.bodyOfWater,
    species: pattern.species,
    score: total,
    confidenceLabel: confidenceLabel(total),
    structureType: zone.structureType,
    depthFeet: zone.depthFeet,
    coordinates: zone.coordinates,
    mapPosition: zone.mapPosition,
    recommendedLure: zone.lureRecommendations[pattern.species] ?? pattern.defaultLure,
    reason: buildReason(zone, pattern, environment),
    breakdown: {
      tide,
      wind,
      structure,
      depth,
      season,
      solunar,
      total,
    },
  };
}

export function sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
  return recommendations
    .slice()
    .sort((left, right) => right.score - left.score)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }));
}

export function describeRating(score: number): OpportunityRating {
  return confidenceLabel(score);
}

export function recommendationHeadline(recommendation: Recommendation, environment: EnvironmentalSnapshot): string {
  return `${environment.label}: fish ${recommendation.zoneName} for ${speciesName({
    displayName:
      recommendation.species === "speckled_trout" ? "Speckled trout" : "Redfish",
    species: recommendation.species,
    preferredStructures: [],
    idealDepthFeet: recommendation.depthFeet,
    preferredTideMovements: [],
    primeSeasons: [],
    primeTimes: [],
    defaultLure: recommendation.recommendedLure,
  })} in ${recommendation.depthFeet.min}-${recommendation.depthFeet.max} feet using ${recommendation.recommendedLure.toLowerCase()}.`;
}

