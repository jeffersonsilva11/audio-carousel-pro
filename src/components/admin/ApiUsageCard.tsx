import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, DollarSign, Mic, Sparkles } from "lucide-react";

interface ApiUsageStats {
  whisper: {
    totalCalls: number;
    totalSeconds: number;
    estimatedCost: number;
  };
  gemini: {
    totalCalls: number;
    tokensInput: number;
    tokensOutput: number;
    estimatedCost: number;
  };
  totalCost: number;
}

// Pricing estimates (USD)
const PRICING = {
  whisper: 0.006, // $0.006 per second
  gemini: {
    input: 0.000125, // $0.000125 per 1K tokens
    output: 0.000375, // $0.000375 per 1K tokens
  },
};

export default function ApiUsageCard() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      if (period === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data, error } = await supabase
        .from("api_usage")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const whisperData = (data || []).filter((d) => d.api_name === "whisper");
      const geminiData = (data || []).filter((d) => d.api_name === "gemini");

      const whisperSeconds = whisperData.reduce((acc, d) => acc + Number(d.audio_seconds || 0), 0);
      const whisperCost = whisperSeconds * PRICING.whisper;

      const geminiInputTokens = geminiData.reduce((acc, d) => acc + (d.tokens_input || 0), 0);
      const geminiOutputTokens = geminiData.reduce((acc, d) => acc + (d.tokens_output || 0), 0);
      const geminiCost = 
        (geminiInputTokens / 1000) * PRICING.gemini.input +
        (geminiOutputTokens / 1000) * PRICING.gemini.output;

      setStats({
        whisper: {
          totalCalls: whisperData.length,
          totalSeconds: whisperSeconds,
          estimatedCost: whisperCost,
        },
        gemini: {
          totalCalls: geminiData.length,
          tokensInput: geminiInputTokens,
          tokensOutput: geminiOutputTokens,
          estimatedCost: geminiCost,
        },
        totalCost: whisperCost + geminiCost,
      });
    } catch (error) {
      console.error("Error fetching API usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    today: language === "pt-BR" ? "Hoje" : language === "es" ? "Hoy" : "Today",
    week: language === "pt-BR" ? "7 dias" : language === "es" ? "7 días" : "7 days",
    month: language === "pt-BR" ? "Mês" : language === "es" ? "Mes" : "Month",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {language === "pt-BR" ? "Uso de APIs" : language === "es" ? "Uso de APIs" : "API Usage"}
            </CardTitle>
            <CardDescription>
              {language === "pt-BR" 
                ? "Custos estimados das APIs Whisper e Gemini" 
                : language === "es" 
                ? "Costos estimados de las APIs Whisper y Gemini" 
                : "Estimated costs for Whisper and Gemini APIs"}
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  period === p
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Whisper Card */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold">OpenAI Whisper</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "pt-BR" ? "Chamadas" : language === "es" ? "Llamadas" : "Calls"}
                </span>
                <span className="font-medium">{stats?.whisper.totalCalls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "pt-BR" ? "Segundos de áudio" : language === "es" ? "Segundos de audio" : "Audio seconds"}
                </span>
                <span className="font-medium">{(stats?.whisper.totalSeconds || 0).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">
                  {language === "pt-BR" ? "Custo estimado" : language === "es" ? "Costo estimado" : "Est. cost"}
                </span>
                <span className="font-semibold text-blue-500">
                  ${(stats?.whisper.estimatedCost || 0).toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Gemini Card */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h4 className="font-semibold">Google Gemini</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "pt-BR" ? "Chamadas" : language === "es" ? "Llamadas" : "Calls"}
                </span>
                <span className="font-medium">{stats?.gemini.totalCalls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens (in/out)</span>
                <span className="font-medium">
                  {((stats?.gemini.tokensInput || 0) / 1000).toFixed(1)}K / {((stats?.gemini.tokensOutput || 0) / 1000).toFixed(1)}K
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">
                  {language === "pt-BR" ? "Custo estimado" : language === "es" ? "Costo estimado" : "Est. cost"}
                </span>
                <span className="font-semibold text-purple-500">
                  ${(stats?.gemini.estimatedCost || 0).toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {language === "pt-BR" ? "Custo total estimado" : language === "es" ? "Costo total estimado" : "Total estimated cost"}
            </span>
            <span className="text-2xl font-bold text-accent">
              ${(stats?.totalCost || 0).toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {language === "pt-BR" 
              ? "Baseado nos preços atuais das APIs. Valores podem variar."
              : language === "es"
              ? "Basado en los precios actuales de las APIs. Los valores pueden variar."
              : "Based on current API prices. Values may vary."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
