import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Users, Image, CreditCard, TrendingUp, FileEdit, Clock } from "lucide-react";
import { formatInteger } from "@/lib/localization";

interface AdminStatsData {
  totalUsers: number;
  completedCarousels: number;
  drafts: number;
  proUsers: number;
  activeToday: number;
  avgAudioDuration: number;
}

export default function AdminStats() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First, fetch admin user IDs to exclude from all metrics
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const adminUserIds = (adminRoles || []).map(r => r.user_id);
        const adminCount = adminUserIds.length;

        // Fetch total users from profiles (excluding admins)
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch all carousels to filter and calculate metrics
        const { data: allCarousels } = await supabase
          .from("carousels")
          .select("user_id, exported_at, status, audio_duration")
          .eq("status", "COMPLETED");

        // Filter out admin carousels
        const nonAdminCarousels = (allCarousels || []).filter(
          c => !adminUserIds.includes(c.user_id)
        );

        // Completed (exported) carousels from non-admin users
        const completedCarousels = nonAdminCarousels.filter(c => c.exported_at !== null);

        // Drafts (not exported) from non-admin users
        const drafts = nonAdminCarousels.filter(c => c.exported_at === null);

        // Calculate average audio duration (in seconds)
        const carouselsWithDuration = nonAdminCarousels.filter(c => c.audio_duration && c.audio_duration > 0);
        const avgAudioDuration = carouselsWithDuration.length > 0
          ? carouselsWithDuration.reduce((sum, c) => sum + (c.audio_duration || 0), 0) / carouselsWithDuration.length
          : 0;

        // Fetch pro users (subscriptions with active status and non-free tier, excluding admins)
        let proCount = 0;
        if (adminUserIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("status", "active")
            .neq("plan_tier", "free");

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

        const uniqueActiveUsers = new Set(
          (activeCarousels || [])
            .filter(c => !adminUserIds.includes(c.user_id))
            .map(c => c.user_id)
        );

        setStats({
          totalUsers: Math.max(0, (usersCount ?? 0) - adminCount),
          completedCarousels: completedCarousels.length,
          drafts: drafts.length,
          proUsers: proCount,
          activeToday: uniqueActiveUsers.size,
          avgAudioDuration,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statCards = [
    {
      icon: Users,
      label: language === "pt-BR" ? "Total de usuários" : language === "es" ? "Total de usuarios" : "Total users",
      value: stats?.totalUsers ?? 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      isNumber: true,
    },
    {
      icon: Image,
      label: language === "pt-BR" ? "Carrosséis finalizados" : language === "es" ? "Carruseles finalizados" : "Completed carousels",
      value: stats?.completedCarousels ?? 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      isNumber: true,
    },
    {
      icon: FileEdit,
      label: language === "pt-BR" ? "Rascunhos" : language === "es" ? "Borradores" : "Drafts",
      value: stats?.drafts ?? 0,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      isNumber: true,
    },
    {
      icon: CreditCard,
      label: language === "pt-BR" ? "Usuários Pro" : language === "es" ? "Usuarios Pro" : "Pro users",
      value: stats?.proUsers ?? 0,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      isNumber: true,
    },
    {
      icon: TrendingUp,
      label: language === "pt-BR" ? "Ativos hoje" : language === "es" ? "Activos hoy" : "Active today",
      value: stats?.activeToday ?? 0,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      isNumber: true,
    },
    {
      icon: Clock,
      label: language === "pt-BR" ? "Duração média" : language === "es" ? "Duración promedio" : "Avg duration",
      value: formatDuration(stats?.avgAudioDuration ?? 0),
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      isNumber: false,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {stat.isNumber ? formatInteger(stat.value as number, language) : stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
