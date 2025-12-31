import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, FileText, Sparkles, MessageSquare, Layout, Users, Languages } from "lucide-react";
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
  { key: "how_it_works", label: "Como Funciona", icon: Layout, description: "Passos do processo" },
  { key: "cta", label: "CTA Final", icon: MessageSquare, description: "Chamada para ação no final" },
  { key: "testimonials", label: "Depoimentos", icon: Users, description: "Títulos da seção de depoimentos" },
  { key: "trusted_by", label: "Empresas", icon: Globe, description: "Seção de logos de empresas" },
];

const FIELD_LABELS: Record<string, string> = {
  badge: "Badge (texto pequeno no topo)",
  title_part1: "Título - Parte 1",
  title_highlight: "Título - Palavra destacada",
  title_part2: "Título - Parte 2",
  subtitle: "Subtítulo",
  cta_primary: "Botão principal",
  cta_secondary: "Botão secundário",
  section_title: "Título da seção",
  title: "Título principal",
  step1_title: "Passo 1 - Título",
  step1_desc: "Passo 1 - Descrição",
  step2_title: "Passo 2 - Título",
  step2_desc: "Passo 2 - Descrição",
  step3_title: "Passo 3 - Título",
  step3_desc: "Passo 3 - Descrição",
  button: "Texto do botão",
  disclaimer: "Disclaimer (texto pequeno)",
  enabled: "Ativar seção",
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
                      const isLongText = item.content_key.includes("desc") || item.content_key.includes("subtitle") || item.content_key.includes("disclaimer");

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
