import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Save,
  Loader2,
  Eye,
  Code,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Variable,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface EmailTemplateEditorProps {
  onBack?: () => void;
}

const EmailTemplateEditor = ({ onBack }: EmailTemplateEditorProps) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editMode, setEditMode] = useState<"visual" | "code">("code");

  // Edit states
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_key");

      if (error) throw error;

      const formattedTemplates: EmailTemplate[] = (data || []).map((t) => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
      }));

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates de e-mail.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditSubject(template.subject);
    setEditHtml(template.html_content);
    setEditActive(template.is_active);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: editSubject,
          html_content: editHtml,
          is_active: editActive,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Template salvo",
        description: "As alterações foram salvas com sucesso.",
      });

      // Update local state
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, subject: editSubject, html_content: editHtml, is_active: editActive }
            : t
        )
      );
      setSelectedTemplate({
        ...selectedTemplate,
        subject: editSubject,
        html_content: editHtml,
        is_active: editActive,
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedTemplate) return;

    // This would require storing defaults somewhere, for now we just reload
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve você poderá restaurar o template padrão.",
    });
  };

  const renderPreviewHtml = () => {
    let html = editHtml;
    // Replace variables with sample data for preview
    const sampleData: Record<string, string> = {
      fromName: "Audisell",
      name: ", João",
      otp: "123456",
      host: "smtp.hostinger.com",
      port: "587",
      secure: "Sim",
      siteUrl: "https://audisell.com",
      dashboardUrl: "https://audisell.com/dashboard",
      earlyAccessUrl: "https://audisell.com/pricing",
      spotsRemaining: "127",
      year: new Date().getFullYear().toString(),
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    return html;
  };

  const getTemplateIcon = (key: string) => {
    switch (key) {
      case "test":
        return <Mail className="w-4 h-4 text-purple-500" />;
      case "verification":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "password_reset":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "welcome":
        return <FileText className="w-4 h-4 text-green-500" />;
      // Onboarding sequence templates
      case "onboarding_welcome":
        return <Mail className="w-4 h-4 text-indigo-500" />;
      case "onboarding_success_story":
        return <FileText className="w-4 h-4 text-pink-500" />;
      case "onboarding_limited_offer":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedTemplate(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getTemplateIcon(selectedTemplate.template_key)}
                    {selectedTemplate.name}
                  </CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Editor */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assunto do E-mail</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Assunto do e-mail"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use {"{{variavel}}"} para inserir variáveis dinâmicas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conteúdo HTML</CardTitle>
                  <Tabs
                    value={editMode}
                    onValueChange={(v) => setEditMode(v as "visual" | "code")}
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="code" className="text-xs gap-1">
                        <Code className="w-3 h-3" />
                        Código
                      </TabsTrigger>
                      <TabsTrigger value="visual" className="text-xs gap-1">
                        <Eye className="w-3 h-3" />
                        Visual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {editMode === "code" ? (
                  <Textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="<!DOCTYPE html>..."
                  />
                ) : (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={renderPreviewHtml()}
                      className="w-full h-[400px]"
                      title="Preview"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Template ativo</Label>
                  <Switch checked={editActive} onCheckedChange={setEditActive} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Templates inativos não serão usados para envio de e-mails
                </p>
              </CardContent>
            </Card>

            {/* Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Variable className="w-4 h-4" />
                  Variáveis Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${variable}}}`);
                        toast({
                          title: "Copiado!",
                          description: `{{${variable}}} copiado para área de transferência`,
                        });
                      }}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Clique em uma variável para copiar
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleResetToDefault}
                >
                  <RefreshCw className="w-4 h-4" />
                  Restaurar padrão
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview do E-mail</DialogTitle>
              <DialogDescription>
                Visualização de como o e-mail será exibido para o destinatário
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-3 border-b bg-gray-50">
                  <p className="text-sm">
                    <strong>De:</strong> Audisell &lt;noreply@audisell.com&gt;
                  </p>
                  <p className="text-sm">
                    <strong>Assunto:</strong>{" "}
                    {editSubject.replace(/{{(\w+)}}/g, (_, key) => {
                      const samples: Record<string, string> = {
                        fromName: "Audisell",
                      };
                      return samples[key] || key;
                    })}
                  </p>
                </div>
                <iframe
                  srcDoc={renderPreviewHtml()}
                  className="w-full h-[500px]"
                  title="Email Preview"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Template list view
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                Editor de Templates
              </CardTitle>
              <CardDescription>
                Personalize os templates de e-mail enviados pela plataforma
              </CardDescription>
            </div>
            {onBack && (
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getTemplateIcon(template.template_key)}
                  {template.name}
                </CardTitle>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Assunto:</span>{" "}
                  <span className="font-medium">{template.subject}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 4).map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">
                      {v}
                    </Badge>
                  ))}
                  {template.variables.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.variables.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Os templates de e-mail serão carregados automaticamente após a migração do banco de
              dados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailTemplateEditor;
