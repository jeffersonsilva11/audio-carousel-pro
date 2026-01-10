import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, History, RotateCcw, Sparkles, Shield, Languages, Mic } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface AIPrompt {
  id: string;
  key: string;
  category: string;
  name: string;
  description: string | null;
  content: string;
  variables: string[] | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PromptHistory {
  id: string;
  prompt_id: string;
  content: string;
  version: number;
  changed_at: string;
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  script_generation: {
    label: "Geração de Roteiro",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Prompts usados para gerar o roteiro do carrossel a partir da transcrição"
  },
  guardrails: {
    label: "Guardrails de Segurança",
    icon: <Shield className="w-4 h-4" />,
    description: "Regras de segurança para prevenir prompt injection e vazamento de dados"
  },
  translation: {
    label: "Tradução",
    icon: <Languages className="w-4 h-4" />,
    description: "Prompts para tradução automática de conteúdo"
  },
  transcription: {
    label: "Transcrição",
    icon: <Mic className="w-4 h-4" />,
    description: "Configurações do Whisper para transcrição de áudio"
  }
};

const PromptsManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [historyPromptId, setHistoryPromptId] = useState<string | null>(null);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;

      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os prompts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (promptId: string) => {
    setLoadingHistory(true);
    setHistoryPromptId(promptId);
    try {
      const { data, error } = await supabase
        .from('ai_prompts_history')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async (prompt: AIPrompt) => {
    const newContent = editedPrompts[prompt.id];
    if (!newContent || newContent === prompt.content) {
      toast({
        title: "Sem alterações",
        description: "O conteúdo não foi modificado.",
      });
      return;
    }

    setSaving(prompt.id);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ content: newContent })
        .eq('id', prompt.id);

      if (error) throw error;

      toast({
        title: "Prompt salvo",
        description: `"${prompt.name}" foi atualizado com sucesso.`,
      });

      // Clear edited state and refresh
      setEditedPrompts(prev => {
        const updated = { ...prev };
        delete updated[prompt.id];
        return updated;
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o prompt.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleRestore = async (prompt: AIPrompt, historyContent: string) => {
    setSaving(prompt.id);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ content: historyContent })
        .eq('id', prompt.id);

      if (error) throw error;

      toast({
        title: "Versão restaurada",
        description: `"${prompt.name}" foi restaurado para a versão anterior.`,
      });

      setHistoryPromptId(null);
      fetchPrompts();
    } catch (error) {
      console.error('Error restoring prompt:', error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar o prompt.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleEdit = (promptId: string, content: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [promptId]: content
    }));
  };

  const getPromptsByCategory = (category: string) => {
    return prompts.filter(p => p.category === category);
  };

  const hasChanges = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    return editedPrompts[promptId] && editedPrompts[promptId] !== prompt?.content;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(CATEGORY_INFO);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {language === "pt-BR" ? "Gerenciamento de Prompts de IA" : "AI Prompts Management"}
          </CardTitle>
          <CardDescription>
            {language === "pt-BR"
              ? "Edite os prompts usados pela IA para gerar carrosséis. As alterações entram em vigor imediatamente."
              : "Edit the prompts used by AI to generate carousels. Changes take effect immediately."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>{language === "pt-BR" ? "Atenção:" : "Warning:"}</strong>{" "}
              {language === "pt-BR"
                ? "Alterações nos prompts afetam diretamente a qualidade dos carrosséis gerados. Teste cuidadosamente antes de fazer mudanças em produção."
                : "Changes to prompts directly affect the quality of generated carousels. Test carefully before making production changes."}
            </p>
          </div>

          <Tabs defaultValue="script_generation" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="flex items-center gap-2">
                  {CATEGORY_INFO[cat].icon}
                  <span className="hidden md:inline">{CATEGORY_INFO[cat].label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_INFO[category].description}
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {getPromptsByCategory(category).map(prompt => (
                    <AccordionItem key={prompt.id} value={prompt.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">{prompt.name}</span>
                          <Badge variant="outline" className="text-xs">
                            v{prompt.version}
                          </Badge>
                          {hasChanges(prompt.id) && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                              {language === "pt-BR" ? "Não salvo" : "Unsaved"}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {prompt.description && (
                            <p className="text-sm text-muted-foreground">
                              {prompt.description}
                            </p>
                          )}

                          {prompt.variables && prompt.variables.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground">
                                {language === "pt-BR" ? "Variáveis disponíveis:" : "Available variables:"}
                              </span>
                              {prompt.variables.map(v => (
                                <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {v}
                                </code>
                              ))}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>{language === "pt-BR" ? "Conteúdo do Prompt" : "Prompt Content"}</Label>
                            <Textarea
                              value={editedPrompts[prompt.id] ?? prompt.content}
                              onChange={(e) => handleEdit(prompt.id, e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                              placeholder="Prompt content..."
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchHistory(prompt.id)}
                                >
                                  <History className="w-4 h-4 mr-2" />
                                  {language === "pt-BR" ? "Histórico" : "History"}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    {language === "pt-BR" ? "Histórico de Versões" : "Version History"}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {prompt.name}
                                  </DialogDescription>
                                </DialogHeader>
                                {loadingHistory ? (
                                  <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                  </div>
                                ) : history.length === 0 ? (
                                  <p className="text-center text-muted-foreground py-8">
                                    {language === "pt-BR"
                                      ? "Nenhum histórico disponível ainda."
                                      : "No history available yet."}
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {history.map(h => (
                                      <div key={h.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge variant="outline">
                                            v{h.version}
                                          </Badge>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(h.changed_at).toLocaleString()}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRestore(prompt, h.content)}
                                              disabled={saving === prompt.id}
                                            >
                                              <RotateCcw className="w-4 h-4 mr-1" />
                                              {language === "pt-BR" ? "Restaurar" : "Restore"}
                                            </Button>
                                          </div>
                                        </div>
                                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                          {h.content.substring(0, 500)}
                                          {h.content.length > 500 && "..."}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              onClick={() => handleSave(prompt)}
                              disabled={saving === prompt.id || !hasChanges(prompt.id)}
                              className="min-w-[120px]"
                            >
                              {saving === prompt.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {language === "pt-BR" ? "Salvando..." : "Saving..."}
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  {language === "pt-BR" ? "Salvar" : "Save"}
                                </>
                              )}
                            </Button>
                          </div>

                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            <span>Key: </span>
                            <code className="bg-muted px-1.5 py-0.5 rounded">{prompt.key}</code>
                            <span className="mx-2">|</span>
                            <span>
                              {language === "pt-BR" ? "Última atualização:" : "Last updated:"}{" "}
                              {new Date(prompt.updated_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {getPromptsByCategory(category).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {language === "pt-BR"
                      ? "Nenhum prompt encontrado nesta categoria."
                      : "No prompts found in this category."}
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptsManager;
