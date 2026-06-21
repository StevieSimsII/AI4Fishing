import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getMapOverlayResponseLive } from "../../../shared/scoring";
import { jsonResponse, readSpecies } from "../services/http";
import { recordTelemetry } from "../services/telemetry";

export async function mapHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    area: request.query.get("area") ?? undefined,
    species: readSpecies(request),
  };
  const response = await getMapOverlayResponseLive(query);
  const telemetry = await recordTelemetry({
    endpoint: "map",
    area: response.area,
    species: query.species,
    generatedAt: response.generatedAt,
  });

  return jsonResponse(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

app.http("map", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "map",
  handler: mapHandler,
});

