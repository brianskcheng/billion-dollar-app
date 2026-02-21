/**
 * Validates critical environment variables and fails fast if missing in production.
 * In development, logs warnings but does not throw.
 */

const CRITICAL_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
] as const;

const CLIENT_AUTH_KEY = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function getMissingVars(): string[] {
  const missing: string[] = [];

  for (const key of CRITICAL_VARS) {
    const value = process.env[key];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missing.push(key);
    }
  }

  const hasClientAuth = CLIENT_AUTH_KEY.some(
    (k) => process.env[k] && String(process.env[k]).trim() !== ""
  );
  if (!hasClientAuth) {
    missing.push(`one of ${CLIENT_AUTH_KEY.join(" or ")}`);
  }

  return missing;
}

export function validateEnv(): void {
  const missing = getMissingVars();
  if (missing.length === 0) return;

  const isProduction = process.env.NODE_ENV === "production";
  const message = `Missing required environment variables: ${missing.join(", ")}`;

  if (isProduction) {
    throw new Error(`[env] ${message}. Application cannot start.`);
  }

  console.warn(`[env] Warning: ${message}. Some features may not work.`);
}
