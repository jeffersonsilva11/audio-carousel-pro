import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  User,
  Camera,
  Upload,
  X,
  Instagram,
  Save,
  Loader2,
  CheckCircle2,
  Crown,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Shield,
  Download,
  Trash2,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AVATAR_POSITIONS,
  DISPLAY_MODES,
  BRAND,
  CHARACTER_LIMITS,
  type AvatarPosition,
  type DisplayMode,
  getPositionLabel,
  getDisplayModeLabel
} from "@/lib/constants";
import { PLANS } from "@/lib/plans";
import { formatSubscriptionDate } from "@/lib/localization";
import SlidePreview from "@/components/carousel-creator/SlidePreview";
import { z } from "zod";

const ProfileSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { preferences, loading: prefsLoading, saving, savePreferences } = useUserPreferences();
  const { plan, isPro, subscriptionEnd, cancelAtPeriodEnd, openCustomerPortal, loading: subLoading, getDaysRemaining, status, failedPaymentCount, periodUsed, dailyLimit, getPeriodLabel, getRemainingCarousels, limitPeriod } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>("top-left");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("name_and_username");
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  // Privacy/LGPD state
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const passwordSchema = z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter ao menos um número");

  // Initialize from preferences
  useEffect(() => {
    if (!prefsLoading) {
      setName(preferences.name);
      setUsername(preferences.username);
      setPhotoUrl(preferences.photoUrl);
      setAvatarPosition(preferences.avatarPosition);
      setDisplayMode(preferences.displayMode);
    }
  }, [preferences, prefsLoading]);

  // Track changes
  useEffect(() => {
    if (!prefsLoading) {
      const changed =
        name !== preferences.name ||
        username !== preferences.username ||
        photoUrl !== preferences.photoUrl ||
        avatarPosition !== preferences.avatarPosition ||
        displayMode !== preferences.displayMode;
      setHasChanges(changed);
    }
  }, [name, username, photoUrl, avatarPosition, displayMode, preferences, prefsLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("profileSettings", "invalidFile", language),
        description: t("profileSettings", "selectImage", language),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("profileSettings", "fileTooLarge", language),
        description: t("profileSettings", "maxFileSize", language),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);

      toast({
        title: t("profileSettings", "photoUploaded", language),
        description: t("profileSettings", "photoUploadedDesc", language),
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: t("profileSettings", "uploadError", language),
        description: t("profileSettings", "uploadErrorDesc", language),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const handleSave = async () => {
    await savePreferences({
      name,
      username,
      photoUrl,
      avatarPosition,
      displayMode,
    });

    toast({
      title: t("profileSettings", "saved", language),
      description: t("profileSettings", "savedDesc", language),
    });
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Fraca", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: "Média", color: "bg-yellow-500" };
    return { score: 3, label: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleChangePassword = async () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = "Digite sua senha atual";
    }

    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      errors.new = passwordResult.error.errors[0].message;
    }

    if (newPassword !== confirmPassword) {
      errors.confirm = "As senhas não coincidem";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setChangingPassword(true);

    try {
      // First, verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ current: "Senha atual incorreta" });
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast({
          title: "Erro ao alterar senha",
          description: updateError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi atualizada com sucesso.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // LGPD: Export user data
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("export-user-data", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audisell-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t("privacy", "exportSuccess", language) || "Dados exportados!",
        description: t("privacy", "exportSuccessDesc", language) || "Seus dados foram baixados com sucesso.",
      });
    } catch (err) {
      toast({
        title: t("privacy", "exportError", language) || "Erro ao exportar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExportingData(false);
    }
  };

  // LGPD: Delete account and all data
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) {
      toast({
        title: t("privacy", "confirmationError", language) || "Confirmação incorreta",
        description: t("privacy", "confirmationErrorDesc", language) || "Digite seu email corretamente para confirmar.",
        variant: "destructive",
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("delete-account", {
        body: { confirmation: deleteConfirmation },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error || !response.data.success) {
        throw new Error(response.error?.message || response.data?.error || "Failed to delete account");
      }

      toast({
        title: t("privacy", "deleteSuccess", language) || "Conta excluída",
        description: t("privacy", "deleteSuccessDesc", language) || "Sua conta e todos os dados foram removidos.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      toast({
        title: t("privacy", "deleteError", language) || "Erro ao excluir conta",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation("");
    }
  };

  if (authLoading || prefsLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-semibold">Minha Conta</h1>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <Crown className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Assinatura</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Privacidade</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column - Forms */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Identity Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Identidade do Perfil
                        </CardTitle>
                        <CardDescription>
                          Estas informações aparecerão em todos os seus carrosséis
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {t("common", "save", language)}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Photo Upload */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div
                          className={cn(
                            "w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border transition-colors",
                            photoUrl && "border-solid border-accent"
                          )}
                        >
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : name ? (
                            <span className="text-2xl font-bold text-muted-foreground">
                              {getInitials(name)}
                            </span>
                          ) : (
                            <User className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        {photoUrl && (
                          <button
                            onClick={removePhoto}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Camera className="w-4 h-4 mr-2 animate-pulse" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {photoUrl ? 'Trocar foto' : 'Carregar foto'}
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG ou WebP. Máx 5MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Name and Username */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("profileIdentity", "name", language)}</Label>
                        <Input
                          id="name"
                          placeholder={t("profileIdentity", "namePlaceholder", language)}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={CHARACTER_LIMITS.PROFILE_NAME}
                        />
                        <span className="text-xs text-muted-foreground">
                          {name.length}/{CHARACTER_LIMITS.PROFILE_NAME}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">@username</Label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="username"
                            placeholder={t("profileIdentity", "usernamePlaceholder", language)}
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace('@', '').replace(/\s/g, ''))}
                            className="pl-10"
                            maxLength={CHARACTER_LIMITS.PROFILE_USERNAME}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {username.length}/{CHARACTER_LIMITS.PROFILE_USERNAME}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Avatar Position */}
                    <div className="space-y-3">
                      <Label>Posição no slide</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {AVATAR_POSITIONS.map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setAvatarPosition(pos.id)}
                            className={cn(
                              "relative p-3 rounded-lg border transition-all text-center",
                              avatarPosition === pos.id
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border hover:border-accent/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="w-full aspect-square bg-muted/50 rounded mb-2 relative">
                              <div
                                className={cn(
                                  "absolute w-3 h-3 rounded-full bg-accent",
                                  pos.id === 'top-left' && "top-1 left-1",
                                  pos.id === 'top-right' && "top-1 right-1",
                                  pos.id === 'bottom-left' && "bottom-1 left-1",
                                  pos.id === 'bottom-right' && "bottom-1 right-1"
                                )}
                              />
                            </div>
                            <span className="text-xs font-medium">{getPositionLabel(pos.labelKey, language)}</span>
                            {avatarPosition === pos.id && (
                              <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-accent" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Display Mode */}
                    <div className="space-y-3">
                      <Label>Exibir</Label>
                      <RadioGroup
                        value={displayMode}
                        onValueChange={(value) => setDisplayMode(value as DisplayMode)}
                        className="flex flex-col sm:flex-row gap-3"
                      >
                        {DISPLAY_MODES.map((mode) => (
                          <label
                            key={mode.id}
                            className={cn(
                              "flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              displayMode === mode.id
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            )}
                          >
                            <RadioGroupItem value={mode.id} />
                            <span className="text-sm font-medium">{getDisplayModeLabel(mode.labelKey, language)}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Preview */}
              <div className="space-y-4">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-base">Preview do Slide</CardTitle>
                    <CardDescription>
                      Como sua identidade aparecerá nos carrosséis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SlidePreview
                      profile={{
                        name,
                        username,
                        photoUrl,
                        avatarPosition,
                        displayMode
                      }}
                      style="BLACK_WHITE"
                      className="w-full"
                    />
                    <SlidePreview
                      profile={{
                        name,
                        username,
                        photoUrl,
                        avatarPosition,
                        displayMode
                      }}
                      style="WHITE_BLACK"
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            {/* Current Plan Card */}
            <Card className={isPro ? "border-accent/30 bg-gradient-to-br from-accent/5 to-transparent" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className={cn("w-5 h-5", isPro ? "text-accent" : "text-muted-foreground")} />
                  Plano Atual
                </CardTitle>
                <CardDescription>
                  Gerencie sua assinatura e veja os detalhes do seu plano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      isPro ? "bg-accent/10" : "bg-muted"
                    )}>
                      <Crown className={cn("w-6 h-6", isPro ? "text-accent" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{PLANS[plan].name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isPro ? (
                          subscriptionEnd && !cancelAtPeriodEnd ? (
                            <>Renova em {formatSubscriptionDate(subscriptionEnd, language)}</>
                          ) : cancelAtPeriodEnd && subscriptionEnd ? (
                            <span className="text-yellow-600">Cancela em {formatSubscriptionDate(subscriptionEnd, language)}</span>
                          ) : (
                            "Assinatura ativa"
                          )
                        ) : (
                          "Plano gratuito"
                        )}
                      </p>
                    </div>
                  </div>
                  {isPro && (
                    <span className="px-3 py-1 text-xs font-medium bg-accent/10 text-accent rounded-full">
                      Ativo
                    </span>
                  )}
                </div>

                {/* Plan Usage */}
                <div className="space-y-3">
                  <h4 className="font-medium">Uso do Plano</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{getRemainingCarousels()}</p>
                      <p className="text-sm text-muted-foreground">
                        Carrosséis restantes {getPeriodLabel(language)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{periodUsed}/{dailyLimit}</p>
                      <p className="text-sm text-muted-foreground">
                        Usados {getPeriodLabel(language)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plan Features */}
                <div className="space-y-3">
                  <h4 className="font-medium">Recursos do Plano</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("w-4 h-4", PLANS[plan].hasWatermark ? "text-muted-foreground" : "text-green-500")} />
                      <span className={PLANS[plan].hasWatermark ? "text-muted-foreground" : ""}>
                        {PLANS[plan].hasWatermark ? "Com marca d'água" : "Sem marca d'água"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("w-4 h-4", PLANS[plan].hasEditor ? "text-green-500" : "text-muted-foreground")} />
                      <span className={!PLANS[plan].hasEditor ? "text-muted-foreground" : ""}>
                        Editor de slides
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("w-4 h-4", PLANS[plan].hasHistory ? "text-green-500" : "text-muted-foreground")} />
                      <span className={!PLANS[plan].hasHistory ? "text-muted-foreground" : ""}>
                        Histórico completo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("w-4 h-4", PLANS[plan].hasZipDownload ? "text-green-500" : "text-muted-foreground")} />
                      <span className={!PLANS[plan].hasZipDownload ? "text-muted-foreground" : ""}>
                        Download em ZIP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cancellation Warning */}
                {cancelAtPeriodEnd && subscriptionEnd && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-600 dark:text-yellow-400">
                          Assinatura cancelada
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Você ainda pode usar o plano até {formatSubscriptionDate(subscriptionEnd, language)}.
                          Após essa data, sua conta será rebaixada para o plano gratuito.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Failed Warning */}
                {failedPaymentCount > 0 && status === "past_due" && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          Falha no pagamento
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Houve um problema com seu pagamento. Atualize seu método de pagamento para evitar a suspensão.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {isPro ? (
                    <Button variant="outline" onClick={() => openCustomerPortal()} className="gap-2">
                      <CreditCard className="w-4 h-4" />
                      Gerenciar Assinatura
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button variant="accent" onClick={() => navigate("/dashboard")} className="gap-2">
                      <Crown className="w-4 h-4" />
                      Ver Planos
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing History Info */}
            {isPro && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Histórico de Pagamentos
                  </CardTitle>
                  <CardDescription>
                    Acesse seu histórico completo de pagamentos e faturas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Para visualizar seu histórico de pagamentos, baixar faturas ou atualizar seu método de pagamento, acesse o portal do cliente.
                  </p>
                  <Button variant="outline" onClick={() => openCustomerPortal()} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Abrir Portal de Pagamentos
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Atualize sua senha para manter sua conta segura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label>Senha atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Digite sua senha atual"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordErrors({ ...passwordErrors, current: undefined });
                      }}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.current && (
                    <p className="text-sm text-destructive">{passwordErrors.current}</p>
                  )}
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-2">
                  <Label>Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordErrors({ ...passwordErrors, new: undefined });
                      }}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              passwordStrength.score >= level
                                ? passwordStrength.color
                                : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Força: <span className={cn(
                          passwordStrength.score === 1 && "text-red-500",
                          passwordStrength.score === 2 && "text-yellow-500",
                          passwordStrength.score === 3 && "text-green-500"
                        )}>{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}

                  {passwordErrors.new && (
                    <p className="text-sm text-destructive">{passwordErrors.new}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label>Confirme a nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordErrors({ ...passwordErrors, confirm: undefined });
                      }}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirm && (
                    <p className="text-sm text-destructive">{passwordErrors.confirm}</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Senhas coincidem
                    </p>
                  )}
                </div>

                {/* Password requirements */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium mb-2">Requisitos da senha:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className={cn(newPassword.length >= 8 && "text-green-600 dark:text-green-400")}>
                      • Mínimo 8 caracteres
                    </li>
                    <li className={cn(/[A-Z]/.test(newPassword) && "text-green-600 dark:text-green-400")}>
                      • Uma letra maiúscula
                    </li>
                    <li className={cn(/[a-z]/.test(newPassword) && "text-green-600 dark:text-green-400")}>
                      • Uma letra minúscula
                    </li>
                    <li className={cn(/[0-9]/.test(newPassword) && "text-green-600 dark:text-green-400")}>
                      • Um número
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando senha...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab - LGPD/GDPR */}
          <TabsContent value="privacy" className="space-y-6">
            {/* Export Data Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-accent" aria-hidden="true" />
                  {t("privacy", "exportTitle", language) || "Exportar Meus Dados"}
                </CardTitle>
                <CardDescription>
                  {t("privacy", "exportDescription", language) ||
                    "Baixe uma cópia de todos os seus dados armazenados na plataforma (LGPD Art. 18)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExportData}
                  disabled={exportingData}
                  className="w-full sm:w-auto"
                  aria-label={t("privacy", "exportButton", language) || "Exportar dados"}
                >
                  {exportingData ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      {t("privacy", "exporting", language) || "Exportando..."}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t("privacy", "exportButton", language) || "Baixar Meus Dados"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account Card */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                  {t("privacy", "deleteTitle", language) || "Excluir Minha Conta"}
                </CardTitle>
                <CardDescription>
                  {t("privacy", "deleteDescription", language) ||
                    "Exclua permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-destructive mb-1">
                        {t("privacy", "deleteWarningTitle", language) || "Atenção: Esta ação é irreversível!"}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t("privacy", "deleteWarning1", language) || "Todos os seus carrosséis serão excluídos"}</li>
                        <li>{t("privacy", "deleteWarning2", language) || "Seu histórico e estatísticas serão removidos"}</li>
                        <li>{t("privacy", "deleteWarning3", language) || "Sua assinatura será cancelada sem reembolso"}</li>
                        <li>{t("privacy", "deleteWarning4", language) || "Você não poderá recuperar nenhum dado"}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      aria-label={t("privacy", "deleteButton", language) || "Excluir conta"}
                    >
                      <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t("privacy", "deleteButton", language) || "Excluir Minha Conta"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                        {t("privacy", "deleteConfirmTitle", language) || "Confirmar Exclusão"}
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-4">
                          <p>
                            {t("privacy", "deleteConfirmDescription", language) ||
                              "Para confirmar a exclusão permanente da sua conta, digite seu email abaixo:"}
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="delete-confirmation">
                              {t("privacy", "typeEmail", language) || "Digite"}: <strong>{user?.email}</strong>
                            </Label>
                            <Input
                              id="delete-confirmation"
                              type="email"
                              placeholder={user?.email || "seu@email.com"}
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              className="font-mono"
                              aria-describedby="delete-confirmation-hint"
                            />
                            <p id="delete-confirmation-hint" className="text-xs text-muted-foreground">
                              {t("privacy", "typeEmailHint", language) ||
                                "Digite exatamente como mostrado acima para confirmar."}
                            </p>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setDeleteConfirmation("")}
                        aria-label={t("privacy", "cancel", language) || "Cancelar"}
                      >
                        {t("privacy", "cancel", language) || "Cancelar"}
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount || deleteConfirmation !== user?.email}
                        aria-label={t("privacy", "confirmDelete", language) || "Confirmar exclusão"}
                      >
                        {deletingAccount ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                            {t("privacy", "deleting", language) || "Excluindo..."}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                            {t("privacy", "confirmDelete", language) || "Excluir Permanentemente"}
                          </>
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Privacy Policy Link */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("privacy", "policyTitle", language) || "Política de Privacidade"}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("privacy", "policyDescription", language) || "Saiba como tratamos seus dados"}
                    </p>
                  </div>
                  <Button variant="outline" asChild aria-label={t("privacy", "viewPolicy", language) || "Ver política de privacidade"}>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t("privacy", "viewPolicy", language) || "Ver Política"}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileSettings;
