import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, FileText, Sparkles, MessageSquare, Layout, Users, Languages, AlertTriangle, DollarSign, BookOpen, BarChart3, Play, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface LandingContent {
  id: string;
  section_key: string;
  content_key: string;
  value_pt: string;
  value_en: string | null;
  value_es: string | null;
  content_type: string;
}

const SECTIONS = [
  { key: "hero", label: "Hero", icon: Sparkles, description: "Título principal, subtítulo e CTAs" },
  { key: "stats", label: "Estatísticas", icon: BarChart3, description: "Números de impacto social" },
  { key: "problem", label: "O Problema", icon: AlertTriangle, description: "Seção de identificação do problema (Aversão à Perda)" },
  { key: "demo", label: "Demo Interativa", icon: Play, description: "Demonstração passo a passo" },
  { key: "trusted_by", label: "Empresas", icon: Globe, description: "Seção de logos de empresas" },
  { key: "testimonials", label: "Depoimentos", icon: Users, description: "Títulos da seção de depoimentos" },
  { key: "price_anchor", label: "Ancoragem de Preço", icon: DollarSign, description: "Comparação de custos (Gatilho de Ancoragem)" },
  { key: "scarcity", label: "Escassez", icon: Zap, description: "Banner de oferta limitada" },
  { key: "origin_story", label: "Nossa História", icon: BookOpen, description: "História de origem do produto" },
  { key: "how_it_works", label: "Como Funciona", icon: Layout, description: "Passos do processo" },
  { key: "cta", label: "CTA Final", icon: MessageSquare, description: "Chamada para ação no final" },
];

const FIELD_LABELS: Record<string, string> = {
  // General
  badge: "Badge (texto pequeno no topo)",
  title: "Título principal",
  subtitle: "Subtítulo",
  section_title: "Título da seção",
  button: "Texto do botão",
  disclaimer: "Disclaimer (texto pequeno)",
  enabled: "Ativar seção",
  cta_text: "Texto do CTA",

  // Hero
  title_part1: "Título - Parte 1",
  title_highlight: "Título - Palavra destacada",
  title_part2: "Título - Parte 2",
  cta_primary: "Botão principal",
  cta_secondary: "Botão secundário",
  loss_aversion_text: "Texto de Aversão à Perda",
  why_text: "Círculo Dourado - Por quê",
  how_text: "Círculo Dourado - Como",
  social_proof_text: "Texto de prova social",
  cta_micro: "CTA micro-compromisso",

  // Stats
  stat1_value: "Estatística 1 - Valor",
  stat1_label: "Estatística 1 - Label",
  stat2_value: "Estatística 2 - Valor",
  stat2_label: "Estatística 2 - Label",
  stat3_value: "Estatística 3 - Valor",
  stat3_label: "Estatística 3 - Label",
  stat4_value: "Estatística 4 - Valor",
  stat4_label: "Estatística 4 - Label",

  // Problem Section
  point1_icon: "Ponto 1 - Ícone (clock, trending-down, users)",
  point1_title: "Ponto 1 - Título",
  point1_description: "Ponto 1 - Descrição",
  point2_icon: "Ponto 2 - Ícone",
  point2_title: "Ponto 2 - Título",
  point2_description: "Ponto 2 - Descrição",
  point3_icon: "Ponto 3 - Ícone",
  point3_title: "Ponto 3 - Título",
  point3_description: "Ponto 3 - Descrição",
  solution_badge: "Solução - Badge",
  solution_title: "Solução - Título",
  solution_description: "Solução - Descrição",

  // Demo
  step1_title: "Passo 1 - Título",
  step1_description: "Passo 1 - Descrição",
  step1_duration: "Passo 1 - Duração",
  step2_title: "Passo 2 - Título",
  step2_description: "Passo 2 - Descrição",
  step2_duration: "Passo 2 - Duração",
  step3_title: "Passo 3 - Título",
  step3_description: "Passo 3 - Descrição",
  step3_duration: "Passo 3 - Duração",
  step1_desc: "Passo 1 - Descrição",
  step2_desc: "Passo 2 - Descrição",
  step3_desc: "Passo 3 - Descrição",

  // Price Anchor
  cost1_label: "Custo 1 - Label",
  cost1_value: "Custo 1 - Valor",
  cost2_label: "Custo 2 - Label",
  cost2_value: "Custo 2 - Valor",
  cost3_label: "Custo 3 - Label",
  cost3_value: "Custo 3 - Valor",
  total_label: "Total - Label",
  total_value: "Total - Valor",
  audisell_label: "Audisell - Label",
  audisell_value: "Audisell - Valor",
  savings_label: "Economia - Label",
  savings_percentage: "Economia - Porcentagem",

  // Scarcity
  benefit1: "Benefício 1",
  benefit2: "Benefício 2",
  benefit3: "Benefício 3",
  spots_filled: "Vagas preenchidas",
  spots_total: "Total de vagas",
  spots_label: "Label das vagas",

  // Origin Story
  before_label: "Antes - Label",
  before_text: "Antes - Texto",
  turning_point_label: "Ponto de Virada - Label",
  turning_point_text: "Ponto de Virada - Texto",
  after_label: "Agora - Label",
  after_text: "Agora - Texto",
  founder_name: "Nome do fundador",
  founder_role: "Cargo do fundador",

  // Testimonials (specific keys to avoid conflict with Origin Story)
  before_after_badge: "Badge Before/After",
  testimonials_before_label: "Testimonials - Label Antes",
  testimonials_after_label: "Testimonials - Label Depois",
  time_saved_label: "Label tempo economizado",
  engagement_label: "Label engajamento",
};

