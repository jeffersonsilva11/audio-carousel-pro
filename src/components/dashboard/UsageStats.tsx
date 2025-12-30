import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatInteger } from "@/lib/localization";

interface UsageStatsData {
  totalCarousels: number;
  completedCarousels: number;
  failedCarousels: number;
  avgProcessingTime: number;
  todayCarousels: number;
  weekCarousels: number;
  monthCarousels: number;
}

export default function UsageStats() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [stats, setStats] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all carousels
        const { data: allCarousels, error } = await supabase
          .from("carousels")
          .select("id, status, processing_time, created_at")
          .eq("user_id", user.id);

        if (error) throw error;

        const carousels = allCarousels || [];
        
        const completed = carousels.filter(c => c.status === "COMPLETED");
        const failed = carousels.filter(c => c.status === "FAILED");
        
        const processingTimes = completed
          .filter(c => c.processing_time)
          .map(c => c.processing_time as number);
        
        const avgTime = processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0;

        const todayCount = carousels.filter(c => c.created_at >= todayStart).length;
        const weekCount = carousels.filter(c => c.created_at >= weekAgo).length;
        const monthCount = carousels.filter(c => c.created_at >= monthAgo).length;

        setStats({
          totalCarousels: carousels.length,
          completedCarousels: completed.length,
          failedCarousels: failed.length,
          avgProcessingTime: avgTime,
          todayCarousels: todayCount,
          weekCarousels: weekCount,
          monthCarousels: monthCount,
        });
      } catch (error) {
        console.error("Error fetching usage stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const successRate = stats && stats.totalCarousels > 0
    ? Math.round((stats.completedCarousels / stats.totalCarousels) * 100)
    : 100;

  const statCards = [
    {
      icon: BarChart3,
      label: language === "pt-BR" ? "Total de carrosséis" : language === "es" ? "Total de carruseles" : "Total carousels",
      value: stats?.totalCarousels ?? 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: CheckCircle2,
      label: language === "pt-BR" ? "Taxa de sucesso" : language === "es" ? "Tasa de éxito" : "Success rate",
      value: `${successRate}%`,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Clock,
      label: language === "pt-BR" ? "Tempo médio" : language === "es" ? "Tiempo promedio" : "Avg. time",
      value: stats?.avgProcessingTime ? `${stats.avgProcessingTime.toFixed(1)}s` : "—",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: TrendingUp,
      label: language === "pt-BR" ? "Este mês" : language === "es" ? "Este mes" : "This month",
      value: stats?.monthCarousels ?? 0,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {language === "pt-BR" ? "Métricas de Uso" : language === "es" ? "Métricas de Uso" : "Usage Metrics"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{typeof stat.value === "number" ? formatInteger(stat.value, language) : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Mini breakdown */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            {language === "pt-BR" ? "Hoje" : language === "es" ? "Hoy" : "Today"}: <strong className="text-foreground">{formatInteger(stats?.todayCarousels ?? 0, language)}</strong>
          </span>
          <span>
            {language === "pt-BR" ? "Esta semana" : language === "es" ? "Esta semana" : "This week"}: <strong className="text-foreground">{formatInteger(stats?.weekCarousels ?? 0, language)}</strong>
          </span>
          <span>
            {language === "pt-BR" ? "Falhas" : language === "es" ? "Fallos" : "Failed"}: <strong className="text-foreground">{formatInteger(stats?.failedCarousels ?? 0, language)}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
