import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AUTH-ATTEMPT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fingerprint, success, attemptCount } = await req.json();
    
    logStep('Logging auth attempt', { fingerprint: fingerprint?.slice(0, 8), success, attemptCount });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Log to usage_logs table
    await supabase.from('usage_logs').insert({
      action: success ? 'auth_success' : 'auth_failed',
      resource: 'authentication',
      status: success ? 'success' : 'failed',
      ip_address: ipAddress,
      metadata: {
        fingerprint,
        attemptCount,
        timestamp: new Date().toISOString(),
      },
    });

    // Check for suspicious activity (many failed attempts from same fingerprint)
    if (!success && attemptCount >= 3) {
      logStep('Suspicious activity detected', { fingerprint: fingerprint?.slice(0, 8), attemptCount });
      
      // Log suspicious activity
      await supabase.from('usage_logs').insert({
        action: 'suspicious_auth_activity',
        resource: 'authentication',
        status: 'warning',
        ip_address: ipAddress,
        metadata: {
          fingerprint,
          attemptCount,
          reason: 'multiple_failed_attempts',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
