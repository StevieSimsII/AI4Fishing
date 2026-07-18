function normalize(value?: string | null): string {
  return (value ?? "").trim();
}

/** Treat empty strings and common placeholder values as unset. */
export function isConfiguredValue(value?: string | null): boolean {
  const normalized = normalize(value);
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  const placeholderMarkers = [
    "replace_with",
    "replace-with",
    "your_",
    "your-",
    "username:password",
    "hostname",
    "example.com",
    "changeme",
    "todo",
    "xxx",
  ];

  return !placeholderMarkers.some((marker) => lowered.includes(marker));
}

export function readConfiguredEnv(name: string): string | undefined {
  const value = process.env[name];
  return isConfiguredValue(value) ? normalize(value) : undefined;
}
