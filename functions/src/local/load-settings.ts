import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface LocalSettingsFile {
  Values?: Record<string, string>;
}

export function loadLocalSettings(cwd = process.cwd()): void {
  const settingsPath = resolve(cwd, "local.settings.json");
  if (!existsSync(settingsPath)) {
    console.warn(
      `[local-api] No local.settings.json found at ${settingsPath}. Using process env only.`,
    );
    return;
  }

  const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as LocalSettingsFile;
  for (const [key, value] of Object.entries(parsed.Values ?? {})) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  console.log(`[local-api] Loaded settings from ${settingsPath}`);
}
