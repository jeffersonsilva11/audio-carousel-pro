import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Shield,
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
  BarChart3,
  Crown,
  Gift,
  TrendingUp,
  Headphones,
  Mail,
  ChevronLeft,
  Sparkles,
  Globe,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const menuGroups = [
    {
      label: language === "pt-BR" ? "Geral" : "General",
      items: [
        { id: "analytics", icon: BarChart3, label: "Analytics" },
        { id: "system", icon: AlertTriangle, label: language === "pt-BR" ? "Sistema" : "System" },
        { id: "revenue", icon: TrendingUp, label: language === "pt-BR" ? "Receita" : "Revenue" },
      ],
    },
    {
      label: language === "pt-BR" ? "Conteúdo" : "Content",
      items: [
        { id: "landing", icon: FileText, label: "Landing Page" },
        { id: "faqs", icon: HelpCircle, label: "FAQs" },
        { id: "testimonials", icon: Quote, label: language === "pt-BR" ? "Depoimentos" : "Testimonials" },
        { id: "companies", icon: Building, label: language === "pt-BR" ? "Parceiros" : "Partners" },
      ],
    },
    {
      label: language === "pt-BR" ? "Comercial" : "Commercial",
      items: [
        { id: "plans", icon: Crown, label: language === "pt-BR" ? "Planos" : "Plans" },
        { id: "manual-subs", icon: Gift, label: language === "pt-BR" ? "Assinaturas" : "Subscriptions" },
        { id: "growth", icon: TrendingUp, label: "Growth" },
      ],
    },
    {
      label: language === "pt-BR" ? "Usuários" : "Users",
      items: [
        { id: "users", icon: Users, label: language === "pt-BR" ? "Usuários" : "Users" },
        { id: "roles", icon: UserCog, label: language === "pt-BR" ? "Permissões" : "Permissions" },
      ],
    },
    {
      label: language === "pt-BR" ? "Comunicação" : "Communication",
      items: [
        { id: "broadcast", icon: Send, label: "Broadcasts" },
        { id: "email", icon: Mail, label: "E-mail" },
        { id: "support", icon: Headphones, label: language === "pt-BR" ? "Suporte" : "Support" },
      ],
    },
    {
      label: "IA",
      items: [
        { id: "trends", icon: TrendingUp, label: language === "pt-BR" ? "Tendências" : "Trends" },
        { id: "prompts", icon: Sparkles, label: "Prompts" },
      ],
    },
    {
      label: language === "pt-BR" ? "Configurações" : "Settings",
      items: [
        { id: "settings", icon: Settings, label: language === "pt-BR" ? "Geral" : "General" },
        { id: "seo", icon: Globe, label: "SEO" },
        { id: "flags", icon: Flag, label: "Features" },
        { id: "api", icon: DollarSign, label: "API" },
      ],
    },
    {
      label: "Logs",
      items: [
        { id: "logs", icon: Activity, label: "Logs" },
        { id: "stripe", icon: CreditCard, label: "Stripe" },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          <span className="font-semibold text-lg">
            {language === "pt-BR" ? "Painel Admin" : "Admin Panel"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{BRAND.name}</p>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => onSectionChange(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => navigate("/dashboard")}
        >
          <ChevronLeft className="w-4 h-4" />
          {language === "pt-BR" ? "Voltar ao Dashboard" : "Back to Dashboard"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
