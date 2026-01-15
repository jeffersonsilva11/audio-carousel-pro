import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import OpenAI from "https://esm.sh/openai@4.28.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-TRENDS] ${step}${detailsStr}`);
};

// OpenAI prompt for trend analysis
const ANALYSIS_PROMPT = `Você é um analista de dados especializado em tendências de conteúdo digital.

Analise as transcrições de carrosséis do Instagram fornecidas e extraia insights estruturados.

REGRAS:
- Identifique padrões e tendências nos conteúdos
- Agrupe por categorias semânticas
- Calcule percentuais aproximados
- Identifique o tom de voz predominante
- Extraia keywords relevantes
- Forneça um resumo executivo

FORMATO DE RESPOSTA (JSON válido):
{
  "topics": [
    {"name": "Nome do Tópico", "count": 10, "percentage": 25, "examples": ["exemplo1", "exemplo2"]}
  ],
  "niches": [
    {"name": "Nome do Nicho", "count": 8, "percentage": 20}
  ],
  "tones": [
    {"name": "Profissional|Casual|Motivacional|Educativo|Vendas", "count": 15, "percentage": 37}
  ],
  "sentiments": [
    {"name": "Positivo|Neutro|Urgente|Inspirador", "count": 12, "percentage": 30}
  ],
  "keywords": [
    {"word": "palavra", "count": 5, "category": "categoria"}
  ],
  "content_formats": [
    {"type": "Dicas|Lista|História|Tutorial|CTA|Depoimento", "count": 10, "percentage": 25}
  ],
  "summary": "Resumo executivo de 2-3 parágrafos sobre as tendências identificadas",
  "recommendations": [
    "Recomendação 1 para o produto baseada nos dados",
    "Recomendação 2",
    "Recomendação 3"
  ]
}

Analise os seguintes conteúdos:`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: getCorsHeaders(req)
    });
  }

  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  try {
    logStep("Function started");

    // Initialize clients
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    logStep("Admin authenticated", { userId: userData.user.id });

    // Parse request body
    const { period_days = 30 } = await req.json();

    if (![7, 30, 90].includes(period_days)) {
      throw new Error("Invalid period. Use 7, 30, or 90 days.");
    }

    // Check rate limit
    const { data: canRun } = await supabase.rpc("can_run_trend_analysis", {
      p_period_days: period_days
    });

    if (!canRun) {
      const { data: lastReport } = await supabase
        .from("trend_reports")
        .select("created_at")
        .eq("period_days", period_days)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      throw new Error(
        `Rate limit: Please wait before running another analysis. Last analysis: ${lastReport?.created_at || 'unknown'}`
      );
    }

    // Get admin user IDs to exclude
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = (adminRoles || []).map(r => r.user_id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period_days);

    logStep("Fetching carousels", { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

    // Fetch carousels with transcriptions (excluding admins)
    let query = supabase
      .from("carousels")
      .select("id, transcription, tone, created_at, user_id")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .not("transcription", "is", null)
      .neq("transcription", "")
      .order("created_at", { ascending: false });

    // Exclude admin carousels
    if (adminUserIds.length > 0) {
      query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
    }

    const { data: carousels, error: carouselsError } = await query.limit(200);

    if (carouselsError) {
      throw new Error(`Failed to fetch carousels: ${carouselsError.message}`);
    }

    if (!carousels || carousels.length === 0) {
      logStep("No carousels found for analysis");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No carousels found in the selected period"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Carousels fetched", { count: carousels.length });

    // Prepare transcriptions for analysis (limit to avoid token overflow)
    const transcriptions = carousels
      .filter(c => c.transcription && c.transcription.length > 50)
      .slice(0, 100) // Max 100 transcriptions
      .map((c, i) => `[${i + 1}] ${c.transcription.slice(0, 500)}`) // Truncate long transcriptions
      .join("\n\n---\n\n");

    if (transcriptions.length < 100) {
      throw new Error("Not enough content to analyze");
    }

    logStep("Sending to OpenAI for analysis");

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: ANALYSIS_PROMPT
        },
        {
          role: "user",
          content: transcriptions
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const analysisText = completion.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No response from OpenAI");
    }

    const tokensUsed = completion.usage?.total_tokens || 0;
    logStep("OpenAI response received", { tokensUsed });

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      logStep("Failed to parse OpenAI response", { response: analysisText.slice(0, 500) });
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Get previous report for trend evolution comparison
    const { data: previousReport } = await supabase
      .from("trend_reports")
      .select("topics, niches, keywords")
      .eq("period_days", period_days)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate trend evolution if previous report exists
    let trendsEvolution = { growing: [], declining: [], stable: [], new: [] };

    if (previousReport) {
      const prevTopics = new Map((previousReport.topics || []).map((t: { name: string; percentage: number }) => [t.name.toLowerCase(), t.percentage]));
      const currTopics = new Map((analysis.topics || []).map((t: { name: string; percentage: number }) => [t.name.toLowerCase(), t.percentage]));

      for (const [name, currPct] of currTopics) {
        const prevPct = prevTopics.get(name);
        if (prevPct === undefined) {
          trendsEvolution.new.push({ name, percentage: currPct });
        } else if (currPct > prevPct + 5) {
          trendsEvolution.growing.push({ name, from: prevPct, to: currPct, change: currPct - prevPct });
        } else if (currPct < prevPct - 5) {
          trendsEvolution.declining.push({ name, from: prevPct, to: currPct, change: currPct - prevPct });
        } else {
          trendsEvolution.stable.push({ name, percentage: currPct });
        }
      }
    }

    // Sample transcriptions for reference
    const sampleTranscriptions = carousels
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        preview: c.transcription?.slice(0, 200) + "...",
        tone: c.tone
      }));

    const processingTime = Date.now() - startTime;

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from("trend_reports")
      .insert({
        period_days,
        carousels_analyzed: carousels.length,
        analysis_start: startDate.toISOString().split("T")[0],
        analysis_end: endDate.toISOString().split("T")[0],
        topics: analysis.topics || [],
        niches: analysis.niches || [],
        tones: analysis.tones || [],
        sentiments: analysis.sentiments || [],
        keywords: analysis.keywords || [],
        content_formats: analysis.content_formats || [],
        trends_evolution: trendsEvolution,
        ai_summary: analysis.summary || "",
        recommendations: analysis.recommendations || [],
        sample_transcriptions: sampleTranscriptions,
        tokens_used: tokensUsed,
        processing_time_ms: processingTime,
        model_used: "gpt-4o-mini",
        status: "completed",
        triggered_by: userData.user.id
      })
      .select()
      .single();

    if (saveError) {
      logStep("Failed to save report", { error: saveError.message });
      throw new Error(`Failed to save report: ${saveError.message}`);
    }

    logStep("Analysis completed successfully", {
      reportId: savedReport.id,
      carouselsAnalyzed: carousels.length,
      tokensUsed,
      processingTimeMs: processingTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        report: savedReport,
        meta: {
          carousels_analyzed: carousels.length,
          tokens_used: tokensUsed,
          processing_time_ms: processingTime,
          estimated_cost_usd: (tokensUsed * 0.00015).toFixed(4) // GPT-4o-mini pricing
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
