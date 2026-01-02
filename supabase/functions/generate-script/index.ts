import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  console.log(`[GENERATE-SCRIPT] ${step}${detailsStr}`);
};

// Creative tone prompts for "creative" text mode
const CREATIVE_TONE_PROMPTS = {
  emotional: `Você é roteirista de storytelling emocional para Instagram.

ESTILO:
- Linguagem íntima e confessional
- Use metáforas pessoais
- Frases curtas e impactantes
- Evite clichês corporativos
- Conecte-se emocionalmente com o leitor
- Comece com um HOOK emocional impactante (use Aversão à Perda)
- Termine com reflexão profunda ou convite à ação`,

  professional: `Você é consultor criando conteúdo educacional premium para Instagram.

ESTILO:
- Dados > Opinião (cite números quando possível)
- Use verbos de ação: "Implemente", "Analise", "Execute"
- Bullets para listas (máximo 3 itens)
- Tom profissional mas acessível
- Posicione como autoridade no assunto
- Comece com estatística surpreendente ou insight contraintuitivo
- Use o Círculo Dourado: Why → How → What`,

  provocative: `Você é provocador intelectual que desafia convenções no Instagram.

ESTILO:
- Frases curtas e diretas (estilo "soco")
- Use perguntas retóricas
- Não suavize a mensagem
- Provocação inteligente, não ofensiva
- Quebre padrões de pensamento
- Comece com pergunta controversa que incomoda
- Mostre verdades que as pessoas evitam`
};

// Text mode instructions
const TEXT_MODE_INSTRUCTIONS = {
  compact: `MODO COMPACTO:
- Mantenha o tom original do texto
- Apenas organize, reduza e divida em slides
- Não adicione dramatização ou mudanças de estilo
- Preserve a essência e linguagem do autor
- Foque em clareza e concisão`,

  creative: `MODO CRIATIVO:
- Ajuste tom, ritmo e impacto conforme o estilo escolhido
- Adicione elementos de storytelling
- Use técnicas de copywriting
- Crie conexão emocional com o leitor`,

  single: `MODO TEXTO ÚNICO:
- Gere apenas 1 slide com texto mais longo
- Estilo thread/post longo
- Mantenha fluidez narrativa
- Pode ter até 200 palavras`
};

function getSlideStructure(slideCount: number, textMode: string): string {
  if (textMode === 'single') {
    return `ESTRUTURA (1 slide único):
1. CONTENT: Texto completo e fluido (até 200 palavras)`;
  }

  if (slideCount <= 4) {
    return `ESTRUTURA (${slideCount} slides):
1. HOOK: Abertura impactante que prende atenção
${slideCount >= 2 ? '2. CONTENT: Desenvolvimento principal' : ''}
${slideCount >= 3 ? '3. CONTENT: Continuação ou exemplos' : ''}
${slideCount >= 4 ? '4. CTA: Chamada para ação ou reflexão final' : ''}`;
  }

  return `ESTRUTURA (${slideCount} slides):
1. HOOK: Abertura impactante que prende atenção
2-${slideCount - 2}. CONTENT: Desenvolvimento do conteúdo (divida de forma equilibrada)
${slideCount - 1}. CTA: Chamada para ação
${slideCount}. SIGNATURE: Nome do autor + @instagram`;
}

function getWordsPerSlide(slideCount: number, textMode: string): string {
  if (textMode === 'single') {
    return '150-250 palavras no slide único';
  }
  // More developed content with 50-100 words per slide
  if (slideCount <= 4) {
    return '60-100 palavras por slide';
  }
  if (slideCount <= 6) {
    return '50-80 palavras por slide';
  }
  if (slideCount <= 8) {
    return '40-70 palavras por slide';
  }
  return '35-60 palavras por slide';
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
  tokensInput: number,
  tokensOutput: number
) {
  try {
    // GPT-4o-mini pricing: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens
    const estimatedCost = (tokensInput / 1000) * 0.00015 + (tokensOutput / 1000) * 0.0006;

    await supabase.from('api_usage').insert({
      user_id: userId,
      api_name: apiName,
      action,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      estimated_cost_usd: estimatedCost
    });
  } catch (error) {
    logStep('Failed to log API usage', { error: String(error) });
  }
}

