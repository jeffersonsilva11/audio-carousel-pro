import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Tag,
  Lightbulb,
  Clock,
  Zap,
  Target,
  Users,
  Hash
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrendReport {
  id: string;
  period_days: number;
  carousels_analyzed: number;
  analysis_start: string;
  analysis_end: string;
  topics: Array<{ name: string; count: number; percentage: number; examples?: string[] }>;
  niches: Array<{ name: string; count: number; percentage: number }>;
  tones: Array<{ name: string; count: number; percentage: number }>;
  sentiments: Array<{ name: string; count: number; percentage: number }>;
  keywords: Array<{ word: string; count: number; category?: string }>;
  content_formats: Array<{ type: string; count: number; percentage: number }>;
  trends_evolution: {
    growing: Array<{ name: string; from: number; to: number; change: number }>;
    declining: Array<{ name: string; from: number; to: number; change: number }>;
    stable: Array<{ name: string; percentage: number }>;
    new: Array<{ name: string; percentage: number }>;
  };
  ai_summary: string;
  recommendations: string[];
  tokens_used: number;
  processing_time_ms: number;
  created_at: string;
}

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#6366f1", "#14b8a6", "#f97316", "#84cc16", "#06b6d4"
];

const TrendsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<TrendReport | null>(null);
  const [period, setPeriod] = useState<number>(30);
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestReport();
  }, [period]);

  const fetchLatestReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trend_reports")
        .select("*")
        .eq("period_days", period)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("analyze-trends", {
        body: { period_days: period },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      if (!result.success) throw new Error(result.error);

      setReport(result.report);
      toast({
        title: "Análise concluída!",
        description: `${result.meta.carousels_analyzed} carrosséis analisados em ${(result.meta.processing_time_ms / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze";
      toast({
        title: "Erro na análise",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector and analyze button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Tendências de Conteúdo
          </h2>
          <p className="text-muted-foreground">
            Análise de IA dos carrosséis criados pelos usuários
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
              <TabsTrigger value="90">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analisar
              </>
            )}
          </Button>
        </div>
      </div>

      {!report ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma análise encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Analisar" para gerar insights sobre os carrosséis criados
            </p>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar primeira análise
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Report metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Última análise: {format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              {report.carousels_analyzed} carrosséis analisados
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {report.tokens_used.toLocaleString()} tokens (${(report.tokens_used * 0.00015).toFixed(4)})
            </div>
          </div>

          {/* AI Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Resumo da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{report.ai_summary}</p>
            </CardContent>
          </Card>

          {/* Trend Evolution */}
          {(report.trends_evolution?.growing?.length > 0 ||
            report.trends_evolution?.declining?.length > 0 ||
            report.trends_evolution?.new?.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Evolução das Tendências
                </CardTitle>
                <CardDescription>Comparação com a análise anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Growing */}
                  {report.trends_evolution?.growing?.length > 0 && (
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        Em Alta
                      </h4>
                      <div className="space-y-2">
                        {report.trends_evolution.growing.slice(0, 5).map((t, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{t.name}</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              +{t.change.toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New */}
                  {report.trends_evolution?.new?.length > 0 && (
                    <div className="p-4 bg-blue-500/10 rounded-lg">
                      <h4 className="font-semibold text-blue-600 flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4" />
                        Novos
                      </h4>
                      <div className="space-y-2">
                        {report.trends_evolution.new.slice(0, 5).map((t, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{t.name}</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {t.percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Declining */}
                  {report.trends_evolution?.declining?.length > 0 && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                        <TrendingDown className="w-4 h-4" />
                        Em Queda
                      </h4>
                      <div className="space-y-2">
                        {report.trends_evolution.declining.slice(0, 5).map((t, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{t.name}</span>
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              {t.change.toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main charts grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Tópicos Principais
                </CardTitle>
                <CardDescription>O que os usuários estão criando</CardDescription>
              </CardHeader>
              <CardContent>
                {report.topics?.length > 0 ? (
                  <ChartContainer config={{ count: { label: "Carrosséis", color: "hsl(var(--primary))" } }} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.topics.slice(0, 8)} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>

            {/* Niches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Nichos de Mercado
                </CardTitle>
                <CardDescription>Segmentos dos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                {report.niches?.length > 0 ? (
                  <div className="flex items-center gap-8">
                    <div className="h-48 w-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={report.niches.slice(0, 6)}
                            dataKey="percentage"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                          >
                            {report.niches.slice(0, 6).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {report.niches.slice(0, 6).map((n, i) => (
                        <div key={n.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="text-sm">{n.name}: {n.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>

            {/* Tones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tom de Voz
                </CardTitle>
                <CardDescription>Como os usuários se comunicam</CardDescription>
              </CardHeader>
              <CardContent>
                {report.tones?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {report.tones.map((t, i) => (
                      <div
                        key={t.name}
                        className="p-3 rounded-lg text-center"
                        style={{ backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}
                      >
                        <p className="text-2xl font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                          {t.percentage.toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">{t.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>

            {/* Content Formats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Formatos de Conteúdo
                </CardTitle>
                <CardDescription>Estruturas mais utilizadas</CardDescription>
              </CardHeader>
              <CardContent>
                {report.content_formats?.length > 0 ? (
                  <div className="space-y-3">
                    {report.content_formats.map((f, i) => (
                      <div key={f.type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{f.type}</span>
                          <span className="text-muted-foreground">{f.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${f.percentage}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Palavras-chave Mais Usadas
              </CardTitle>
              <CardDescription>Termos frequentes nos conteúdos</CardDescription>
            </CardHeader>
            <CardContent>
              {report.keywords?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {report.keywords.slice(0, 30).map((k, i) => (
                    <Badge
                      key={k.word}
                      variant="secondary"
                      className="text-sm"
                      style={{
                        backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}20`,
                        color: CHART_COLORS[i % CHART_COLORS.length]
                      }}
                    >
                      {k.word}
                      <span className="ml-1 opacity-70">({k.count})</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {report.recommendations?.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  Recomendações da IA
                </CardTitle>
                <CardDescription>Sugestões baseadas na análise</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TrendsAnalytics;
