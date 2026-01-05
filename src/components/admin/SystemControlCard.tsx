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
      const success = await updateSettings({
        'registration_disabled': String(registrationDisabled),
        'registration_disabled_message': registrationMessage,
        'maintenance_mode': String(maintenanceMode),
        'maintenance_message': maintenanceMessage,
        'maintenance_end_time': maintenanceEndTime,
        'app_version': appVersion,
        'version_update_message': versionMessage,
        'version_notification_enabled': String(versionNotificationEnabled),
      });

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
