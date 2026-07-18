import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { handleWindows, optionsResult } from "../services/api";

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

export async function windowsHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return toAzureResponse(optionsResult());
  }

  return toAzureResponse(await handleWindows(request.query));
}

app.http("windows", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "windows",
  handler: windowsHandler,
});
