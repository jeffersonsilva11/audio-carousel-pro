import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Optional prefix for the rate limit key
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Simple rate limiter using in-memory storage
 * For production with multiple instances, use Redis instead
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request is allowed based on rate limits
 * Uses in-memory storage (works for single instance)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, keyPrefix = "rl" } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  // Create new entry or reset if expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetAt = new Date(entry.resetAt);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfterMs: allowed ? undefined : entry.resetAt - now,
  };
}

/**
 * Check rate limit using Supabase database (for distributed rate limiting)
 * More reliable across multiple function instances
 */
export async function checkRateLimitDb(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, keyPrefix = "api" } = config;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Count requests in the current window
    const { count, error } = await supabase
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", keyPrefix)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.error("[RATE-LIMITER] Error checking rate limit:", error);
      // Fail open - allow request if we can't check
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }

    const requestCount = count || 0;
    const allowed = requestCount < maxRequests;
    const remaining = Math.max(0, maxRequests - requestCount);

    return {
      allowed,
      remaining,
      resetAt: new Date(now.getTime() + windowMs),
      retryAfterMs: allowed ? undefined : windowMs,
    };
  } catch (e) {
    console.error("[RATE-LIMITER] Exception:", e);
    // Fail open
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.remaining + (result.allowed ? 0 : 1)),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    ...(result.retryAfterMs ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } : {}),
  };
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      retryAfterMs: result.retryAfterMs,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // High-cost operations (AI generation)
  transcription: { windowMs: 60 * 1000, maxRequests: 5, keyPrefix: "transcribe" },
  scriptGeneration: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "script" },
  imageGeneration: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "image" },

  // Medium-cost operations
  checkout: { windowMs: 60 * 1000, maxRequests: 5, keyPrefix: "checkout" },
  exportData: { windowMs: 60 * 1000, maxRequests: 3, keyPrefix: "export" },

  // General API
  general: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "api" },

  // Auth operations (stricter)
  auth: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "auth" },
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: "pwd-reset" },
};
