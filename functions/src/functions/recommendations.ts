import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getRecommendationsResponseLive } from "../../../shared/scoring";
import { enrichRecommendationsResponse } from "../services/explanations";
import { jsonResponse, readSpecies } from "../services/http";
import { readQueryLimit } from "../services/query";
import { recordTelemetry, telemetryInputFromRecommendations } from "../services/telemetry";

export async function recommendationsHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    area: request.query.get("area") ?? undefined,
    species: readSpecies(request),
    limit: readQueryLimit(request),
  };
  const response = await enrichRecommendationsResponse(await getRecommendationsResponseLive(query));
  const telemetry = await recordTelemetry(telemetryInputFromRecommendations("recommendations", response, query));

  return jsonResponse(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

app.http("recommendations", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "recommendations",
  handler: recommendationsHandler,
});

