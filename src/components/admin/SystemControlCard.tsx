import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  UserX,
  Wrench,
  RefreshCw,
  Loader2,
  Save,
  AlertCircle,
  Clock,
  Bell,
  Mail,
  Shield,
  Server,
  Lock,
  Eye,
  EyeOff,
  Send,
} from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SystemControlCard = () => {
  const { settings, loading, updateSettings } = useSystemSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Local state for form
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true);
  const [useCustomEmailSending, setUseCustomEmailSending] = useState(false);
  const [customEmailFromName, setCustomEmailFromName] = useState("");
  const [customEmailFromAddress, setCustomEmailFromAddress] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceEndTime, setMaintenanceEndTime] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [versionMessage, setVersionMessage] = useState("");
  const [versionNotificationEnabled, setVersionNotificationEnabled] = useState(true);

  // Sync local state with fetched settings
  useEffect(() => {
    if (!loading) {
      setRegistrationDisabled(settings.registrationDisabled);
      setRegistrationMessage(settings.registrationDisabledMessage);
      setEmailVerificationEnabled(settings.emailVerificationEnabled);
      setUseCustomEmailSending(settings.useCustomEmailSending);
      setCustomEmailFromName(settings.customEmailFromName);
      setCustomEmailFromAddress(settings.customEmailFromAddress);
      setSmtpHost(settings.smtpHost || "");
      setSmtpPort(settings.smtpPort || "587");
      setSmtpUser(settings.smtpUser || "");
      setSmtpSecure(settings.smtpSecure);
      setMaintenanceMode(settings.maintenanceMode);
      setMaintenanceMessage(settings.maintenanceMessage);
      setMaintenanceEndTime(settings.maintenanceEndTime || "");
      setAppVersion(settings.appVersion);
      setVersionMessage(settings.versionUpdateMessage);
      setVersionNotificationEnabled(settings.versionNotificationEnabled);
    }
  }, [settings, loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToUpdate: Record<string, string> = {
        'registration_disabled': String(registrationDisabled),
        'registration_disabled_message': registrationMessage,
        'email_verification_enabled': String(emailVerificationEnabled),
        'use_custom_email_sending': String(useCustomEmailSending),
        'custom_email_from_name': customEmailFromName,
        'custom_email_from_address': customEmailFromAddress,
        'smtp_host': smtpHost,
        'smtp_port': smtpPort,
        'smtp_user': smtpUser,
        'smtp_secure': String(smtpSecure),
        'maintenance_mode': String(maintenanceMode),
        'maintenance_message': maintenanceMessage,
        'maintenance_end_time': maintenanceEndTime,
        'app_version': appVersion,
        'version_update_message': versionMessage,
        'version_notification_enabled': String(versionNotificationEnabled),
      };

      // If password is set, we need to update it via edge function (stored as secret)
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
          description: "As configurações do sistema foram atualizadas com sucesso.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Format datetime-local value
  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  // Convert datetime-local to ISO string
  const handleDateTimeChange = (value: string) => {
    if (!value) {
      setMaintenanceEndTime("");
      return;
    }
    const date = new Date(value);
    setMaintenanceEndTime(date.toISOString());
  };

  // Test email sending
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
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("send-smtp-email", {
        body: {
          to: customEmailFromAddress || smtpUser,
          subject: "Teste de E-mail - Audisell",
          template: "test",
          smtpConfig: {
            host: smtpHost,
            port: parseInt(smtpPort),
            user: smtpUser,
            password: smtpPassword,
            secure: smtpSecure,
            fromName: customEmailFromName,
            fromAddress: customEmailFromAddress || smtpUser,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado!",
        description: `E-mail de teste enviado para ${customEmailFromAddress || smtpUser}`,
      });
    } catch (error) {
      console.error("Test email error:", error);
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Controle do Sistema
            </CardTitle>
            <CardDescription>
              Controles de emergência e manutenção do sistema
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Tudo
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Registration Control */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Controle de Cadastro</h3>
            {registrationDisabled && (
              <Badge variant="destructive" className="text-xs">BLOQUEADO</Badge>
            )}
          </div>

          <div className="pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bloquear novos cadastros</Label>
                <p className="text-sm text-muted-foreground">
                  Impede que novos usuários se registrem na plataforma
                </p>
              </div>
              <Switch
                checked={registrationDisabled}
                onCheckedChange={setRegistrationDisabled}
              />
            </div>

            {registrationDisabled && (
              <div className="space-y-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <Label>Mensagem para usuários</Label>
                <Textarea
                  value={registrationMessage}
                  onChange={(e) => setRegistrationMessage(e.target.value)}
                  placeholder="Mensagem exibida na página de cadastro..."
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Email Verification Control */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Verificação de E-mail</h3>
            {!emailVerificationEnabled && (
              <Badge variant="secondary" className="text-xs">DESABILITADA</Badge>
            )}
          </div>

          <div className="pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Exigir verificação de e-mail</Label>
                <p className="text-sm text-muted-foreground">
                  Usuários precisam confirmar e-mail antes de acessar
                </p>
              </div>
              <Switch
                checked={emailVerificationEnabled}
                onCheckedChange={setEmailVerificationEnabled}
              />
            </div>

            {emailVerificationEnabled && (
              <div className="space-y-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Usar envio customizado
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Plataforma envia e-mails (mais barato que Supabase)
                    </p>
                  </div>
                  <Switch
                    checked={useCustomEmailSending}
                    onCheckedChange={setUseCustomEmailSending}
                  />
                </div>

                {useCustomEmailSending && (
                  <div className="space-y-4 pt-2">
                    {/* Remetente */}
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

                    {/* SMTP Configuration */}
                    <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-medium text-sm">Configuração SMTP</h4>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Host SMTP</Label>
                          <Input
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="Ex: smtp.hostinger.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Porta</Label>
                          <Input
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                            placeholder="587"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Usuário SMTP</Label>
                          <Input
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="noreply@seudominio.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Senha SMTP</Label>
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <Label className="font-normal">Usar TLS/SSL</Label>
                        </div>
                        <Switch
                          checked={smtpSecure}
                          onCheckedChange={setSmtpSecure}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestEmail}
                        disabled={testingEmail || !smtpHost || !smtpUser}
                        className="w-full gap-2"
                      >
                        {testingEmail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar e-mail de teste
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Sem verificação:</strong> Usuários acessam imediatamente após cadastro.<br/>
                    <strong>Com Supabase:</strong> E-mails são enviados pelo Supabase (limite: 3/hora grátis).<br/>
                    <strong>Customizado (SMTP):</strong> Use seu próprio servidor de e-mail (Hostinger, Gmail, etc).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Maintenance Mode */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Modo Manutenção</h3>
            {maintenanceMode && (
              <Badge variant="destructive" className="text-xs">ATIVO</Badge>
            )}
          </div>

          <div className="pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativar modo manutenção</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe página de manutenção para todos (exceto admins)
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
              />
            </div>

            {maintenanceMode && (
              <div className="space-y-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-2 text-sm text-amber-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Quando ativo, todos os usuários (exceto administradores) serão
                    redirecionados para uma página de manutenção.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem de manutenção</Label>
                  <Textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Mensagem exibida durante a manutenção..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Previsão de término (opcional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(maintenanceEndTime)}
                    onChange={(e) => handleDateTimeChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se definido, um contador regressivo será exibido na página de manutenção
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Version Notification */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Notificação de Nova Versão</h3>
            {versionNotificationEnabled && (
              <Badge variant="secondary" className="text-xs">ATIVO</Badge>
            )}
          </div>

          <div className="pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Habilitar notificações de versão</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra alerta quando o usuário está com versão antiga do site
                </p>
              </div>
              <Switch
                checked={versionNotificationEnabled}
                onCheckedChange={setVersionNotificationEnabled}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Versão atual do app</Label>
                <Input
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  placeholder="Ex: 1.0.0"
                />
                <p className="text-xs text-muted-foreground">
                  Incremente após cada deploy para notificar usuários
                </p>
              </div>
            </div>

            {versionNotificationEnabled && (
              <div className="space-y-2">
                <Label>Mensagem de atualização</Label>
                <Textarea
                  value={versionMessage}
                  onChange={(e) => setVersionMessage(e.target.value)}
                  placeholder="Mensagem exibida quando há nova versão..."
                  className="min-h-[60px]"
                />
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Quando a versão muda, usuários verão um banner no canto inferior
                direito com opção de recarregar a página sem cache.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemControlCard;
