import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldOff, Search, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  user_id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
}

export default function RoleManagement() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    action: "promote" | "demote";
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, name")
        .order("name");

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminUserIds = new Set((adminRoles || []).map((r) => r.user_id));

      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        name: p.name,
        isAdmin: adminUserIds.has(p.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, isAdmin: true } : u))
      );

      toast({
        title: language === "pt-BR" ? "Usuário promovido" : language === "es" ? "Usuario promovido" : "User promoted",
        description: language === "pt-BR" 
          ? "O usuário agora é administrador" 
          : language === "es" 
          ? "El usuario ahora es administrador" 
          : "User is now an admin",
      });
    } catch (error) {
      console.error("Error promoting user:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" 
          ? "Não foi possível promover o usuário" 
          : language === "es" 
          ? "No se pudo promover al usuario" 
          : "Could not promote user",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
      setConfirmDialog(null);
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, isAdmin: false } : u))
      );

      toast({
        title: language === "pt-BR" ? "Permissão removida" : language === "es" ? "Permiso removido" : "Permission removed",
        description: language === "pt-BR" 
          ? "O usuário não é mais administrador" 
          : language === "es" 
          ? "El usuario ya no es administrador" 
          : "User is no longer an admin",
      });
    } catch (error) {
      console.error("Error demoting user:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" 
          ? "Não foi possível remover a permissão" 
          : language === "es" 
          ? "No se pudo remover el permiso" 
          : "Could not remove permission",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
      setConfirmDialog(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.email?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (u.name?.toLowerCase().includes(search.toLowerCase()) || false)
  );

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {language === "pt-BR" ? "Gerenciar Administradores" : language === "es" ? "Gestionar Administradores" : "Manage Administrators"}
          </CardTitle>
          <CardDescription>
            {language === "pt-BR" 
              ? "Promova ou remova permissões de administrador" 
              : language === "es" 
              ? "Promueve o remueve permisos de administrador" 
              : "Promote or remove admin permissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === "pt-BR" ? "Buscar por email ou nome..." : language === "es" ? "Buscar por email o nombre..." : "Search by email or name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.isAdmin ? "bg-accent/20" : "bg-muted"}`}>
                    {user.isAdmin ? (
                      <Shield className="w-5 h-5 text-accent" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name || "—"}</p>
                      {user.isAdmin && (
                        <Badge variant="default" className="text-xs">Admin</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email || "—"}</p>
                  </div>
                </div>

                <Button
                  variant={user.isAdmin ? "destructive" : "outline"}
                  size="sm"
                  disabled={processing === user.user_id}
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      userId: user.user_id,
                      email: user.email || "",
                      action: user.isAdmin ? "demote" : "promote",
                    })
                  }
                >
                  {processing === user.user_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user.isAdmin ? (
                    <>
                      <ShieldOff className="w-4 h-4 mr-1" />
                      {language === "pt-BR" ? "Remover" : language === "es" ? "Remover" : "Remove"}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-1" />
                      {language === "pt-BR" ? "Promover" : language === "es" ? "Promover" : "Promote"}
                    </>
                  )}
                </Button>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {language === "pt-BR" ? "Nenhum usuário encontrado" : language === "es" ? "No se encontraron usuarios" : "No users found"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "promote"
                ? language === "pt-BR" ? "Promover a administrador?" : language === "es" ? "¿Promover a administrador?" : "Promote to admin?"
                : language === "pt-BR" ? "Remover permissão de admin?" : language === "es" ? "¿Remover permiso de admin?" : "Remove admin permission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "promote"
                ? language === "pt-BR" 
                  ? `${confirmDialog?.email} terá acesso total ao painel administrativo.`
                  : language === "es"
                  ? `${confirmDialog?.email} tendrá acceso completo al panel administrativo.`
                  : `${confirmDialog?.email} will have full access to the admin panel.`
                : language === "pt-BR"
                ? `${confirmDialog?.email} perderá acesso ao painel administrativo.`
                : language === "es"
                ? `${confirmDialog?.email} perderá acceso al panel administrativo.`
                : `${confirmDialog?.email} will lose access to the admin panel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "pt-BR" ? "Cancelar" : language === "es" ? "Cancelar" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog?.action === "promote"
                  ? promoteToAdmin(confirmDialog.userId)
                  : demoteFromAdmin(confirmDialog!.userId)
              }
              className={confirmDialog?.action === "demote" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmDialog?.action === "promote"
                ? language === "pt-BR" ? "Promover" : language === "es" ? "Promover" : "Promote"
                : language === "pt-BR" ? "Remover" : language === "es" ? "Remover" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
