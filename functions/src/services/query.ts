import type { HttpRequest } from "@azure/functions";

export function readQueryLimit(request: HttpRequest): number | undefined {
  const raw = request.query.get("limit");
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

