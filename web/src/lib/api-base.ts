function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window !== "undefined") {
    const localHostnames = new Set(["localhost", "127.0.0.1"]);
    if (localHostnames.has(window.location.hostname)) {
      return "http://localhost:7071/api";
    }
  }

  return "";
}

export function buildApiUrl(path: string): string | null {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