const LandingContentManager = () => {
  const [content, setContent] = useState<LandingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, Partial<LandingContent>>>({});
  const [activeTab, setActiveTab] = useState("pt");
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .order("section_key, content_key");

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error fetching landing content:", error);
      toast({
        title: "Erro ao carregar conteúdo",
        description: "Não foi possível carregar o conteúdo da landing page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: keyof LandingContent, value: string) => {
    setEditedContent((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getValue = (item: LandingContent, field: keyof LandingContent): string => {
    if (editedContent[item.id]?.[field] !== undefined) {
      return editedContent[item.id][field] as string;
    }
    return (item[field] as string) || "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedContent).map(([id, changes]) => ({
        id,
        ...changes,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("landing_content")
          .update(update)
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Conteúdo salvo!",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditedContent({});
      fetchContent();
    } catch (error) {
      console.error("Error saving content:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslate = async () => {
    setTranslating(true);
    try {
      // Get all content that has PT values but missing EN or ES
      const itemsToTranslate = content.filter(item => 
        item.value_pt && (!item.value_en || !item.value_es)
      );

      if (itemsToTranslate.length === 0) {
        toast({
          title: "Nada para traduzir",
          description: "Todos os campos já possuem traduções.",
        });
        setTranslating(false);
        return;
      }

      let translatedCount = 0;

      for (const item of itemsToTranslate) {
        const updates: Partial<LandingContent> = {};

        // Translate to English if missing
        if (!item.value_en) {
          const { data: enData, error: enError } = await supabase.functions.invoke("translate-content", {
            body: { text: item.value_pt, targetLanguage: "en", context: "landing_page" }
          });
          if (!enError && enData?.translatedText) {
            updates.value_en = enData.translatedText;
          }
        }

        // Translate to Spanish if missing
        if (!item.value_es) {
          const { data: esData, error: esError } = await supabase.functions.invoke("translate-content", {
            body: { text: item.value_pt, targetLanguage: "es", context: "landing_page" }
          });
          if (!esError && esData?.translatedText) {
            updates.value_es = esData.translatedText;
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("landing_content").update(updates).eq("id", item.id);
          translatedCount++;
        }
      }

      toast({
        title: "Tradução concluída!",
        description: `${translatedCount} campos traduzidos automaticamente.`,
      });

      fetchContent();
    } catch (error) {
      console.error("Error translating content:", error);
      toast({
        title: "Erro na tradução",
        description: "Não foi possível traduzir o conteúdo.",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
    }
  };

  const getContentBySection = (sectionKey: string) => {
    return content.filter((item) => item.section_key === sectionKey);
  };

  const hasChanges = Object.keys(editedContent).length > 0;

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Conteúdo da Landing Page
            </CardTitle>
            <CardDescription>
              Edite textos, títulos e CTAs da página inicial
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleAutoTranslate} 
              disabled={translating}
              title="Traduzir automaticamente campos vazios"
            >
              {translating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Languages className="w-4 h-4 mr-2" />
              )}
              Auto-traduzir
            </Button>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar alterações
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Language tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="pt" className="gap-2">
              🇧🇷 Português
            </TabsTrigger>
            <TabsTrigger value="en" className="gap-2">
              🇺🇸 English
            </TabsTrigger>
            <TabsTrigger value="es" className="gap-2">
              🇪🇸 Español
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sections accordion */}
        <Accordion type="multiple" className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionContent = getContentBySection(section.key);
            const Icon = section.icon;

            return (
              <AccordionItem key={section.key} value={section.key} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{section.label}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="grid gap-4">
                    {sectionContent.map((item) => {
                      const valueField = activeTab === "pt" ? "value_pt" : activeTab === "en" ? "value_en" : "value_es";
                      const isLongText = item.content_key.includes("desc") ||
                        item.content_key.includes("subtitle") ||
                        item.content_key.includes("disclaimer") ||
                        item.content_key.includes("_text") ||
                        item.content_key.includes("solution_description") ||
                        item.content_key.includes("quote");

                      return (
                        <div key={item.id} className="space-y-2">
                          <Label htmlFor={item.id} className="text-sm font-medium">
                            {FIELD_LABELS[item.content_key] || item.content_key}
                          </Label>
                          {isLongText ? (
                            <Textarea
                              id={item.id}
                              value={getValue(item, valueField as keyof LandingContent)}
                              onChange={(e) => handleChange(item.id, valueField as keyof LandingContent, e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          ) : (
                            <Input
                              id={item.id}
                              value={getValue(item, valueField as keyof LandingContent)}
                              onChange={(e) => handleChange(item.id, valueField as keyof LandingContent, e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Save button at bottom */}
        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar todas as alterações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LandingContentManager;
