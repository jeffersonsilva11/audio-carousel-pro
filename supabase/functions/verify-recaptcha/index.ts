import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[RECAPTCHA] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action } = await req.json();
    
    logStep('Verifying reCAPTCHA', { action, tokenLength: token?.length });

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No reCAPTCHA token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      logStep('ERROR: RECAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'reCAPTCHA not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Google reCAPTCHA API
    const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const verifyResult = await verifyResponse.json();
    
    logStep('reCAPTCHA verification result', { 
      success: verifyResult.success,
      score: verifyResult.score,
      action: verifyResult.action,
      errorCodes: verifyResult['error-codes']
    });

    // For reCAPTCHA v3, check score (0.0 - 1.0, higher is more likely human)
    const score = verifyResult.score || 0;
    const isHuman = verifyResult.success && score >= 0.5;
    
    // Optionally verify action matches
    const actionMatches = !action || verifyResult.action === action;

    if (!isHuman) {
      logStep('Bot detected', { score, threshold: 0.5 });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Verification failed - suspected bot activity',
          score 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!actionMatches) {
      logStep('Action mismatch', { expected: action, received: verifyResult.action });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid action',
          score 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Verification successful', { score, action: verifyResult.action });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        score,
        action: verifyResult.action 
      }),
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
