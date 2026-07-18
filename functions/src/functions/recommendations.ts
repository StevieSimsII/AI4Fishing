import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { handleRecommendations, optionsResult } from "../services/api";

function toAzureResponse(result: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}): HttpResponseInit {
  return {
    status: result.status,
    jsonBody: result.body === null ? undefined : result.body,
    headers: result.headers,
  };
}

export async function recommendationsHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return toAzureResponse(optionsResult());
  }

  return toAzureResponse(await handleRecommendations(request.query));
}

app.http("recommendations", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "recommendations",
  handler: recommendationsHandler,
});
