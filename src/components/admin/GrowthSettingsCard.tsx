import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Zap,
  Users,
  Mail,
  Gift,
  Bell,
  Target,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ExitIntentSettings {
  enabled: boolean;
  title_pt: string;
  title_en: string;
  title_es: string;
  subtitle_pt: string;
  subtitle_en: string;
  subtitle_es: string;
  cta_pt: string;
  cta_en: string;
  cta_es: string;
  offer_pt: string;
  offer_en: string;
  offer_es: string;
  delay_seconds: number;
  show_once_per_session: boolean;
}

interface EarlyAccessSettings {
  enabled: boolean;
  total_spots: number;
  plan_id: string;
  checkout_url: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  is_active: boolean;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  subject_pt: string;
  subject_en: string | null;
  subject_es: string | null;
  body_pt: string;
  body_en: string | null;
  body_es: string | null;
  is_active: boolean;
  conditions: Record<string, unknown>;
}

const DEFAULT_EXIT_INTENT: ExitIntentSettings = {
  enabled: true,
  title_pt: "Espere! Não vá embora ainda...",
  title_en: "Wait! Don't leave yet...",
  title_es: "¡Espera! No te vayas todavía...",
  subtitle_pt: "Que tal criar seu primeiro carrossel grátis antes de sair?",
  subtitle_en: "How about creating your first free carousel before leaving?",
  subtitle_es: "¿Qué tal crear tu primer carrusel gratis antes de irte?",
  cta_pt: "Quero meu carrossel grátis",
  cta_en: "I want my free carousel",
  cta_es: "Quiero mi carrusel gratis",
  offer_pt: "Cadastre-se agora e ganhe 3 carrosséis extras no plano gratuito!",
  offer_en: "Sign up now and get 3 extra carousels on the free plan!",
  offer_es: "¡Regístrate ahora y obtén 3 carruseles extra en el plan gratuito!",
  delay_seconds: 0,
  show_once_per_session: true,
};

