import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dispatchApiRoute } from "../services/api";
import { loadLocalSettings } from "./load-settings";

loadLocalSettings();

const port = Number(process.env.PORT || process.env.FUNCTIONS_PORT || 7071);

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string>,
): void {
  const payload = body === null || body === undefined ? "" : JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(payload);
}

function requestUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const url = requestUrl(request);
    const result = await dispatchApiRoute(request.method ?? "GET", url.pathname, url.searchParams);

    if (!result) {
      sendJson(
        response,
        404,
        {
          error: "Not found.",
          endpoints: [
            "/api/dashboard",
            "/api/recommendations",
            "/api/map",
            "/api/windows",
          ],
        },
        {},
      );
      return;
    }

    sendJson(response, result.status, result.body, result.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected API error.";
    console.error(`[local-api] ${message}`);
    sendJson(
      response,
      500,
      { error: message },
      {
        "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
      },
    );
  }
}

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, () => {
  console.log(`[local-api] InshoreIQ API listening on http://localhost:${port}/api`);
  console.log(`[local-api] Try http://localhost:${port}/api/dashboard`);
});
