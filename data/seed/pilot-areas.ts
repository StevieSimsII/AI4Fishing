import type { Coordinates, DataSourceReference } from "../../shared/domain";

export interface PilotAreaConfig {
  key: string;
  area: string;
  center: Coordinates;
  windyModel: string;
  noaaStation: {
    id: string;
    name: string;
  };
  dataSources: DataSourceReference[];
}

export const PILOT_AREAS: PilotAreaConfig[] = [
  {
    key: "delacroix-cluster",
    area: "Delacroix Cluster",
    center: {
      lat: 29.785,
      lng: -89.705,
    },
    windyModel: "gfs",
    noaaStation: {
      id: "8761305",
      name: "Shell Beach, LA",
    },
    dataSources: [
      {
        name: "Windy Point Forecast API",
        type: "weather",
        url: "https://api.windy.com/",
        detail: "Primary weather source for wind, cloud cover, temperature, and pressure.",
      },
      {
        name: "NOAA CO-OPS Tides & Currents API",
        type: "tide",
        url: "https://api.tidesandcurrents.noaa.gov/api/prod/",
        detail: "Primary tide source using Shell Beach station 8761305 water levels, with predictions when available.",
      },
      {
        name: "NOAA NBS / NCEI Bathymetry",
        type: "bathymetry",
        url: "https://www.ncei.noaa.gov/maps/bathymetry/",
        detail: "Primary public bathymetry source for zone depth and contour modeling.",
      },
      {
        name: "USACE Open Data",
        type: "hydro",
        url: "https://geospatial-usace.opendata.arcgis.com/",
        detail: "Supplemental survey and channel depth source for local hydro features.",
      },
    ],
  },
];

export function getPilotAreaConfig(area?: string): PilotAreaConfig {
  if (!area) {
    return PILOT_AREAS[0];
  }

  const normalizedArea = area.trim().toLowerCase();
  return (
    PILOT_AREAS.find((candidate) => candidate.area.toLowerCase() === normalizedArea) ??
    PILOT_AREAS[0]
  );
}

