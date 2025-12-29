import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TONE_PROMPTS = {
  EMOTIONAL: `Você é roteirista de storytelling emocional para Instagram.

ESTRUTURA OBRIGATÓRIA (6 slides):
1. HOOK: Declaração emocional impactante (use Aversão à Perda)
2. SETUP: Contexto pessoal e vulnerável
3. CONFLICT: Ponto de virada dramático
4. RESOLUTION: Lição aprendida com emoção
5. CTA: Reflexão profunda ou convite à ação
6. SIGNATURE: Nome do autor + @instagram

REGRAS:
- Linguagem íntima e confessional
- Use metáforas pessoais
- Frases curtas e impactantes (15-40 palavras por slide)
- Evite clichês corporativos
- Conecte-se emocionalmente com o leitor`,

  PROFESSIONAL: `Você é consultor criando conteúdo educacional premium para Instagram.

ESTRUTURA OBRIGATÓRIA (6 slides - Círculo Dourado):
1. HOOK: Estatística surpreendente ou insight contraintuitivo
2. WHY: Por que esse tema importa (contexto e relevância)
3. HOW: Como funciona na prática (método ou framework)
4. WHAT: O que fazer concretamente (ações específicas)
5. CTA: Próximo passo claro e acionável
6. SIGNATURE: Nome + título profissional + @instagram

REGRAS:
- Dados > Opinião (cite números quando possível)
- Use verbos de ação: "Implemente", "Analise", "Execute"
- Bullets para listas (máximo 3 itens)
- Tom profissional mas acessível (20-50 palavras por slide)
- Posicione como autoridade no assunto`,

  PROVOCATIVE: `Você é provocador intelectual que desafia convenções no Instagram.

ESTRUTURA OBRIGATÓRIA (6 slides):
1. HOOK: Pergunta controversa que incomoda
2. PATTERN_BREAK: Mostre que uma crença comum está errada
3. UNCOMFORTABLE_TRUTH: Verdade que as pessoas evitam
4. REFRAME: Nova perspectiva inesperada
5. CTA: Desafio direto ao leitor
6. SIGNATURE: Nome do autor + @instagram

REGRAS:
- Frases curtas e diretas (estilo "soco") (10-35 palavras por slide)
- Use perguntas retóricas
- Não suavize a mensagem
- Provocação inteligente, não ofensiva
- Quebre padrões de pensamento`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, tone, language = 'pt-BR' } = await req.json();

    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const tonePrompt = TONE_PROMPTS[tone as keyof typeof TONE_PROMPTS] || TONE_PROMPTS.PROFESSIONAL;
    const languageInstruction = language === 'pt-BR' ? 'Escreva em português brasileiro.' : 
                                language === 'es' ? 'Escribe en español.' : 
                                'Write in English.';

    console.log(`Generating ${tone} script from transcription...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `${tonePrompt}

${languageInstruction}

Você deve retornar APENAS um JSON válido no seguinte formato (sem markdown, sem código, apenas JSON puro):
{
  "tone": "${tone}",
  "slides": [
    {"number": 1, "type": "HOOK", "text": "Texto do slide 1"},
    {"number": 2, "type": "...", "text": "Texto do slide 2"},
    {"number": 3, "type": "...", "text": "Texto do slide 3"},
    {"number": 4, "type": "...", "text": "Texto do slide 4"},
    {"number": 5, "type": "CTA", "text": "Texto do slide 5"},
    {"number": 6, "type": "SIGNATURE", "text": "@seuinstagram"}
  ],
  "total_slides": 6
}`
          },
          {
            role: 'user',
            content: `Transforme esta transcrição em um carrossel de 6 slides seguindo as regras acima:

TRANSCRIÇÃO:
${transcription}`
          }
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

    console.log('Raw script response:', scriptText.substring(0, 200) + '...');

    // Clean up the response - remove markdown code blocks if present
    scriptText = scriptText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let script;
    try {
      script = JSON.parse(scriptText);
    } catch (parseError) {
      console.error('Failed to parse script JSON:', parseError);
      // Create a fallback script structure
      script = {
        tone,
        slides: [
          { number: 1, type: 'HOOK', text: 'Conteúdo gerado' },
          { number: 2, type: 'CONTENT', text: transcription.substring(0, 100) },
          { number: 3, type: 'CONTENT', text: transcription.substring(100, 200) || 'Continuação' },
          { number: 4, type: 'CONTENT', text: transcription.substring(200, 300) || 'Mais conteúdo' },
          { number: 5, type: 'CTA', text: 'Siga para mais conteúdo!' },
          { number: 6, type: 'SIGNATURE', text: '@seuinstagram' }
        ],
        total_slides: 6
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
