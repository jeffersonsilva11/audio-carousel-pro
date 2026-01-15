import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3, TrendingUp, Users, Image, DollarSign, Activity, FileEdit, Clock, CheckCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyStats {
  date: string;
  carousels: number;
  users: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
  color: string;
}

interface FormatDistribution {
  format: string;
  count: number;
  color: string;
}

interface ApiCosts {
  api: string;
  cost: number;
}

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted))",
  starter: "hsl(var(--accent))",
  creator: "hsl(var(--primary))",
};

const FORMAT_COLORS: Record<string, string> = {
  POST_SQUARE: "#3b82f6",
  STORIES: "#8b5cf6",
  POST_PORTRAIT: "#ec4899",
};

const FORMAT_LABELS: Record<string, string> = {
  POST_SQUARE: "Quadrado",
  STORIES: "Stories",
  POST_PORTRAIT: "Retrato",
};

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [formatDistribution, setFormatDistribution] = useState<FormatDistribution[]>([]);
  const [apiCosts, setApiCosts] = useState<ApiCosts[]>([]);
  const [totals, setTotals] = useState({
    totalUsers: 0,
    completedCarousels: 0,
    drafts: 0,
    totalProUsers: 0,
    estimatedRevenue: 0,
    apiCostsTotal: 0,
    conversionRate: 0,
    completionRate: 0,
    avgAudioDuration: 0,
  });
  const [period, setPeriod] = useState("7d");
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch admin user IDs first to exclude from all metrics
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));
      const adminCount = adminUserIds.size;

      // Fetch carousels with more fields for advanced metrics
      const { data: carouselsData, error: carouselsError } = await supabase
        .from("carousels")
        .select("created_at, user_id, exported_at, status, audio_duration, format")
        .gte("created_at", startDate.toISOString());

      if (carouselsError) throw carouselsError;

      // Filter out admin carousels for all metrics
      const nonAdminCarousels = (carouselsData || []).filter(
        c => !adminUserIds.has(c.user_id)
      );

      // Completed carousels (status COMPLETED and exported)
      const completedCarousels = nonAdminCarousels.filter(
        c => c.status === "COMPLETED" && c.exported_at !== null
      );

      // Drafts (status COMPLETED but not exported)
      const drafts = nonAdminCarousels.filter(
        c => c.status === "COMPLETED" && c.exported_at === null
      );

      // Calculate completion rate
      const totalStarted = nonAdminCarousels.length;
      const completionRate = totalStarted > 0
        ? (completedCarousels.length / totalStarted) * 100
        : 0;

      // Calculate average audio duration
      const carouselsWithDuration = nonAdminCarousels.filter(
        c => c.audio_duration && c.audio_duration > 0
      );
      const avgAudioDuration = carouselsWithDuration.length > 0
        ? carouselsWithDuration.reduce((sum, c) => sum + (c.audio_duration || 0), 0) / carouselsWithDuration.length
        : 0;

      // Calculate format distribution
      const formatCounts: Record<string, number> = {};
      nonAdminCarousels.forEach(c => {
        if (c.format) {
          formatCounts[c.format] = (formatCounts[c.format] || 0) + 1;
        }
      });

      const processedFormatDistribution = Object.entries(formatCounts)
        .map(([fmt, count]) => ({
          format: FORMAT_LABELS[fmt] || fmt,
          count,
          color: FORMAT_COLORS[fmt] || "#6b7280",
        }))
        .sort((a, b) => b.count - a.count);

      setFormatDistribution(processedFormatDistribution);

      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch subscriptions for plan distribution
      const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select("plan_tier, status, user_id")
        .eq("status", "active");

      // Fetch API costs
      const { data: apiUsageData } = await supabase
        .from("api_usage")
        .select("api_name, estimated_cost_usd")
        .gte("created_at", startDate.toISOString());

      // Process daily stats (excluding admin carousels)
      const dailyMap: Record<string, { carousels: number; users: Set<string> }> = {};

      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
        dailyMap[date] = { carousels: 0, users: new Set() };
      }

      // Only count non-admin carousels
      nonAdminCarousels.forEach((c) => {
        const date = format(new Date(c.created_at), "yyyy-MM-dd");
        if (dailyMap[date]) {
          dailyMap[date].carousels++;
          dailyMap[date].users.add(c.user_id);
        }
      });

      const processedDailyStats = Object.entries(dailyMap).map(([date, data]) => ({
        date: format(new Date(date), "dd/MM", { locale: ptBR }),
        carousels: data.carousels,
        users: data.users.size,
      }));

      setDailyStats(processedDailyStats);

      // Process plan distribution (excluding admins)
      const planCounts: Record<string, number> = { free: 0, starter: 0, creator: 0 };

      const nonAdminSubscriptions = (subscriptionsData || []).filter(
        s => !adminUserIds.has(s.user_id)
      );

      const paidUsersCount = nonAdminSubscriptions.length;
      planCounts.free = Math.max(0, (totalUsers || 0) - paidUsersCount - adminCount);

      nonAdminSubscriptions.forEach((s) => {
        if (s.plan_tier && planCounts[s.plan_tier] !== undefined) {
          planCounts[s.plan_tier]++;
        }
      });

      const processedPlanDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        count,
        color: PLAN_COLORS[plan],
      }));

      setPlanDistribution(processedPlanDistribution);

      // Process API costs
      const apiCostsMap: Record<string, number> = {};
      let totalApiCost = 0;

      apiUsageData?.forEach((a) => {
        apiCostsMap[a.api_name] = (apiCostsMap[a.api_name] || 0) + (a.estimated_cost_usd || 0);
        totalApiCost += a.estimated_cost_usd || 0;
      });

      const processedApiCosts = Object.entries(apiCostsMap)
        .map(([api, cost]) => ({ api, cost }))
        .sort((a, b) => b.cost - a.cost);

      setApiCosts(processedApiCosts);

      // Calculate totals
      const proUsers = paidUsersCount;
      const estimatedRevenue =
        (planCounts.starter * 29.90) +
        (planCounts.creator * 99.90);

      const nonAdminUsers = Math.max(0, (totalUsers || 0) - adminCount);
      const conversionRate = nonAdminUsers > 0 ? (proUsers / nonAdminUsers) * 100 : 0;

      setTotals({
        totalUsers: nonAdminUsers,
        completedCarousels: completedCarousels.length,
        drafts: drafts.length,
        totalProUsers: proUsers,
        estimatedRevenue,
        apiCostsTotal: totalApiCost,
        conversionRate,
        completionRate,
        avgAudioDuration,
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Erro ao carregar analytics",
        description: "Não foi possível carregar os dados de analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      {/* Period selector */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Usuários</span>
            </div>
            <p className="text-2xl font-bold">{totals.totalUsers.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Image className="w-4 h-4" />
              <span className="text-xs">Finalizados</span>
            </div>
            <p className="text-2xl font-bold">{totals.completedCarousels.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileEdit className="w-4 h-4" />
              <span className="text-xs">Rascunhos</span>
            </div>
            <p className="text-2xl font-bold">{totals.drafts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Pro Users</span>
            </div>
            <p className="text-2xl font-bold">{totals.totalProUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">MRR (est.)</span>
            </div>
            <p className="text-2xl font-bold">R$ {totals.estimatedRevenue.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Conversão</span>
            </div>
            <p className="text-2xl font-bold">{totals.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Taxa de conclusão</span>
            </div>
            <p className="text-2xl font-bold">{totals.completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Duração média</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(totals.avgAudioDuration)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Custo API</span>
            </div>
            <p className="text-2xl font-bold">${totals.apiCostsTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Image className="w-4 h-4" />
              <span className="text-xs">Carrosséis/usuário</span>
            </div>
            <p className="text-2xl font-bold">
              {totals.totalUsers > 0
                ? ((totals.completedCarousels + totals.drafts) / totals.totalUsers).toFixed(1)
                : "0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily carousels chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carrosséis por dia</CardTitle>
            <CardDescription>Volume de carrosséis criados (excl. admins)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ carousels: { label: "Carrosséis", color: "hsl(var(--accent))" } }} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="carousels" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Active users chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários ativos por dia</CardTitle>
            <CardDescription>Usuários que criaram carrosséis (excl. admins)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ users: { label: "Usuários", color: "hsl(var(--primary))" } }} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de planos</CardTitle>
            <CardDescription>Usuários por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {planDistribution.map((p) => (
                  <div key={p.plan} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm">{p.plan}: {p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatos mais usados</CardTitle>
            <CardDescription>Distribuição por formato de carrossel</CardDescription>
          </CardHeader>
          <CardContent>
            {formatDistribution.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <div className="flex items-center gap-8">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formatDistribution}
                        dataKey="count"
                        nameKey="format"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {formatDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {formatDistribution.map((f) => (
                    <div key={f.format} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className="text-sm">{f.format}: {f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API costs breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Custos de API</CardTitle>
            <CardDescription>Gastos estimados por serviço</CardDescription>
          </CardHeader>
          <CardContent>
            {apiCosts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sem dados de custo no período</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apiCosts.map((api) => (
                  <div key={api.api} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium capitalize">{api.api}</span>
                    <span className="text-sm text-muted-foreground">${api.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
