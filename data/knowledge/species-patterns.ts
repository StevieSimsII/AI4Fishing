import type { SpeciesId, SpeciesPattern } from "../../shared/domain";

export const SPECIES_PATTERNS: Record<SpeciesId, SpeciesPattern> = {
  speckled_trout: {
    species: "speckled_trout",
    displayName: "Speckled trout",
    preferredStructures: ["oyster reef", "shoreline", "point", "bayou bend", "channel edge"],
    idealDepthFeet: { min: 4, max: 7 },
    preferredTideMovements: ["incoming"],
    primeSeasons: ["spring", "summer", "fall"],
    primeTimes: ["pre-dawn", "sunrise", "morning"],
    defaultLure: "Live shrimp under a cork",
  },
  redfish: {
    species: "redfish",
    displayName: "Redfish",
    preferredStructures: ["marsh drain", "shoreline", "grass edge", "point"],
    idealDepthFeet: { min: 2, max: 4 },
    preferredTideMovements: ["outgoing", "incoming"],
    primeSeasons: ["summer", "fall", "winter"],
    primeTimes: ["morning", "afternoon", "evening"],
    defaultLure: "Gold spoon or weedless paddletail",
  },
};

