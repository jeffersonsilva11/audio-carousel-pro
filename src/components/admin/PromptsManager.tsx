import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  History,
  RotateCcw,
  Sparkles,
  Shield,
  Languages,
  Mic,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import PromptEditor from "./PromptEditor";

interface AIPrompt {
  id: string;
  key: string;
  category: string;
  name: string;
  description: string | null;
  content: string;
  default_content: string | null;
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

// Sample variable values for preview
const SAMPLE_VARIABLES: Record<string, string> = {
  "{{language_instruction}}": "Escreva em português brasileiro. Use linguagem clara e acessível.",
  "{{style_instructions}}": "MODO CRIATIVO:\n- Ajuste tom, ritmo e impacto\n- Adicione elementos de storytelling",
  "{{slide_structure}}": "ESTRUTURA (6 slides):\n1. HOOK: Abertura impactante\n2-4. CONTENT: Desenvolvimento\n5. CTA: Chamada para ação\n6. SIGNATURE: @seuinstagram",
  "{{words_guide}}": "50-80 palavras por slide",
  "{{template_context}}": "CAPA: Imagem de fundo em tela cheia\nCONTEÚDO: Slides com apenas texto",
  "{{text_mode}}": "creative",
  "{{creative_tone}}": "professional",
  "{{transcription}}": "[Transcrição do áudio do usuário será inserida aqui]",
  "{{slide_count}}": "6",
  "{{context_instruction}}": "This is a FAQ answer for a SaaS product.",
  "{{target_language}}": "English",
};

const PromptsManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [historyPromptId, setHistoryPromptId] = useState<string | null>(null);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});
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
      setEditedPrompts(prev => {
        const updated = { ...prev };
        delete updated[prompt.id];
        return updated;
      });
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

  const handleResetToDefault = async (prompt: AIPrompt) => {
    if (!prompt.default_content) {
      toast({
        title: "Erro",
        description: "Valor padrão não disponível para este prompt.",
        variant: "destructive",
      });
      return;
    }

    setSaving(prompt.id);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ content: prompt.default_content })
        .eq('id', prompt.id);

      if (error) throw error;

      toast({
        title: "Restaurado para padrão",
        description: `"${prompt.name}" foi restaurado para o valor original.`,
      });

      setEditedPrompts(prev => {
        const updated = { ...prev };
        delete updated[prompt.id];
        return updated;
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error resetting prompt:', error);
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

  const togglePreview = (promptId: string) => {
    setShowPreview(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }));
  };

  const getPromptsByCategory = (category: string) => {
    return prompts.filter(p => p.category === category);
  };

  const hasChanges = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    return editedPrompts[promptId] !== undefined && editedPrompts[promptId] !== prompt?.content;
  };

  const isModifiedFromDefault = (prompt: AIPrompt) => {
    return prompt.default_content && prompt.content !== prompt.default_content;
  };

  // Generate preview with variables substituted
  const getPreviewContent = (prompt: AIPrompt) => {
    let content = editedPrompts[prompt.id] ?? prompt.content;

    // Replace all known variables with sample values
    Object.entries(SAMPLE_VARIABLES).forEach(([variable, value]) => {
      content = content.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return content;
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
                          {isModifiedFromDefault(prompt) && (
                            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-600">
                              {language === "pt-BR" ? "Modificado" : "Modified"}
                            </Badge>
                          )}
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

                          {/* Editor/Preview Toggle */}
                          <div className="flex items-center justify-between">
                            <Label>{language === "pt-BR" ? "Conteúdo do Prompt" : "Prompt Content"}</Label>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`preview-${prompt.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                {showPreview[prompt.id]
                                  ? (language === "pt-BR" ? "Preview" : "Preview")
                                  : (language === "pt-BR" ? "Editor" : "Editor")}
                              </Label>
                              <Switch
                                id={`preview-${prompt.id}`}
                                checked={showPreview[prompt.id] || false}
                                onCheckedChange={() => togglePreview(prompt.id)}
                              />
                              {showPreview[prompt.id] ? (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Editor or Preview */}
                          {showPreview[prompt.id] ? (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted/50 rounded">
                                {language === "pt-BR"
                                  ? "Preview: variáveis substituídas por valores de exemplo"
                                  : "Preview: variables replaced with sample values"}
                              </div>
                              <div className="bg-zinc-900 rounded-lg p-4 overflow-auto max-h-[400px]">
                                <pre className="text-sm text-zinc-100 whitespace-pre-wrap font-mono">
                                  {getPreviewContent(prompt)}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <PromptEditor
                              value={editedPrompts[prompt.id] ?? prompt.content}
                              onChange={(value) => handleEdit(prompt.id, value)}
                              variables={prompt.variables || []}
                              minHeight="250px"
                            />
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {/* History Button */}
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

                              {/* Reset to Default Button */}
                              {prompt.default_content && isModifiedFromDefault(prompt) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      {language === "pt-BR" ? "Restaurar Padrão" : "Reset Default"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {language === "pt-BR" ? "Restaurar para o padrão?" : "Reset to default?"}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {language === "pt-BR"
                                          ? "Isso irá substituir o conteúdo atual pelo valor original da migration. Esta ação não pode ser desfeita (mas você pode usar o histórico para recuperar)."
                                          : "This will replace the current content with the original migration value. This action cannot be undone (but you can use history to recover)."}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        {language === "pt-BR" ? "Cancelar" : "Cancel"}
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleResetToDefault(prompt)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {language === "pt-BR" ? "Restaurar" : "Reset"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>

                            {/* Save Button */}
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

                          {/* Metadata */}
                          <div className="text-xs text-muted-foreground pt-2 border-t flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              Key: <code className="bg-muted px-1.5 py-0.5 rounded">{prompt.key}</code>
                            </span>
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
