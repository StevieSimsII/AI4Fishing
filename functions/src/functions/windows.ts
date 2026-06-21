import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFishingWindowsResponseLive } from "../../../shared/scoring";
import { jsonResponse, readSpecies } from "../services/http";
import { recordTelemetry } from "../services/telemetry";

export async function windowsHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    area: request.query.get("area") ?? undefined,
    species: readSpecies(request),
  };
  const response = await getFishingWindowsResponseLive(query);
  const telemetry = await recordTelemetry({
    endpoint: "windows",
    area: response.area,
    species: query.species,
    generatedAt: response.generatedAt,
    bestWindowScore: response.bestWindow.score,
  });

  return jsonResponse(response, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

app.http("windows", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "windows",
  handler: windowsHandler,
});

