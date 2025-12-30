import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { formatLocalizedDate } from "@/lib/localization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown } from "lucide-react";

interface UserData {
  user_id: string;
  email: string | null;
  name: string | null;
  plan_tier: string | null;
  created_at: string | null;
  carousels_count: number;
}

export default function UsersTable() {
  const { language } = useLanguage();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch profiles with carousel counts
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, email, name, plan_tier, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Fetch carousel counts for each user
        const usersWithCounts = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { count } = await supabase
              .from("carousels")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.user_id);

            return {
              ...profile,
              carousels_count: count ?? 0,
            };
          })
        );

        setUsers(usersWithCounts);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getPlanBadge = (plan: string | null) => {
    const planTier = plan || "free";
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      free: { variant: "outline", label: "Free" },
      starter: { variant: "secondary", label: "Starter" },
      creator: { variant: "default", label: "Creator" },
      agency: { variant: "destructive", label: "Agency" },
    };
    const config = variants[planTier] || variants.free;
    return (
      <Badge variant={config.variant} className="gap-1">
        {planTier !== "free" && <Crown className="w-3 h-3" />}
        {config.label}
      </Badge>
    );
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
        <CardTitle>
          {language === "pt-BR" ? "Usuários recentes" : language === "es" ? "Usuarios recientes" : "Recent users"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === "pt-BR" ? "Usuário" : language === "es" ? "Usuario" : "User"}</TableHead>
              <TableHead>{language === "pt-BR" ? "Plano" : language === "es" ? "Plan" : "Plan"}</TableHead>
              <TableHead className="text-center">{language === "pt-BR" ? "Carrosséis" : language === "es" ? "Carruseles" : "Carousels"}</TableHead>
              <TableHead>{language === "pt-BR" ? "Cadastro" : language === "es" ? "Registro" : "Registered"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{user.email || "—"}</p>
                  </div>
                </TableCell>
                <TableCell>{getPlanBadge(user.plan_tier)}</TableCell>
                <TableCell className="text-center font-medium">{user.carousels_count}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.created_at ? formatLocalizedDate(user.created_at, language, "short") : "—"}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {language === "pt-BR" ? "Nenhum usuário encontrado" : language === "es" ? "No se encontraron usuarios" : "No users found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
