import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Users, Image, CreditCard, TrendingUp } from "lucide-react";
import { formatInteger } from "@/lib/localization";

interface AdminStatsData {
  totalUsers: number;
  totalCarousels: number;
  proUsers: number;
  activeToday: number;
}

export default function AdminStats() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First, fetch admin user IDs to exclude from relevant counts
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const adminUserIds = (adminRoles || []).map(r => r.user_id);
        const adminCount = adminUserIds.length;

        // Fetch total users from profiles
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch total carousels
        const { count: carouselsCount } = await supabase
          .from("carousels")
          .select("*", { count: "exact", head: true });

        // Fetch pro users (subscriptions with active status and non-free tier, excluding admins)
        let proCount = 0;
        if (adminUserIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("status", "active")
            .neq("plan_tier", "free");

          // Filter out admin subscriptions
          proCount = (subscriptions || []).filter(s => !adminUserIds.includes(s.user_id)).length;
        } else {
          const { count } = await supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("status", "active")
            .neq("plan_tier", "free");
          proCount = count ?? 0;
        }

        // Fetch users active today (excluding admins)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: activeCarousels } = await supabase
          .from("carousels")
          .select("user_id")
          .gte("created_at", todayStart.toISOString());

        // Count unique non-admin users who created carousels today
        const uniqueActiveUsers = new Set(
          (activeCarousels || [])
            .filter(c => !adminUserIds.includes(c.user_id))
            .map(c => c.user_id)
        );

        setStats({
          totalUsers: Math.max(0, (usersCount ?? 0) - adminCount), // Exclude admins from total
          totalCarousels: carouselsCount ?? 0,
          proUsers: proCount,
          activeToday: uniqueActiveUsers.size,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      icon: Users,
      label: language === "pt-BR" ? "Total de usuários" : language === "es" ? "Total de usuarios" : "Total users",
      value: stats?.totalUsers ?? 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Image,
      label: language === "pt-BR" ? "Carrosséis gerados" : language === "es" ? "Carruseles generados" : "Carousels generated",
      value: stats?.totalCarousels ?? 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: CreditCard,
      label: language === "pt-BR" ? "Usuários Pro" : language === "es" ? "Usuarios Pro" : "Pro users",
      value: stats?.proUsers ?? 0,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: TrendingUp,
      label: language === "pt-BR" ? "Ativos hoje" : language === "es" ? "Activos hoy" : "Active today",
      value: stats?.activeToday ?? 0,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold">{formatInteger(stat.value, language)}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
