import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRANSLATE-CONTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, context = 'landing_page' } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetLanguage || !['en', 'es'].includes(targetLanguage)) {
      return new Response(JSON.stringify({ error: 'Invalid target language. Use "en" or "es"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    logStep('Starting translation', { targetLanguage, textLength: text.length, context });

    const languageName = targetLanguage === 'en' ? 'English' : 'Spanish';
    const contextInstructions = context === 'faq' 
      ? 'This is FAQ content for a SaaS product (Audisell - audio to carousel converter).'
      : context === 'testimonial'
      ? 'This is a customer testimonial for a SaaS product.'
      : 'This is marketing content for a landing page of a SaaS product (Audisell - audio to carousel converter).';

    const systemPrompt = `You are a professional translator specialized in marketing and SaaS content.
${contextInstructions}

RULES:
- Translate from Portuguese (Brazil) to ${languageName}
- Maintain the original tone and style
- Keep brand names unchanged (Audisell, Instagram, etc.)
- Preserve any HTML tags or special formatting
- Keep technical terms accurate
- Make the translation sound natural, not literal
- Do NOT add any explanations, just return the translated text`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate the following text to ${languageName}:\n\n${text}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('AI API error', { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits depleted. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Translation failed: ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() || '';

    logStep('Translation completed', { originalLength: text.length, translatedLength: translatedText.length });

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logStep('Error in translate-content function', { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
