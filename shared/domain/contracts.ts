import type {
  EnvironmentalSnapshot,
  HourlyOpportunity,
  OpportunityRating,
  Recommendation,
  SpeciesId,
  StructureType,
} from "./types";

export interface RecommendationQuery {
  area?: string;
  species?: SpeciesId;
  limit?: number;
}

export interface MapOverlayFeature {
  zoneId: string;
  zoneName: string;
  bodyOfWater: string;
  score: number;
  rating: OpportunityRating;
  species: SpeciesId;
  structureType: StructureType;
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
}

export interface RecommendationsResponse {
  area: string;
  generatedAt: string;
  environment: EnvironmentalSnapshot;
  recommendations: Recommendation[];
}

export interface MapOverlayResponse {
  area: string;
  generatedAt: string;
  features: MapOverlayFeature[];
}

export interface FishingWindowsResponse {
  area: string;
  generatedAt: string;
  windows: HourlyOpportunity[];
  bestWindow: HourlyOpportunity;
}

export interface DashboardSnapshot {
  generatedAt: string;
  area: string;
  recommendations: RecommendationsResponse;
  mapOverlay: MapOverlayResponse;
  windows: FishingWindowsResponse;
}

