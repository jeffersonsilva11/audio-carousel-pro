import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: { ok: boolean; latencyMs?: number; error?: string };
    storage: { ok: boolean; error?: string };
    auth: { ok: boolean; error?: string };
  };
  version: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: { ok: false },
      storage: { ok: false },
      auth: { ok: false },
    },
    version: "1.0.0",
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      healthStatus.status = "unhealthy";
      healthStatus.checks.database.error = "Missing environment variables";
      healthStatus.checks.storage.error = "Missing environment variables";
      healthStatus.checks.auth.error = "Missing environment variables";

      return new Response(JSON.stringify(healthStatus), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database connectivity
    const dbStart = Date.now();
    try {
      const { error: dbError } = await supabase
        .from("plans_config")
        .select("tier")
        .limit(1);

      if (dbError) {
        healthStatus.checks.database = { ok: false, error: dbError.message };
        healthStatus.status = "degraded";
      } else {
        healthStatus.checks.database = {
          ok: true,
          latencyMs: Date.now() - dbStart,
        };
      }
    } catch (e) {
      healthStatus.checks.database = {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
      healthStatus.status = "degraded";
    }

    // Check storage connectivity
    try {
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

      if (storageError) {
        healthStatus.checks.storage = { ok: false, error: storageError.message };
        healthStatus.status = "degraded";
      } else {
        healthStatus.checks.storage = { ok: true };
      }
    } catch (e) {
      healthStatus.checks.storage = {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
      healthStatus.status = "degraded";
    }

    // Check auth service
    try {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      if (authError) {
        healthStatus.checks.auth = { ok: false, error: authError.message };
        healthStatus.status = "degraded";
      } else {
        healthStatus.checks.auth = { ok: true };
      }
    } catch (e) {
      healthStatus.checks.auth = {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
      healthStatus.status = "degraded";
    }

    // Determine overall status
    const allChecksOk = Object.values(healthStatus.checks).every((c) => c.ok);
    const allChecksFailed = Object.values(healthStatus.checks).every((c) => !c.ok);

    if (allChecksOk) {
      healthStatus.status = "healthy";
    } else if (allChecksFailed) {
      healthStatus.status = "unhealthy";
    } else {
      healthStatus.status = "degraded";
    }

    const httpStatus = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503;

    return new Response(JSON.stringify(healthStatus), {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    healthStatus.status = "unhealthy";
    healthStatus.checks.database.error = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify(healthStatus), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
