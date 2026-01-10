// Shared CORS configuration for Edge Functions
// Configure ALLOWED_ORIGINS in Supabase Dashboard > Edge Functions > Secrets

/**
 * Get allowed origins from environment variable
 * Format: comma-separated list of domains
 * Example: "https://audisell.com,https://www.audisell.com,http://localhost:5173"
 */
function getAllowedOrigins(): string[] {
  const originsEnv = Deno.env.get("ALLOWED_ORIGINS");

  if (!originsEnv) {
    // Default to localhost for development if not set
    console.warn("ALLOWED_ORIGINS not set, defaulting to localhost only");
    return ["http://localhost:5173", "http://localhost:3000"];
  }

  return originsEnv.split(",").map(origin => origin.trim());
}

/**
 * Validate if the request origin is allowed
 */
export function isOriginAllowed(requestOrigin: string | null): boolean {
  if (!requestOrigin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(requestOrigin);
}

/**
 * Get CORS headers for a request
 * Returns headers with the request origin if allowed, or empty Access-Control-Allow-Origin otherwise
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // Check if request origin is in the allowed list
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}

/**
 * Create standard CORS headers for static use (backwards compatibility)
 * Prefer using getCorsHeaders(req) for dynamic origin validation
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGINS")?.split(",")[0] || "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};
