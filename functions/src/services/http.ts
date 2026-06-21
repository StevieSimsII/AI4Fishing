import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import type { SpeciesId } from "../../../shared/domain";

export function readSpecies(request: HttpRequest): SpeciesId | undefined {
  const species = request.query.get("species");
  return species === "speckled_trout" || species === "redfish" ? species : undefined;
}

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function jsonResponse(
  jsonBody: unknown,
  extraHeaders?: Record<string, string>,
): HttpResponseInit {
  return {
    jsonBody,
    headers: {
      ...corsHeaders(),
      ...(extraHeaders ?? {}),
    },
  };
}

