import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Settings,
  DollarSign,
  Check,
  X,
  Edit2,
  Save,
  Crown,
  CreditCard,
  Globe,
} from "lucide-react";

interface PlanConfig {
  id: string;
  tier: string;
  name_pt: string;
  name_en: string | null;
  name_es: string | null;
  description_pt: string | null;
  description_en: string | null;
  description_es: string | null;
  price_brl: number;
  price_usd: number | null;
  price_eur: number | null;
  stripe_price_id_brl: string | null;
  stripe_price_id_usd: string | null;
  stripe_price_id_eur: string | null;
  checkout_link_brl: string | null;
  checkout_link_usd: string | null;
  checkout_link_eur: string | null;
  daily_limit: number;
  limit_period: "daily" | "weekly" | "monthly";
  monthly_limit: number | null;
  has_watermark: boolean;
  has_editor: boolean;
  has_history: boolean;
  has_zip_download: boolean;
  has_custom_fonts: boolean;
  has_gradients: boolean;
  has_slide_images: boolean;
  is_active: boolean;
  display_order: number;
}

const PERIOD_LABELS: Record<string, Record<string, string>> = {
  "pt-BR": {
    daily: "Por dia",
    weekly: "Por semana",
    monthly: "Por mês",
  },
  en: {
    daily: "Per day",
    weekly: "Per week",
    monthly: "Per month",
  },
  es: {
    daily: "Por día",
    weekly: "Por semana",
    monthly: "Por mes",
  },
};

const formatPrice = (cents: number, currency: string) => {
  const value = cents / 100;
  const symbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
  };
  return `${symbols[currency] || ""} ${value.toFixed(2)}`;
};

