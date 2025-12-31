import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Shield, 
  Loader2, 
  Users, 
  Activity, 
  CreditCard,
  AlertTriangle,
  Flag,
  DollarSign,
  UserCog,
  Settings,
  FileText,
  HelpCircle,
  Quote,
  Building,
  BarChart3
} from "lucide-react";
import { BRAND } from "@/lib/constants";
import AdminStats from "@/components/admin/AdminStats";
import UsersTable from "@/components/admin/UsersTable";
import UsageLogsTable from "@/components/admin/UsageLogsTable";
import StripeEventsTable from "@/components/admin/StripeEventsTable";
import FeatureFlagsCard from "@/components/admin/FeatureFlagsCard";
import ApiUsageCard from "@/components/admin/ApiUsageCard";
import RoleManagement from "@/components/admin/RoleManagement";
import AppSettingsCard from "@/components/admin/AppSettingsCard";
import LandingContentManager from "@/components/admin/LandingContentManager";
import FAQManager from "@/components/admin/FAQManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import TrustedCompaniesManager from "@/components/admin/TrustedCompaniesManager";
import AdvancedAnalytics from "@/components/admin/AdvancedAnalytics";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">
          {language === "pt-BR" ? "Acesso negado" : language === "es" ? "Acceso denegado" : "Access denied"}
        </h1>
        <p className="text-muted-foreground">
          {language === "pt-BR" 
            ? "Você não tem permissão para acessar esta página." 
            : language === "es" 
            ? "No tienes permiso para acceder a esta página." 
            : "You don't have permission to access this page."}
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          {language === "pt-BR" ? "Voltar ao Dashboard" : language === "es" ? "Volver al Dashboard" : "Back to Dashboard"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <h1 className="font-semibold">
                  {language === "pt-BR" ? "Painel Admin" : language === "es" ? "Panel Admin" : "Admin Panel"}
                </h1>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === "pt-BR" ? "Painel Administrativo" : language === "es" ? "Panel Administrativo" : "Admin Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {language === "pt-BR" 
              ? `Gerencie usuários, visualize métricas e monitore o ${BRAND.name}` 
              : language === "es" 
              ? `Gestiona usuarios, visualiza métricas y monitorea ${BRAND.name}` 
              : `Manage users, view metrics and monitor ${BRAND.name}`}
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <AdminStats />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="landing" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="landing" className="gap-2">
              <FileText className="w-4 h-4" />
              Landing
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="gap-2">
              <Quote className="w-4 h-4" />
              Depoimentos
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building className="w-4 h-4" />
              Parceiros
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              {language === "pt-BR" ? "Usuários" : language === "es" ? "Usuarios" : "Users"}
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <UserCog className="w-4 h-4" />
              {language === "pt-BR" ? "Permissões" : language === "es" ? "Permisos" : "Permissions"}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {language === "pt-BR" ? "Config" : language === "es" ? "Config" : "Settings"}
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-2">
              <Flag className="w-4 h-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <DollarSign className="w-4 h-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="stripe" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Stripe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="landing">
            <LandingContentManager />
          </TabsContent>

          <TabsContent value="faqs">
            <FAQManager />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsManager />
          </TabsContent>

          <TabsContent value="companies">
            <TrustedCompaniesManager />
          </TabsContent>

          <TabsContent value="users">
            <UsersTable />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="settings">
            <AppSettingsCard />
          </TabsContent>

          <TabsContent value="flags">
            <FeatureFlagsCard />
          </TabsContent>

          <TabsContent value="api">
            <ApiUsageCard />
          </TabsContent>

          <TabsContent value="logs">
            <UsageLogsTable />
          </TabsContent>

          <TabsContent value="stripe">
            <StripeEventsTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
