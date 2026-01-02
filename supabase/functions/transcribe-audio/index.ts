import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Magic bytes for audio file validation
const AUDIO_MAGIC_BYTES: Record<string, number[][]> = {
  'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xFA], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]], // MP3
  'audio/mp3': [[0xFF, 0xFB], [0xFF, 0xFA], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]], // MP3
  'audio/wav': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'audio/x-wav': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'audio/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
  'audio/mp4': [[0x00, 0x00, 0x00]], // ftyp (will check further)
  'audio/x-m4a': [[0x00, 0x00, 0x00]], // ftyp
  'audio/m4a': [[0x00, 0x00, 0x00]], // ftyp
  'audio/ogg': [[0x4F, 0x67, 0x67, 0x53]], // OggS
};

// Plan daily limits
const PLAN_LIMITS: Record<string, number> = {
  'free': 1,
  'starter': 1,
  'creator': 8,
  'agency': 20,
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRANSCRIBE-AUDIO] ${step}${detailsStr}`);
};

// Validate audio file magic bytes
function validateMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  const patterns = AUDIO_MAGIC_BYTES[mimeType] || AUDIO_MAGIC_BYTES['audio/webm'];
  
  for (const pattern of patterns) {
    let matches = true;
    for (let i = 0; i < pattern.length; i++) {
      if (bytes[i] !== pattern[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  
  // Additional check for M4A files (ftyp signature at byte 4-7)
  if (mimeType.includes('m4a') || mimeType.includes('mp4')) {
    const ftypCheck = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    if (ftypCheck) return true;
  }
  
  logStep('Magic bytes validation failed', { 
    mimeType, 
    firstBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  });
  return false;
}

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Get user's current plan from Stripe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserPlan(supabase: any, userId: string, email: string): Promise<{ plan: string; dailyUsed: number; dailyLimit: number; isAdmin: boolean }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get daily usage
  const { data: usageData } = await supabase
    .from("daily_usage")
    .select("carousels_created")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();
  
  const dailyUsed = (usageData as { carousels_created?: number })?.carousels_created || 0;
  
  // Check if admin
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  if (roleData) {
    return { plan: 'creator', dailyUsed, dailyLimit: 9999, isAdmin: true };
  }
  
  // Check Stripe subscription
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
  }
  
  try {
    const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
    }
    
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
    }
    
    const price = subscriptions.data[0].items.data[0]?.price;
    const unitAmount = price?.unit_amount || 0;
    
    let plan = 'starter';
    if (unitAmount >= 19990) plan = 'agency';
    else if (unitAmount >= 9990) plan = 'creator';
    
    return { plan, dailyUsed, dailyLimit: PLAN_LIMITS[plan], isAdmin: false };
  } catch (error) {
    logStep('Error checking subscription', { error: String(error) });
    return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
  }
}

// Log usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logUsage(
  supabase: any,
  userId: string | null,
  action: string,
  resource: string | null,
  status: string,
  metadata: Record<string, unknown>,
  ipAddress: string | null
) {
  try {
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action,
      resource,
      status,
      metadata,
      ip_address: ipAddress
    });
  } catch (error) {
    logStep('Failed to log usage', { error: String(error) });
  }
}

// Log API usage for cost tracking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logApiUsage(
  supabase: any,
  userId: string,
  apiName: string,
  action: string,
  audioSeconds: number
) {
  try {
    // Whisper pricing: $0.006 per second
    const estimatedCost = audioSeconds * 0.006;
    
    await supabase.from('api_usage').insert({
      user_id: userId,
      api_name: apiName,
      action,
      audio_seconds: audioSeconds,
      estimated_cost_usd: estimatedCost
    });
  } catch (error) {
    logStep('Failed to log API usage', { error: String(error) });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip') || null;

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logUsage(supabase, null, 'transcribe', null, 'unauthorized', {}, ipAddress);
      throw new Error("Authentication required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      await logUsage(supabase, null, 'transcribe', null, 'unauthorized', { error: userError?.message }, ipAddress);
      throw new Error("Invalid authentication");
    }
    
    const user = userData.user;
    logStep('User authenticated', { userId: user.id });
    
    // Check rate limits
    const { plan, dailyUsed, dailyLimit, isAdmin } = await getUserPlan(supabase, user.id, user.email || '');
    logStep('Plan checked', { plan, dailyUsed, dailyLimit, isAdmin });
    
    if (!isAdmin && dailyUsed >= dailyLimit) {
      await logUsage(supabase, user.id, 'transcribe', null, 'rate_limited', { plan, dailyUsed, dailyLimit }, ipAddress);
      return new Response(JSON.stringify({ 
        error: 'Daily limit reached',
        code: 'RATE_LIMIT_EXCEEDED',
        details: { plan, dailyUsed, dailyLimit }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { audio, mimeType, carouselId } = await req.json();

    if (!audio) {
      await logUsage(supabase, user.id, 'transcribe', carouselId, 'invalid_request', { error: 'No audio provided' }, ipAddress);
      throw new Error('No audio data provided');
    }

    const OPENAI_WHISPER_KEY = Deno.env.get('OPENAI_WHISPER');
    if (!OPENAI_WHISPER_KEY) {
      throw new Error('OPENAI_WHISPER is not configured');
    }

    logStep('Processing audio', { mimeType, audioLength: audio.length });

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Validate magic bytes
    if (!validateMagicBytes(binaryAudio, mimeType || 'audio/webm')) {
      await logUsage(supabase, user.id, 'transcribe', carouselId, 'invalid_file', { 
        mimeType,
        firstBytes: Array.from(binaryAudio.slice(0, 8)).map(b => b.toString(16)).join(' ')
      }, ipAddress);
      return new Response(JSON.stringify({ 
        error: 'Invalid audio file. The file does not match expected audio format.',
        code: 'INVALID_FILE_FORMAT'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    logStep('Magic bytes validated successfully');
    
    // Determine file extension based on mimeType
    const extension = mimeType?.includes('webm') ? 'webm' : 
                      mimeType?.includes('mp3') ? 'mp3' : 
                      mimeType?.includes('m4a') ? 'm4a' : 
                      mimeType?.includes('wav') ? 'wav' : 
                      mimeType?.includes('ogg') ? 'ogg' : 'webm';
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio as unknown as ArrayBuffer], { type: mimeType || 'audio/webm' });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_WHISPER_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Whisper API error', { status: response.status, error: errorText });
      
      await logUsage(supabase, user.id, 'transcribe', carouselId, 'api_error', { 
        status: response.status, 
        error: errorText.substring(0, 200) 
      }, ipAddress);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(JSON.stringify({ error: 'API key error. Please check your OpenAI API key.' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    const transcription = result.text || '';

    // Estimate audio duration from file size (rough estimate: ~16KB per second for compressed audio)
    const estimatedAudioSeconds = binaryAudio.length / 16000;
    
    logStep('Transcription completed', { length: transcription.length, estimatedSeconds: estimatedAudioSeconds });
    
    // Log API usage for cost tracking
    await logApiUsage(supabase, user.id, 'whisper', 'transcribe', estimatedAudioSeconds);
    
    await logUsage(supabase, user.id, 'transcribe', carouselId, 'success', { 
      transcriptionLength: transcription.length,
      plan,
      estimatedAudioSeconds
    }, ipAddress);

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logStep('Error in transcribe-audio function', { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
