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
        // Fetch total users from profiles
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch total carousels
        const { count: carouselsCount } = await supabase
          .from("carousels")
          .select("*", { count: "exact", head: true });

        // Fetch pro users (subscriptions with active status and non-free tier)
        const { count: proCount } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .neq("plan_tier", "free");

        // Fetch users active today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { count: activeCount } = await supabase
          .from("carousels")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString());

        setStats({
          totalUsers: usersCount ?? 0,
          totalCarousels: carouselsCount ?? 0,
          proUsers: proCount ?? 0,
          activeToday: activeCount ?? 0,
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
