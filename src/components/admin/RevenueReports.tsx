import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { formatLocalizedDate, formatCurrency } from "@/lib/localization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  TrendingUp,
  Users,
  CreditCard,
  DollarSign,
  Calendar,
  Crown,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  manual_subscriptions: number;
  by_plan: Record<string, number>;
}

interface RevenueStats {
  mrr: number; // Monthly Recurring Revenue in cents
  total_revenue: number;
  avg_subscription_value: number;
  churn_rate: number;
}

interface CouponStats {
  total_coupons: number;
  active_coupons: number;
  total_uses: number;
  total_discount_given: number;
}

interface RecentSubscription {
  id: string;
  user_email: string;
  plan_tier: string;
  created_at: string;
  is_manual: boolean;
  status: string;
}

export default function RevenueReports() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats>({
    total_subscriptions: 0,
    active_subscriptions: 0,
    manual_subscriptions: 0,
    by_plan: {},
  });

  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    mrr: 0,
    total_revenue: 0,
    avg_subscription_value: 0,
    churn_rate: 0,
  });

  const [couponStats, setCouponStats] = useState<CouponStats>({
    total_coupons: 0,
    active_coupons: 0,
    total_uses: 0,
    total_discount_given: 0,
  });

  const [recentSubscriptions, setRecentSubscriptions] = useState<RecentSubscription[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAllStats();
  }, [period]);

  // First fetch admin user IDs to exclude them from revenue
  const fetchAdminUserIds = async (): Promise<string[]> => {
    try {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const ids = adminRoles?.map(r => r.user_id) || [];
      setAdminUserIds(ids);
      return ids;
    } catch (error) {
      console.error("Error fetching admin user IDs:", error);
      return [];
    }
  };

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      // First get admin IDs to exclude from revenue calculations
      const adminIds = await fetchAdminUserIds();

      await Promise.all([
        fetchSubscriptionStats(adminIds),
        fetchRevenueStats(adminIds),
        fetchCouponStats(),
        fetchRecentSubscriptions(adminIds),
      ]);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStats = async (adminIds: string[]) => {
    try {
      // Get subscription counts (excluding admins)
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("plan_tier, status, user_id");

      if (error) throw error;

      // Filter out admin users
      const nonAdminSubs = subs?.filter((s) => !adminIds.includes(s.user_id)) || [];
      const active = nonAdminSubs.filter((s) => s.status === "active");
      const byPlan: Record<string, number> = {};

      active.forEach((s) => {
        byPlan[s.plan_tier] = (byPlan[s.plan_tier] || 0) + 1;
      });

      // Get manual subscriptions (excluding admins)
      const { data: manualSubs } = await supabase
        .from("manual_subscriptions")
        .select("id, user_id")
        .eq("is_active", true);

      const nonAdminManualSubs = manualSubs?.filter((s) => !adminIds.includes(s.user_id)) || [];

      setSubscriptionStats({
        total_subscriptions: nonAdminSubs.length,
        active_subscriptions: active.length,
        manual_subscriptions: nonAdminManualSubs.length,
        by_plan: byPlan,
      });
    } catch (error) {
      console.error("Error fetching subscription stats:", error);
    }
  };

  const fetchRevenueStats = async (adminIds: string[]) => {
    try {
      // Get plan configs for pricing
      const { data: plans } = await supabase
        .from("plans_config")
        .select("tier, price_brl");

      const planPrices: Record<string, number> = {};
      plans?.forEach((p) => {
        planPrices[p.tier] = p.price_brl;
      });

      // Get active subscriptions (excluding admins)
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("plan_tier, user_id")
        .eq("status", "active");

      // Filter out admin users
      const nonAdminSubs = subs?.filter((s) => !adminIds.includes(s.user_id)) || [];

      // Calculate MRR (excluding admin revenue)
      let mrr = 0;
      nonAdminSubs.forEach((s) => {
        mrr += planPrices[s.plan_tier] || 0;
      });

      // Get cancelled subscriptions for churn rate (excluding admins)
      const periodDays = parseInt(period.replace("d", "")) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const { data: cancelled } = await supabase
        .from("subscriptions")
        .select("id, user_id")
        .eq("status", "cancelled")
        .gte("updated_at", startDate.toISOString());

      const nonAdminCancelled = cancelled?.filter((s) => !adminIds.includes(s.user_id)) || [];

      const churnRate = nonAdminSubs.length > 0
        ? (nonAdminCancelled.length / nonAdminSubs.length) * 100
        : 0;

      setRevenueStats({
        mrr,
        total_revenue: mrr * 12, // Estimated annual
        avg_subscription_value: nonAdminSubs.length > 0 ? mrr / nonAdminSubs.length : 0,
        churn_rate: churnRate,
      });
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
    }
  };

  const fetchCouponStats = async () => {
    try {
      const { data: coupons } = await supabase
        .from("coupons")
        .select("id, is_active, current_uses");

      const { data: uses } = await supabase
        .from("coupon_uses")
        .select("discount_applied");

      const totalDiscount = uses?.reduce((acc, u) => acc + u.discount_applied, 0) || 0;

      setCouponStats({
        total_coupons: coupons?.length || 0,
        active_coupons: coupons?.filter((c) => c.is_active).length || 0,
        total_uses: coupons?.reduce((acc, c) => acc + c.current_uses, 0) || 0,
        total_discount_given: totalDiscount,
      });
    } catch (error) {
      console.error("Error fetching coupon stats:", error);
    }
  };

  const fetchRecentSubscriptions = async (adminIds: string[]) => {
    try {
      // Get recent Stripe subscriptions (excluding admins)
      const { data: stripeSubs } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan_tier, created_at, status")
        .order("created_at", { ascending: false })
        .limit(10);

      // Get recent manual subscriptions (excluding admins)
      const { data: manualSubs } = await supabase
        .from("manual_subscriptions")
        .select("id, user_id, plan_tier, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(10);

      // Filter out admin users and combine
      const nonAdminStripeSubs = (stripeSubs || []).filter((s) => !adminIds.includes(s.user_id));
      const nonAdminManualSubs = (manualSubs || []).filter((s) => !adminIds.includes(s.user_id));

      // Combine and sort
      const allSubs = [
        ...nonAdminStripeSubs.map((s) => ({ ...s, is_manual: false, status: s.status })),
        ...nonAdminManualSubs.map((s) => ({ ...s, is_manual: true, status: s.is_active ? "active" : "inactive" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch user emails
      const subsWithEmails = await Promise.all(
        allSubs.slice(0, 10).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", sub.user_id)
            .single();

          return {
            ...sub,
            user_email: profile?.email || "—",
          };
        })
      );

      setRecentSubscriptions(subsWithEmails);
    } catch (error) {
      console.error("Error fetching recent subscriptions:", error);
    }
  };

  const formatMoney = (cents: number) => {
    return formatCurrency(cents, language);
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
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {language === "pt-BR" ? "Relatórios de Receita" : "Revenue Reports"}
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{language === "pt-BR" ? "Últimos 7 dias" : "Last 7 days"}</SelectItem>
            <SelectItem value="30d">{language === "pt-BR" ? "Últimos 30 dias" : "Last 30 days"}</SelectItem>
            <SelectItem value="90d">{language === "pt-BR" ? "Últimos 90 dias" : "Last 90 days"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(revenueStats.mrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "pt-BR" ? "Receita Mensal Recorrente" : "Monthly Recurring Revenue"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              {language === "pt-BR" ? "Assinantes Ativos" : "Active Subscribers"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStats.active_subscriptions + subscriptionStats.manual_subscriptions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscriptionStats.manual_subscriptions} {language === "pt-BR" ? "manuais" : "manual"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {language === "pt-BR" ? "Ticket Médio" : "Avg. Value"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(revenueStats.avg_subscription_value)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "pt-BR" ? "por assinatura" : "per subscription"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {revenueStats.churn_rate > 5 ? (
                <ArrowDownRight className="w-4 h-4 text-destructive" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              )}
              Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${revenueStats.churn_rate > 5 ? "text-destructive" : "text-green-500"}`}>
              {revenueStats.churn_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "pt-BR" ? `nos últimos ${period.replace("d", " dias")}` : `in last ${period.replace("d", " days")}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution & Coupons */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              {language === "pt-BR" ? "Distribuição por Plano" : "Distribution by Plan"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(subscriptionStats.by_plan).length > 0 ? (
                Object.entries(subscriptionStats.by_plan).map(([plan, count]) => {
                  const total = subscriptionStats.active_subscriptions || 1;
                  const percentage = (count / total) * 100;

                  return (
                    <div key={plan} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{plan}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  {language === "pt-BR" ? "Nenhuma assinatura ativa" : "No active subscriptions"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {language === "pt-BR" ? "Estatísticas de Cupons" : "Coupon Statistics"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{couponStats.active_coupons}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR" ? "Cupons Ativos" : "Active Coupons"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{couponStats.total_uses}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR" ? "Total de Usos" : "Total Uses"}
                </p>
              </div>
              <div className="col-span-2 p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{formatMoney(couponStats.total_discount_given)}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR" ? "Descontos Concedidos" : "Discounts Given"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === "pt-BR" ? "Assinaturas Recentes" : "Recent Subscriptions"}
          </CardTitle>
          <CardDescription>
            {language === "pt-BR"
              ? "Últimas assinaturas criadas"
              : "Latest subscriptions created"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSubscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "pt-BR" ? "Usuário" : "User"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Plano" : "Plan"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Tipo" : "Type"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Data" : "Date"}</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        <Crown className="w-3 h-3 mr-1" />
                        {sub.plan_tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.is_manual ? (
                        <Badge variant="secondary">
                          <Gift className="w-3 h-3 mr-1" />
                          Manual
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Stripe
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatLocalizedDate(sub.created_at, language, "short")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {language === "pt-BR" ? "Nenhuma assinatura encontrada" : "No subscriptions found"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
