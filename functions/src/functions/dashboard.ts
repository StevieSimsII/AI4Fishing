import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDashboardSnapshotLive } from "../../../shared/scoring";
import { enrichDashboardSnapshot } from "../services/explanations";
import { jsonResponse, readSpecies } from "../services/http";
import { recordTelemetry, telemetryInputFromDashboard } from "../services/telemetry";

export async function dashboardHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    area: request.query.get("area") ?? undefined,
    species: readSpecies(request),
  };
  const snapshot = await enrichDashboardSnapshot(await getDashboardSnapshotLive(query));
  const telemetry = await recordTelemetry(telemetryInputFromDashboard(snapshot, query));

  return jsonResponse(snapshot, {
    "x-telemetry-id": telemetry.requestId,
    "x-telemetry-storage": telemetry.storage,
  });
}

app.http("dashboard", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard",
  handler: dashboardHandler,
});