export default function PlansConfigManager() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanConfig>>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans_config")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setPlans((data as PlanConfig[]) || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Não foi possível carregar os planos" : "Could not load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: PlanConfig) => {
    setEditingPlan(plan);
    setEditForm(plan);
  };

  const handleSave = async () => {
    if (!editingPlan || !editForm) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("plans_config")
        .update({
          name_pt: editForm.name_pt,
          name_en: editForm.name_en,
          name_es: editForm.name_es,
          description_pt: editForm.description_pt,
          description_en: editForm.description_en,
          description_es: editForm.description_es,
          price_brl: editForm.price_brl,
          price_usd: editForm.price_usd,
          price_eur: editForm.price_eur,
          stripe_price_id_brl: editForm.stripe_price_id_brl,
          stripe_price_id_usd: editForm.stripe_price_id_usd,
          stripe_price_id_eur: editForm.stripe_price_id_eur,
          checkout_link_brl: editForm.checkout_link_brl,
          checkout_link_usd: editForm.checkout_link_usd,
          checkout_link_eur: editForm.checkout_link_eur,
          daily_limit: editForm.daily_limit,
          limit_period: editForm.limit_period,
          monthly_limit: editForm.monthly_limit,
          has_watermark: editForm.has_watermark,
          has_editor: editForm.has_editor,
          has_history: editForm.has_history,
          has_zip_download: editForm.has_zip_download,
          has_custom_fonts: editForm.has_custom_fonts,
          has_gradients: editForm.has_gradients,
          has_slide_images: editForm.has_slide_images,
          is_active: editForm.is_active,
        })
        .eq("id", editingPlan.id);

      if (error) throw error;

      toast({
        title: language === "pt-BR" ? "Plano atualizado" : "Plan updated",
        description: language === "pt-BR" ? "As alterações foram salvas" : "Changes have been saved",
      });

      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Não foi possível salvar as alterações" : "Could not save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePlanActive = async (plan: PlanConfig) => {
    try {
      const { error } = await supabase
        .from("plans_config")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;

      toast({
        title: plan.is_active
          ? (language === "pt-BR" ? "Plano desativado" : "Plan deactivated")
          : (language === "pt-BR" ? "Plano ativado" : "Plan activated"),
      });

      fetchPlans();
    } catch (error) {
      console.error("Error toggling plan:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeVariant = (tier: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      free: "outline",
      starter: "secondary",
      creator: "default",
      agency: "destructive",
    };
    return variants[tier] || "outline";
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {language === "pt-BR" ? "Configuração de Planos" : language === "es" ? "Configuración de Planes" : "Plans Configuration"}
          </CardTitle>
          <CardDescription>
            {language === "pt-BR"
              ? "Configure preços, limites e recursos de cada plano"
              : language === "es"
              ? "Configura precios, límites y recursos de cada plan"
              : "Configure prices, limits and features for each plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 rounded-lg border ${
                  plan.is_active ? "border-border" : "border-border/50 bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.tier === "free" ? "bg-muted" : "bg-accent/10"
                    }`}>
                      {plan.tier !== "free" && <Crown className="w-5 h-5 text-accent" />}
                      {plan.tier === "free" && <span className="text-lg">0</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name_pt}</h3>
                        <Badge variant={getPlanBadgeVariant(plan.tier)}>
                          {plan.tier}
                        </Badge>
                        {!plan.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {language === "pt-BR" ? "Inativo" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description_pt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => togglePlanActive(plan)}
                      disabled={plan.tier === "free"}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      {language === "pt-BR" ? "Editar" : "Edit"}
                    </Button>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Globe className="w-3 h-3" />
                      BRL
                    </div>
                    <p className="font-semibold">{formatPrice(plan.price_brl, "BRL")}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {plan.stripe_price_id_brl || "Não configurado"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Globe className="w-3 h-3" />
                      USD
                    </div>
                    <p className="font-semibold">{formatPrice(plan.price_usd || 0, "USD")}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {plan.stripe_price_id_usd || "Não configurado"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Globe className="w-3 h-3" />
                      EUR
                    </div>
                    <p className="font-semibold">{formatPrice(plan.price_eur || 0, "EUR")}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {plan.stripe_price_id_eur || "Não configurado"}
                    </p>
                  </div>
                </div>

                {/* Features Summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={plan.daily_limit > 1 ? "default" : "outline"} className="text-xs">
                    {plan.daily_limit} {language === "pt-BR" ? "carrosséis" : "carousels"}/{PERIOD_LABELS[language]?.[plan.limit_period || "daily"] || plan.limit_period}
                  </Badge>
                  <Badge variant={!plan.has_watermark ? "default" : "outline"} className="text-xs">
                    {!plan.has_watermark ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    {language === "pt-BR" ? "Marca d'água" : "Watermark"}
                  </Badge>
                  <Badge variant={plan.has_editor ? "default" : "outline"} className="text-xs">
                    {plan.has_editor ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    Editor
                  </Badge>
                  <Badge variant={plan.has_history ? "default" : "outline"} className="text-xs">
                    {plan.has_history ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    {language === "pt-BR" ? "Histórico" : "History"}
                  </Badge>
                  <Badge variant={plan.has_gradients ? "default" : "outline"} className="text-xs">
                    {plan.has_gradients ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    {language === "pt-BR" ? "Gradientes" : "Gradients"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {language === "pt-BR" ? "Editar Plano" : "Edit Plan"}: {editingPlan?.name_pt}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="pricing" className="mt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="pricing">
                <DollarSign className="w-4 h-4 mr-1" />
                {language === "pt-BR" ? "Preços" : "Pricing"}
              </TabsTrigger>
              <TabsTrigger value="features">
                <Settings className="w-4 h-4 mr-1" />
                {language === "pt-BR" ? "Recursos" : "Features"}
              </TabsTrigger>
              <TabsTrigger value="stripe">
                <CreditCard className="w-4 h-4 mr-1" />
                Stripe
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              {/* BRL Pricing */}
              <div className="space-y-2">
                <Label>Preço BRL (centavos)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editForm.price_brl || 0}
                    onChange={(e) => setEditForm({ ...editForm, price_brl: parseInt(e.target.value) || 0 })}
                    placeholder="2990"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[100px]">
                    = {formatPrice(editForm.price_brl || 0, "BRL")}
                  </div>
                </div>
              </div>

              {/* USD Pricing */}
              <div className="space-y-2">
                <Label>Preço USD (centavos)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editForm.price_usd || 0}
                    onChange={(e) => setEditForm({ ...editForm, price_usd: parseInt(e.target.value) || 0 })}
                    placeholder="699"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[100px]">
                    = {formatPrice(editForm.price_usd || 0, "USD")}
                  </div>
                </div>
              </div>

              {/* EUR Pricing */}
              <div className="space-y-2">
                <Label>Preço EUR (centavos)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editForm.price_eur || 0}
                    onChange={(e) => setEditForm({ ...editForm, price_eur: parseInt(e.target.value) || 0 })}
                    placeholder="599"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[100px]">
                    = {formatPrice(editForm.price_eur || 0, "EUR")}
                  </div>
                </div>
              </div>

              {/* Carousel Limit */}
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Limite de Carrosséis" : "Carousel Limit"}</Label>
                <Input
                  type="number"
                  value={editForm.daily_limit || 1}
                  onChange={(e) => setEditForm({ ...editForm, daily_limit: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>

              {/* Limit Period */}
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Período do Limite" : "Limit Period"}</Label>
                <Select
                  value={editForm.limit_period || "daily"}
                  onValueChange={(value) => setEditForm({ ...editForm, limit_period: value as "daily" | "weekly" | "monthly" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {language === "pt-BR" ? "Por dia" : language === "es" ? "Por día" : "Per day"}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {language === "pt-BR" ? "Por semana" : language === "es" ? "Por semana" : "Per week"}
                    </SelectItem>
                    <SelectItem value="monthly">
                      {language === "pt-BR" ? "Por mês" : language === "es" ? "Por mes" : "Per month"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR"
                    ? "Ex: 3 por semana significa que o usuário pode criar 3 carrosséis a cada semana"
                    : "Ex: 3 per week means the user can create 3 carousels each week"}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{language === "pt-BR" ? "Marca d'água" : "Watermark"}</Label>
                  <Switch
                    checked={editForm.has_watermark}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_watermark: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>Editor Visual</Label>
                  <Switch
                    checked={editForm.has_editor}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_editor: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{language === "pt-BR" ? "Histórico" : "History"}</Label>
                  <Switch
                    checked={editForm.has_history}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_history: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>Download ZIP</Label>
                  <Switch
                    checked={editForm.has_zip_download}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_zip_download: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{language === "pt-BR" ? "Fontes Customizadas" : "Custom Fonts"}</Label>
                  <Switch
                    checked={editForm.has_custom_fonts}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_custom_fonts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{language === "pt-BR" ? "Gradientes" : "Gradients"}</Label>
                  <Switch
                    checked={editForm.has_gradients}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_gradients: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{language === "pt-BR" ? "Imagens por Slide" : "Slide Images"}</Label>
                  <Switch
                    checked={editForm.has_slide_images}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, has_slide_images: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stripe" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <p className="text-amber-600 dark:text-amber-400">
                  {language === "pt-BR"
                    ? "Cole os Price IDs do Stripe Dashboard aqui. Eles começam com 'price_'"
                    : "Paste the Price IDs from Stripe Dashboard here. They start with 'price_'"}
                </p>
              </div>

              {/* Stripe Price IDs */}
              <div className="space-y-2">
                <Label>Stripe Price ID (BRL)</Label>
                <Input
                  value={editForm.stripe_price_id_brl || ""}
                  onChange={(e) => setEditForm({ ...editForm, stripe_price_id_brl: e.target.value })}
                  placeholder="price_xxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID (USD)</Label>
                <Input
                  value={editForm.stripe_price_id_usd || ""}
                  onChange={(e) => setEditForm({ ...editForm, stripe_price_id_usd: e.target.value })}
                  placeholder="price_xxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID (EUR)</Label>
                <Input
                  value={editForm.stripe_price_id_eur || ""}
                  onChange={(e) => setEditForm({ ...editForm, stripe_price_id_eur: e.target.value })}
                  placeholder="price_xxxxxxxxxxxxxxxx"
                />
              </div>

              {/* Custom Checkout Links */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  {language === "pt-BR"
                    ? "Links de checkout personalizados (opcional - deixe vazio para usar checkout padrão)"
                    : "Custom checkout links (optional - leave empty to use default checkout)"}
                </p>
                <div className="space-y-2">
                  <Label>Checkout Link (BRL)</Label>
                  <Input
                    value={editForm.checkout_link_brl || ""}
                    onChange={(e) => setEditForm({ ...editForm, checkout_link_brl: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                  />
                </div>
                <div className="space-y-2 mt-2">
                  <Label>Checkout Link (USD)</Label>
                  <Input
                    value={editForm.checkout_link_usd || ""}
                    onChange={(e) => setEditForm({ ...editForm, checkout_link_usd: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              {language === "pt-BR" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {language === "pt-BR" ? "Salvar" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