serve(async (req) => {
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
      await logUsage(supabase, null, 'generate_script', null, 'unauthorized', {}, ipAddress);
      throw new Error("Authentication required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      await logUsage(supabase, null, 'generate_script', null, 'unauthorized', { error: userError?.message }, ipAddress);
      throw new Error("Invalid authentication");
    }
    
    const user = userData.user;
    logStep('User authenticated', { userId: user.id });
    
    // Check rate limits
    const { plan, dailyUsed, dailyLimit, isAdmin } = await getUserPlan(supabase, user.id, user.email || '');
    logStep('Plan checked', { plan, dailyUsed, dailyLimit, isAdmin });
    
    if (!isAdmin && dailyUsed >= dailyLimit) {
      await logUsage(supabase, user.id, 'generate_script', null, 'rate_limited', { plan, dailyUsed, dailyLimit }, ipAddress);
      return new Response(JSON.stringify({ 
        error: 'Daily limit reached',
        code: 'RATE_LIMIT_EXCEEDED',
        details: { plan, dailyUsed, dailyLimit }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      transcription, 
      textMode = 'compact',
      creativeTone = 'professional',
      slideCount = 6,
      slideCountMode = 'auto',
      template = 'solid',
      language = 'pt-BR',
      carouselId = null
    } = await req.json();

    if (!transcription) {
      await logUsage(supabase, user.id, 'generate_script', carouselId, 'invalid_request', { error: 'No transcription provided' }, ipAddress);
      throw new Error('No transcription provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Determine actual slide count
    const actualSlideCount = textMode === 'single' ? 1 : 
                             slideCountMode === 'manual' ? slideCount : 
                             'auto';

    // Multi-language support: pt-BR (Brazilian Portuguese), pt-PT (Portugal Portuguese), es (Spanish), en (English)
    const languageInstructions: Record<string, string> = {
      'pt-BR': 'Escreva em português brasileiro. Use expressões e vocabulário comuns no Brasil.',
      'pt-PT': 'Escreva em português europeu. Use expressões e vocabulário comuns em Portugal.',
      'es': 'Escribe en español. Usa un español neutro comprensible en toda Latinoamérica y España.',
      'en': 'Write in English. Use clear, accessible language.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions['pt-BR'];

    // Build the system prompt based on text mode
    let styleInstructions = TEXT_MODE_INSTRUCTIONS[textMode as keyof typeof TEXT_MODE_INSTRUCTIONS] || TEXT_MODE_INSTRUCTIONS.compact;
    
    if (textMode === 'creative') {
      const tonePrompt = CREATIVE_TONE_PROMPTS[creativeTone as keyof typeof CREATIVE_TONE_PROMPTS] || CREATIVE_TONE_PROMPTS.professional;
      styleInstructions = `${styleInstructions}\n\n${tonePrompt}`;
    }

    const slideStructure = typeof actualSlideCount === 'number'
      ? getSlideStructure(actualSlideCount, textMode)
      : `ESTRUTURA AUTOMÁTICA: A IA decidirá o número ideal de slides (entre 4 e 10) baseado no conteúdo e profundidade do tema.`;

    const wordsGuide = typeof actualSlideCount === 'number'
      ? getWordsPerSlide(actualSlideCount, textMode)
      : '40-80 palavras por slide (texto desenvolvido e completo)';

    // Template context for styling
    const templateContext = template === 'gradient' 
      ? 'Os slides terão fundo com gradiente de cores.'
      : template === 'image_top'
      ? 'Os slides terão imagem no topo e texto na área inferior.'
      : 'Os slides terão fundo sólido (preto ou branco).';

    logStep(`Generating script`, { mode: textMode, tone: creativeTone, slides: actualSlideCount, template });

    const systemPrompt = `Você é um especialista em criação de carrosséis educativos e de storytelling para Instagram, conhecido por criar conteúdo que gera alto engajamento.

${languageInstruction}

${styleInstructions}

${slideStructure}

REGRAS DE FORMATAÇÃO:
- ${wordsGuide}
- Desenvolva cada ideia completamente, não apenas mencione
- Use exemplos concretos, metáforas ou analogias quando apropriado
- Cada slide deve ter valor standalone mas fluir para o próximo
- Evite bullet points excessivos - prefira texto corrido e envolvente
- O primeiro slide (HOOK) DEVE ter:
  * "subtitle": frase de contexto curta (4-8 palavras) que introduz o tema
  * "text": título principal impactante e chamativo
  * "highlightWord": palavra-chave do título para destaque visual (opcional, 1 palavra)
- O último slide (CTA) deve provocar reflexão ou ação clara

CONTEXTO DO TEMPLATE:
${templateContext}

Você deve retornar APENAS um JSON válido no seguinte formato (sem markdown, sem código, apenas JSON puro):
{
  "textMode": "${textMode}",
  "creativeTone": "${textMode === 'creative' ? creativeTone : 'none'}",
  "slides": [
    {"number": 1, "type": "HOOK", "text": "Título principal da capa", "subtitle": "Contexto curto acima do título", "highlightWord": "palavra"},
    {"number": 2, "type": "CONTENT", "text": "Texto do slide"},
    ...
  ],
  "total_slides": <número de slides gerados>
}`;

    const userPrompt = typeof actualSlideCount === 'number'
      ? `Transforme esta transcrição em exatamente ${actualSlideCount} slide${actualSlideCount > 1 ? 's' : ''} seguindo as regras acima. Desenvolva o conteúdo de forma completa e rica:\n\nTRANSCRIÇÃO:\n${transcription}`
      : `Transforme esta transcrição em um carrossel seguindo as regras acima. Decida o número ideal de slides (entre 4 e 10) baseado na profundidade do conteúdo. Desenvolva cada slide com texto completo e bem elaborado:\n\nTRANSCRIÇÃO:\n${transcription}`;

    // Use OpenAI GPT-4o-mini API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('OpenAI API error', { status: response.status, error: errorText });

      await logUsage(supabase, user.id, 'generate_script', carouselId, 'api_error', { status: response.status }, ipAddress);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: 'API key error. Please check your OpenAI API key.' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Script generation failed: ${errorText}`);
    }

    const data = await response.json();
    let scriptText = data.choices?.[0]?.message?.content || '';

    // Get token usage from OpenAI response (real values)
    const inputTokensEstimate = data.usage?.prompt_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const outputTokensEstimate = data.usage?.completion_tokens || Math.ceil(scriptText.length / 4);

    logStep('Raw script response', { preview: scriptText.substring(0, 200), inputTokens: inputTokensEstimate, outputTokens: outputTokensEstimate });

    // Clean up the response - remove markdown code blocks if present
    scriptText = scriptText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let script;
    try {
      script = JSON.parse(scriptText);
    } catch (parseError) {
      logStep('Failed to parse script JSON', { error: String(parseError) });
      // Create a fallback script structure
      const fallbackSlideCount = typeof actualSlideCount === 'number' ? actualSlideCount : 6;
      script = {
        textMode,
        creativeTone: textMode === 'creative' ? creativeTone : 'none',
        slides: textMode === 'single' 
          ? [{ number: 1, type: 'CONTENT', text: transcription.substring(0, 500) }]
          : Array.from({ length: fallbackSlideCount }, (_, i) => ({
              number: i + 1,
              type: i === 0 ? 'HOOK' : i === fallbackSlideCount - 1 ? 'CTA' : 'CONTENT',
              text: i === 0 ? 'Conteúdo gerado' : transcription.substring(i * 80, (i + 1) * 80) || 'Continuação'
            })),
        total_slides: textMode === 'single' ? 1 : fallbackSlideCount
      };
    }

    logStep('Script generated successfully', { slideCount: script.slides?.length });
    
    // Log API usage for cost tracking
    await logApiUsage(supabase, user.id, 'openai-gpt4o-mini', 'generate_script', inputTokensEstimate, outputTokensEstimate);
    
    await logUsage(supabase, user.id, 'generate_script', carouselId, 'success', { 
      slideCount: script.slides?.length,
      textMode,
      plan,
      tokensInput: inputTokensEstimate,
      tokensOutput: outputTokensEstimate
    }, ipAddress);

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logStep('Error in generate-script function', { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
