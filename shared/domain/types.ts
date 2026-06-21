export type SpeciesId = "speckled_trout" | "redfish";

export type OpportunityRating = "excellent" | "good" | "fair" | "poor";
export type ExplanationSource = "template" | "azure-openai";

export type DataSourceType = "weather" | "tide" | "bathymetry" | "hydro" | "solunar" | "fallback";

export type TideMovement = "incoming" | "outgoing" | "slack";

export type TideStage = "low" | "mid" | "high";

export type Season = "spring" | "summer" | "fall" | "winter";

export type TimeOfDay =
  | "pre-dawn"
  | "sunrise"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening";

export type WindDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type StructureType =
  | "oyster reef"
  | "shoreline"
  | "marsh drain"
  | "point"
  | "grass edge"
  | "bayou bend"
  | "channel edge";

export interface DepthRange {
  min: number;
  max: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapPosition {
  x: number;
  y: number;
}

export interface DataSourceReference {
  name: string;
  type: DataSourceType;
  url: string;
  detail?: string;
}

export interface TideStation {
  id: string;
  name: string;
}

export interface FishingZone {
  id: string;
  name: string;
  area: string;
  bodyOfWater: string;
  structureType: StructureType;
  depthFeet: DepthRange;
  coordinates: Coordinates;
  mapPosition: MapPosition;
  windShelterDirections: WindDirection[];
  preferredTideMovements: TideMovement[];
  productiveSeasons: Season[];
  bestTimes: TimeOfDay[];
  speciesPriority: Record<SpeciesId, number>;
  lureRecommendations: Record<SpeciesId, string>;
  note: string;
}

export interface EnvironmentalSnapshot {
  area: string;
  observedAt: string;
  label: string;
  windDirection: WindDirection;
  windSpeedMph: number;
  pressureMb?: number;
  tideMovement: TideMovement;
  tideStage: TideStage;
  tideStation?: TideStation;
  season: Season;
  timeOfDay: TimeOfDay;
  waterTempF: number;
  recentWeather: string;
  moonPhase: string;
  solunarScore: number;
  cloudCoverPercent: number;
  dataSources?: DataSourceReference[];
  depthSourceNotes?: string[];
}

export interface ForecastWindowSeed {
  timeLabel: string;
  timeOfDay: TimeOfDay;
  tideMovement: TideMovement;
  tideStage: TideStage;
  solunarScore: number;
  windSpeedMph: number;
  notes: string;
}

export interface SpeciesPattern {
  species: SpeciesId;
  displayName: string;
  preferredStructures: StructureType[];
  idealDepthFeet: DepthRange;
  preferredTideMovements: TideMovement[];
  primeSeasons: Season[];
  primeTimes: TimeOfDay[];
  defaultLure: string;
}

export interface FactorBreakdown {
  tide: number;
  wind: number;
  structure: number;
  depth: number;
  season: number;
  solunar: number;
  total: number;
}

export interface Recommendation {
  rank: number;
  zoneId: string;
  zoneName: string;
  area: string;
  bodyOfWater: string;
  species: SpeciesId;
  score: number;
  confidenceLabel: OpportunityRating;
  structureType: StructureType;
  depthFeet: DepthRange;
  coordinates: Coordinates;
  mapPosition: MapPosition;
  recommendedLure: string;
  reason: string;
  explanation?: string;
  explanationSource?: ExplanationSource;
  breakdown: FactorBreakdown;
}

export interface HourlyOpportunity {
  timeLabel: string;
  score: number;
  rating: OpportunityRating;
  recommendedZone: string;
  recommendedSpecies: SpeciesId;
  tideMovement: TideMovement;
  notes: string;
}

