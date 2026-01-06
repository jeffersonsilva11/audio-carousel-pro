import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Server,
  Lock,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Save,
  Shield,
  CheckCircle,
  AlertCircle,
  Settings,
  FileText,
} from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useToast } from "@/hooks/use-toast";

const EmailSettingsCard = () => {
  const { settings, loading, updateSettings } = useSystemSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Email verification settings
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true);
  const [useCustomEmailSending, setUseCustomEmailSending] = useState(false);

  // Sender info
  const [customEmailFromName, setCustomEmailFromName] = useState("");
  const [customEmailFromAddress, setCustomEmailFromAddress] = useState("");

  // SMTP settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // Test states
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Sync local state with fetched settings
  useEffect(() => {
    if (!loading) {
      setEmailVerificationEnabled(settings.emailVerificationEnabled);
      setUseCustomEmailSending(settings.useCustomEmailSending);
      setCustomEmailFromName(settings.customEmailFromName);
      setCustomEmailFromAddress(settings.customEmailFromAddress);
      setSmtpHost(settings.smtpHost || "");
      setSmtpPort(settings.smtpPort || "587");
      setSmtpUser(settings.smtpUser || "");
      setSmtpSecure(settings.smtpSecure);
    }
  }, [settings, loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToUpdate: Record<string, string> = {
        'email_verification_enabled': String(emailVerificationEnabled),
        'use_custom_email_sending': String(useCustomEmailSending),
        'custom_email_from_name': customEmailFromName,
        'custom_email_from_address': customEmailFromAddress,
        'smtp_host': smtpHost,
        'smtp_port': smtpPort,
        'smtp_user': smtpUser,
        'smtp_secure': String(smtpSecure),
      };

      // If password is set, update via edge function
      if (smtpPassword) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.functions.invoke("update-smtp-password", {
            body: { password: smtpPassword }
          });
        } catch (err) {
          console.warn("Could not update SMTP password via edge function:", err);
        }
      }

      const success = await updateSettings(settingsToUpdate);

      if (success) {
        toast({
          title: "Configurações salvas",
          description: "As configurações de e-mail foram atualizadas.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!smtpHost || !smtpUser || !smtpPassword) {
      toast({
        title: "Configuração incompleta",
        description: "Preencha host, usuário e senha SMTP antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("send-smtp-email", {
        body: {
          to: customEmailFromAddress || smtpUser,
          template: "test",
          smtpConfig: {
            host: smtpHost,
            port: parseInt(smtpPort),
            user: smtpUser,
            password: smtpPassword,
            secure: smtpSecure,
            fromName: customEmailFromName || "Teste",
            fromAddress: customEmailFromAddress || smtpUser,
          }
        }
      });

      if (error) throw error;

      setTestResult("success");
      toast({
        title: "E-mail enviado!",
        description: `Teste enviado para ${customEmailFromAddress || smtpUser}`,
      });
    } catch (error) {
      setTestResult("error");
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Verifique as configurações SMTP",
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Configurações de E-mail
              </CardTitle>
              <CardDescription>
                Configure como os e-mails são enviados pela plataforma
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="verification" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verification" className="gap-2">
            <Shield className="w-4 h-4" />
            Verificação
          </TabsTrigger>
          <TabsTrigger value="smtp" className="gap-2">
            <Server className="w-4 h-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Verification Tab */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verificação de E-mail</CardTitle>
              <CardDescription>
                Configure se usuários precisam verificar o e-mail ao se cadastrar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Exigir verificação de e-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Usuários precisam confirmar e-mail antes de acessar a plataforma
                  </p>
                </div>
                <Switch
                  checked={emailVerificationEnabled}
                  onCheckedChange={setEmailVerificationEnabled}
                />
              </div>

              {emailVerificationEnabled && (
                <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Usar servidor SMTP próprio
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Envia e-mails via seu servidor (mais barato que Supabase)
                    </p>
                  </div>
                  <Switch
                    checked={useCustomEmailSending}
                    onCheckedChange={setUseCustomEmailSending}
                  />
                </div>
              )}

              {/* Info boxes */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <h4 className="font-medium text-sm mb-1">Sem verificação</h4>
                  <p className="text-xs text-muted-foreground">
                    Usuários acessam imediatamente após cadastro
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <h4 className="font-medium text-sm mb-1">Via Supabase</h4>
                  <p className="text-xs text-muted-foreground">
                    Limite de 3 e-mails/hora no plano gratuito
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <h4 className="font-medium text-sm mb-1">SMTP próprio</h4>
                  <p className="text-xs text-muted-foreground">
                    Sem limites, usa seu servidor (Hostinger, etc)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP Tab */}
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Configuração SMTP
                  </CardTitle>
                  <CardDescription>
                    Configure seu servidor de e-mail (Hostinger, Gmail, etc)
                  </CardDescription>
                </div>
                {testResult && (
                  <Badge variant={testResult === "success" ? "default" : "destructive"} className="gap-1">
                    {testResult === "success" ? (
                      <><CheckCircle className="w-3 h-3" /> Funcionando</>
                    ) : (
                      <><AlertCircle className="w-3 h-3" /> Erro</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sender Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Informações do Remetente
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do remetente</Label>
                    <Input
                      value={customEmailFromName}
                      onChange={(e) => setCustomEmailFromName(e.target.value)}
                      placeholder="Ex: Audisell"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail do remetente</Label>
                    <Input
                      type="email"
                      value={customEmailFromAddress}
                      onChange={(e) => setCustomEmailFromAddress(e.target.value)}
                      placeholder="Ex: noreply@seudominio.com"
                    />
                  </div>
                </div>
              </div>

              {/* Server Config */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Servidor SMTP
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host SMTP *</Label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="Ex: smtp.hostinger.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Porta *</Label>
                    <Input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                    />
                    <p className="text-xs text-muted-foreground">
                      587 (TLS) ou 465 (SSL)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Usuário SMTP *</Label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="noreply@seudominio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha SMTP *</Label>
                    <div className="relative">
                      <Input
                        type={showSmtpPassword ? "text" : "password"}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-normal">Usar conexão segura (TLS/SSL)</Label>
                  </div>
                  <Switch
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                  />
                </div>
              </div>

              {/* Test Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !smtpHost || !smtpUser || !smtpPassword}
                  className="flex-1 gap-2"
                >
                  {testingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar e-mail de teste
                </Button>
              </div>

              {/* Hostinger Guide */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  💡 Configuração para Hostinger
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Host:</strong> smtp.hostinger.com</p>
                  <p><strong>Porta:</strong> 587 (TLS) ou 465 (SSL)</p>
                  <p><strong>Usuário:</strong> seu-email@seudominio.com</p>
                  <p><strong>Senha:</strong> senha do e-mail</p>
                  <p><strong>TLS:</strong> Ativado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates de E-mail</CardTitle>
              <CardDescription>
                Templates pré-configurados para diferentes tipos de e-mail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium">Verificação de Conta</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enviado quando usuário se cadastra para confirmar o e-mail
                  </p>
                  <Badge variant="secondary">Automático</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <h4 className="font-medium">Recuperação de Senha</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enviado quando usuário solicita redefinição de senha
                  </p>
                  <Badge variant="secondary">Automático</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <h4 className="font-medium">Boas-vindas</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enviado após confirmação de conta bem-sucedida
                  </p>
                  <Badge variant="secondary">Automático</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <h4 className="font-medium">E-mail de Teste</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Usado para testar configurações SMTP
                  </p>
                  <Badge variant="outline">Manual</Badge>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Os templates incluem o logo e cores da sua marca automaticamente.
                  Para personalizar os templates, edite os arquivos em <code className="bg-muted px-1 rounded">supabase/functions/send-smtp-email/index.ts</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettingsCard;
