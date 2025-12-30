import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return '150-200 palavras no slide único';
  }
  if (slideCount <= 4) {
    return '20-40 palavras por slide';
  }
  if (slideCount <= 6) {
    return '15-35 palavras por slide';
  }
  return '10-30 palavras por slide';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      transcription, 
      textMode = 'compact',
      creativeTone = 'professional',
      slideCount = 6,
      slideCountMode = 'auto',
      template = 'solid',
      language = 'pt-BR' 
    } = await req.json();

    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Determine actual slide count
    const actualSlideCount = textMode === 'single' ? 1 : 
                             slideCountMode === 'manual' ? slideCount : 
                             'auto';

    const languageInstruction = language === 'pt-BR' ? 'Escreva em português brasileiro.' : 
                                language === 'es' ? 'Escribe en español.' : 
                                'Write in English.';

    // Build the system prompt based on text mode
    let styleInstructions = TEXT_MODE_INSTRUCTIONS[textMode as keyof typeof TEXT_MODE_INSTRUCTIONS] || TEXT_MODE_INSTRUCTIONS.compact;
    
    if (textMode === 'creative') {
      const tonePrompt = CREATIVE_TONE_PROMPTS[creativeTone as keyof typeof CREATIVE_TONE_PROMPTS] || CREATIVE_TONE_PROMPTS.professional;
      styleInstructions = `${styleInstructions}\n\n${tonePrompt}`;
    }

    const slideStructure = typeof actualSlideCount === 'number' 
      ? getSlideStructure(actualSlideCount, textMode)
      : `ESTRUTURA AUTOMÁTICA: A IA decidirá o número ideal de slides (entre 4 e 8) baseado no conteúdo.`;

    const wordsGuide = typeof actualSlideCount === 'number'
      ? getWordsPerSlide(actualSlideCount, textMode)
      : '15-35 palavras por slide';

    // Template context for image generation hints
    const templateContext = template === 'gradient' 
      ? 'Os slides terão imagem IA de fundo com overlay gradiente.'
      : template === 'image_top'
      ? 'Os slides terão imagem IA no topo e texto na área inferior.'
      : 'Os slides terão fundo sólido (preto ou branco).';

    console.log(`Generating script: mode=${textMode}, tone=${creativeTone}, slides=${actualSlideCount}, template=${template}`);

    const systemPrompt = `Você é um especialista em criação de carrosséis para Instagram.

${languageInstruction}

${styleInstructions}

${slideStructure}

REGRAS DE FORMATAÇÃO:
- ${wordsGuide}
- Frases curtas e impactantes
- Evite parágrafos longos

CONTEXTO DO TEMPLATE:
${templateContext}

Você deve retornar APENAS um JSON válido no seguinte formato (sem markdown, sem código, apenas JSON puro):
{
  "textMode": "${textMode}",
  "creativeTone": "${textMode === 'creative' ? creativeTone : 'none'}",
  "slides": [
    {"number": 1, "type": "HOOK|CONTENT|CTA|SIGNATURE", "text": "Texto do slide"}
  ],
  "total_slides": <número de slides gerados>
}`;

    const userPrompt = typeof actualSlideCount === 'number'
      ? `Transforme esta transcrição em exatamente ${actualSlideCount} slide${actualSlideCount > 1 ? 's' : ''} seguindo as regras acima:\n\nTRANSCRIÇÃO:\n${transcription}`
      : `Transforme esta transcrição em um carrossel seguindo as regras acima. Decida o número ideal de slides (entre 4 e 8):\n\nTRANSCRIÇÃO:\n${transcription}`;

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Script generation API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Script generation failed: ${errorText}`);
    }

    const data = await response.json();
    let scriptText = data.choices?.[0]?.message?.content || '';

    console.log('Raw script response:', scriptText.substring(0, 300) + '...');

    // Clean up the response - remove markdown code blocks if present
    scriptText = scriptText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let script;
    try {
      script = JSON.parse(scriptText);
    } catch (parseError) {
      console.error('Failed to parse script JSON:', parseError);
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

    console.log('Script generated successfully with', script.slides?.length || 0, 'slides');

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-script function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
