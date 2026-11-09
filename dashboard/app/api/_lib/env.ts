import fs from "fs";
import path from "path";

export function getRootDir(): string {
  return path.resolve(process.cwd(), "..");
}

export function loadParentEnv(): Record<string, string> {
  const envMap: Record<string, string> = {};
  const envPath = path.join(getRootDir(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        envMap[key] = val;
      }
    }
  }
  return {
    ...envMap,
    ...(process.env as Record<string, string>),
  };
}

export function getSupabaseConfig() {
  const env = loadParentEnv();
  const url = (env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || "").trim();
  const isValid = Boolean(url && key && !url.includes("your-project-id"));
  return { url, key, isValid, env };
}
