import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Loader2,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { BRAND } from "@/lib/constants";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Admin components
import AdminSidebar from "@/components/admin/AdminSidebar";
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
import PlansConfigManager from "@/components/admin/PlansConfigManager";
import ManualSubscriptionManager from "@/components/admin/ManualSubscriptionManager";
import RevenueReports from "@/components/admin/RevenueReports";
import SystemControlCard from "@/components/admin/SystemControlCard";
import SupportSettingsCard from "@/components/admin/SupportSettingsCard";
import EmailSettingsCard from "@/components/admin/EmailSettingsCard";
import PromptsManager from "@/components/admin/PromptsManager";
import SEOSettingsCard from "@/components/admin/SEOSettingsCard";
import GrowthSettingsCard from "@/components/admin/GrowthSettingsCard";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("analytics");

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

  const renderContent = () => {
    switch (activeSection) {
      case "analytics":
        return <AdvancedAnalytics />;
      case "system":
        return <SystemControlCard />;
      case "revenue":
        return <RevenueReports />;
      case "landing":
        return <LandingContentManager />;
      case "faqs":
        return <FAQManager />;
      case "testimonials":
        return <TestimonialsManager />;
      case "companies":
        return <TrustedCompaniesManager />;
      case "plans":
        return <PlansConfigManager />;
      case "manual-subs":
        return <ManualSubscriptionManager />;
      case "growth":
        return <GrowthSettingsCard />;
      case "users":
        return <UsersTable />;
      case "roles":
        return <RoleManagement />;
      case "email":
        return <EmailSettingsCard />;
      case "support":
        return <SupportSettingsCard />;
      case "prompts":
        return <PromptsManager />;
      case "settings":
        return <AppSettingsCard />;
      case "seo":
        return <SEOSettingsCard />;
      case "flags":
        return <FeatureFlagsCard />;
      case "api":
        return <ApiUsageCard />;
      case "logs":
        return <UsageLogsTable />;
      case "stripe":
        return <StripeEventsTable />;
      default:
        return <AdvancedAnalytics />;
    }
  };

  const getSectionTitle = () => {
    const titles: Record<string, { pt: string; en: string }> = {
      analytics: { pt: "Analytics", en: "Analytics" },
      system: { pt: "Controle do Sistema", en: "System Control" },
      revenue: { pt: "Relatórios de Receita", en: "Revenue Reports" },
      landing: { pt: "Landing Page", en: "Landing Page" },
      faqs: { pt: "Perguntas Frequentes", en: "FAQs" },
      testimonials: { pt: "Depoimentos", en: "Testimonials" },
      companies: { pt: "Empresas Parceiras", en: "Partner Companies" },
      plans: { pt: "Configuração de Planos", en: "Plans Configuration" },
      "manual-subs": { pt: "Assinaturas Manuais", en: "Manual Subscriptions" },
      growth: { pt: "Configurações de Growth", en: "Growth Settings" },
      users: { pt: "Usuários", en: "Users" },
      roles: { pt: "Permissões e Roles", en: "Permissions & Roles" },
      email: { pt: "Configurações de E-mail", en: "Email Settings" },
      support: { pt: "Configurações de Suporte", en: "Support Settings" },
      prompts: { pt: "Prompts de IA", en: "AI Prompts" },
      settings: { pt: "Configurações Gerais", en: "General Settings" },
      seo: { pt: "SEO & Redes Sociais", en: "SEO & Social Media" },
      flags: { pt: "Feature Flags", en: "Feature Flags" },
      api: { pt: "Uso da API", en: "API Usage" },
      logs: { pt: "Logs de Uso", en: "Usage Logs" },
      stripe: { pt: "Eventos Stripe", en: "Stripe Events" },
    };
    return language === "pt-BR" ? titles[activeSection]?.pt : titles[activeSection]?.en;
  };

  return (
    <SidebarProvider>
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <SidebarInset>
        {/* Top Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{getSectionTitle()}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{user?.email}</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
            {/* Stats - only show on analytics */}
            {activeSection === "analytics" && (
              <div className="mb-6">
                <AdminStats />
              </div>
            )}

            {/* Section Content */}
            {renderContent()}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Admin;