const GrowthSettingsCard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Exit Intent
  const [exitIntent, setExitIntent] = useState<ExitIntentSettings>(DEFAULT_EXIT_INTENT);

  // Social Proof
  const [socialProofEnabled, setSocialProofEnabled] = useState(true);
  const [socialProofInterval, setSocialProofInterval] = useState(8);

  // Early Access
  const [earlyAccess, setEarlyAccess] = useState<EarlyAccessSettings>({
    enabled: true,
    total_spots: 500,
    plan_id: "",
    checkout_url: "",
  });
  const [currentSpots, setCurrentSpots] = useState(0);

  // Email Sequences
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      // Fetch app settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "exit_intent_settings",
          "social_proof_enabled",
          "social_proof_interval_seconds",
          "early_access_enabled",
          "early_access_total_spots",
          "early_access_plan_id",
          "early_access_checkout_url",
        ]);

      if (settings) {
        // Exit Intent
        const exitIntentData = settings.find((s) => s.key === "exit_intent_settings");
        if (exitIntentData?.value) {
          try {
            setExitIntent({ ...DEFAULT_EXIT_INTENT, ...JSON.parse(exitIntentData.value) });
          } catch {
            setExitIntent(DEFAULT_EXIT_INTENT);
          }
        }

        // Social Proof
        const spEnabled = settings.find((s) => s.key === "social_proof_enabled");
        const spInterval = settings.find((s) => s.key === "social_proof_interval_seconds");
        setSocialProofEnabled(spEnabled?.value !== "false");
        setSocialProofInterval(parseInt(spInterval?.value || "8", 10));

        // Early Access
        const eaEnabled = settings.find((s) => s.key === "early_access_enabled");
        const eaTotal = settings.find((s) => s.key === "early_access_total_spots");
        const eaPlanId = settings.find((s) => s.key === "early_access_plan_id");
        const eaCheckout = settings.find((s) => s.key === "early_access_checkout_url");
        setEarlyAccess({
          enabled: eaEnabled?.value !== "false",
          total_spots: parseInt(eaTotal?.value || "500", 10),
          plan_id: eaPlanId?.value || "",
          checkout_url: eaCheckout?.value || "",
        });
      }

      // Fetch current subscriber count
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .in("tier", ["creator", "agency"])
        .eq("status", "active");
      setCurrentSpots(count || 0);

      // Fetch email sequences
      const { data: seqData } = await supabase
        .from("email_sequences")
        .select("*")
        .order("name");
      setSequences(seqData || []);

      // Fetch sequence steps
      const { data: stepsData } = await supabase
        .from("email_sequence_steps")
        .select("*")
        .order("sequence_id, step_order");
      setSequenceSteps(stepsData || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string, description?: string) => {
    const { error } = await supabase.from("app_settings").upsert(
      {
        key,
        value,
        description,
      },
      { onConflict: "key" }
    );
    return !error;
  };

  const handleSaveExitIntent = async () => {
    setSaving(true);
    try {
      const success = await saveSetting(
        "exit_intent_settings",
        JSON.stringify(exitIntent),
        "Exit intent popup settings"
      );
      if (success) {
        toast({ title: "Salvo", description: "Configurações de Exit Intent atualizadas." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocialProof = async () => {
    setSaving(true);
    try {
      await saveSetting("social_proof_enabled", String(socialProofEnabled));
      await saveSetting("social_proof_interval_seconds", String(socialProofInterval));
      toast({ title: "Salvo", description: "Configurações de Social Proof atualizadas." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEarlyAccess = async () => {
    setSaving(true);
    try {
      await saveSetting("early_access_enabled", String(earlyAccess.enabled));
      await saveSetting("early_access_total_spots", String(earlyAccess.total_spots));
      await saveSetting("early_access_plan_id", earlyAccess.plan_id);
      await saveSetting("early_access_checkout_url", earlyAccess.checkout_url);
      toast({ title: "Salvo", description: "Configurações de Acesso Antecipado atualizadas." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleSequence = async (sequenceId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("email_sequences")
      .update({ is_active: isActive })
      .eq("id", sequenceId);

    if (!error) {
      setSequences((prev) =>
        prev.map((s) => (s.id === sequenceId ? { ...s, is_active: isActive } : s))
      );
      toast({
        title: isActive ? "Sequência ativada" : "Sequência desativada",
        description: `A sequência foi ${isActive ? "ativada" : "desativada"}.`,
      });
    }
  };

  const toggleStep = async (stepId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("email_sequence_steps")
      .update({ is_active: isActive })
      .eq("id", stepId);

    if (!error) {
      setSequenceSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, is_active: isActive } : s))
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Configurações de Growth
        </CardTitle>
        <CardDescription>
          Gerencie estratégias de conversão, retenção e engajamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="exit-intent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exit-intent" className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Intent</span>
            </TabsTrigger>
            <TabsTrigger value="social-proof" className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Social Proof</span>
            </TabsTrigger>
            <TabsTrigger value="early-access" className="flex items-center gap-1">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Early Access</span>
            </TabsTrigger>
            <TabsTrigger value="email-sequences" className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">E-mails</span>
            </TabsTrigger>
          </TabsList>

          {/* Exit Intent Tab */}
          <TabsContent value="exit-intent" className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Popup de Exit Intent</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe popup quando o usuário tenta sair da página
                </p>
              </div>
              <Switch
                checked={exitIntent.enabled}
                onCheckedChange={(checked) => setExitIntent({ ...exitIntent, enabled: checked })}
              />
            </div>

            {exitIntent.enabled && (
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="pt-br">
                  <AccordionTrigger>🇧🇷 Português</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={exitIntent.title_pt}
                        onChange={(e) => setExitIntent({ ...exitIntent, title_pt: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtítulo</Label>
                      <Input
                        value={exitIntent.subtitle_pt}
                        onChange={(e) =>
                          setExitIntent({ ...exitIntent, subtitle_pt: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA</Label>
                      <Input
                        value={exitIntent.cta_pt}
                        onChange={(e) => setExitIntent({ ...exitIntent, cta_pt: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Oferta</Label>
                      <Input
                        value={exitIntent.offer_pt}
                        onChange={(e) => setExitIntent({ ...exitIntent, offer_pt: e.target.value })}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="en">
                  <AccordionTrigger>🇺🇸 English</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={exitIntent.title_en}
                        onChange={(e) => setExitIntent({ ...exitIntent, title_en: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={exitIntent.subtitle_en}
                        onChange={(e) =>
                          setExitIntent({ ...exitIntent, subtitle_en: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA</Label>
                      <Input
                        value={exitIntent.cta_en}
                        onChange={(e) => setExitIntent({ ...exitIntent, cta_en: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Offer</Label>
                      <Input
                        value={exitIntent.offer_en}
                        onChange={(e) => setExitIntent({ ...exitIntent, offer_en: e.target.value })}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="es">
                  <AccordionTrigger>🇪🇸 Español</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={exitIntent.title_es}
                        onChange={(e) => setExitIntent({ ...exitIntent, title_es: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtítulo</Label>
                      <Input
                        value={exitIntent.subtitle_es}
                        onChange={(e) =>
                          setExitIntent({ ...exitIntent, subtitle_es: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA</Label>
                      <Input
                        value={exitIntent.cta_es}
                        onChange={(e) => setExitIntent({ ...exitIntent, cta_es: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Oferta</Label>
                      <Input
                        value={exitIntent.offer_es}
                        onChange={(e) => setExitIntent({ ...exitIntent, offer_es: e.target.value })}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delay (segundos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={exitIntent.delay_seconds}
                  onChange={(e) =>
                    setExitIntent({ ...exitIntent, delay_seconds: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={exitIntent.show_once_per_session}
                  onCheckedChange={(checked) =>
                    setExitIntent({ ...exitIntent, show_once_per_session: checked })
                  }
                />
                <Label>Mostrar 1x por sessão</Label>
              </div>
            </div>

            <Button onClick={handleSaveExitIntent} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Exit Intent
            </Button>
          </TabsContent>

          {/* Social Proof Tab */}
          <TabsContent value="social-proof" className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Notificações de Atividade</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra "João acabou de criar um carrossel" em tempo real
                </p>
              </div>
              <Switch checked={socialProofEnabled} onCheckedChange={setSocialProofEnabled} />
            </div>

            {socialProofEnabled && (
              <div className="space-y-2">
                <Label>Intervalo entre notificações (segundos)</Label>
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={socialProofInterval}
                  onChange={(e) => setSocialProofInterval(parseInt(e.target.value, 10))}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 8-12 segundos para não ser intrusivo
                </p>
              </div>
            )}

            <Button onClick={handleSaveSocialProof} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Social Proof
            </Button>
          </TabsContent>

          {/* Early Access Tab */}
          <TabsContent value="early-access" className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Promoção de Acesso Antecipado</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe badge e seção das 500 vagas com preço fixo
                </p>
              </div>
              <Switch
                checked={earlyAccess.enabled}
                onCheckedChange={(checked) => setEarlyAccess({ ...earlyAccess, enabled: checked })}
              />
            </div>

            {/* Progress indicator */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso atual</span>
                <span className="text-sm font-bold">
                  {currentSpots} / {earlyAccess.total_spots}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${(currentSpots / earlyAccess.total_spots) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {earlyAccess.total_spots - currentSpots} vagas restantes
              </p>
            </div>

            {earlyAccess.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Total de Vagas</Label>
                  <Input
                    type="number"
                    value={earlyAccess.total_spots}
                    onChange={(e) =>
                      setEarlyAccess({ ...earlyAccess, total_spots: parseInt(e.target.value, 10) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>ID do Plano no Stripe</Label>
                  <Input
                    placeholder="price_xxxxx"
                    value={earlyAccess.plan_id}
                    onChange={(e) => setEarlyAccess({ ...earlyAccess, plan_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do price no Stripe para o plano Creator 500
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>URL de Checkout Específica</Label>
                  <Input
                    placeholder="https://checkout.stripe.com/..."
                    value={earlyAccess.checkout_url}
                    onChange={(e) => setEarlyAccess({ ...earlyAccess, checkout_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL para checkout direto do plano Early Access
                  </p>
                </div>
              </div>
            )}

            <Button onClick={handleSaveEarlyAccess} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Acesso Antecipado
            </Button>
          </TabsContent>

          {/* Email Sequences Tab */}
          <TabsContent value="email-sequences" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Gerencie sequências de e-mails automatizadas para onboarding e conversão.
            </p>

            {sequences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sequência configurada. Execute a migration para criar.
              </div>
            ) : (
              <div className="space-y-4">
                {sequences.map((sequence) => (
                  <div key={sequence.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-muted/50">
                      <div>
                        <h4 className="font-medium">{sequence.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Trigger: {sequence.trigger_event}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sequence.is_active}
                          onCheckedChange={(checked) => toggleSequence(sequence.id, checked)}
                        />
                        <span className="text-xs">
                          {sequence.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </div>

                    {sequence.is_active && (
                      <div className="p-4 space-y-3">
                        {sequenceSteps
                          .filter((step) => step.sequence_id === sequence.id)
                          .map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between p-3 bg-background rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-medium">
                                  {step.step_order}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{step.subject_pt}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {step.delay_hours === 0
                                      ? "Imediato"
                                      : `${step.delay_hours}h após anterior`}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={step.is_active}
                                onCheckedChange={(checked) => toggleStep(step.id, checked)}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                💡 Os e-mails são enviados automaticamente via trigger do banco de dados.
                Configure um cron job ou use Supabase Edge Functions para processar a fila.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GrowthSettingsCard;
