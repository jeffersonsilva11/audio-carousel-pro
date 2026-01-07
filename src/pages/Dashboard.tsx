import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage, LANGUAGES } from "@/hooks/useLanguage";
import { useOnboarding } from "@/hooks/useOnboarding";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic2, Plus, LogOut, Loader2, Image as ImageIcon, Calendar,
  Sparkles, FolderOpen, Crown, CreditCard, RefreshCw, AlertTriangle, Globe, User, History, Shield, Clock, Bell, X, Headphones, Menu
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBell from "@/components/NotificationBell";
import UsageStats from "@/components/dashboard/UsageStats";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import PlansModal from "@/components/dashboard/PlansModal";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { toast } from "sonner";
import { BRAND } from "@/lib/constants";
import { PLANS } from "@/lib/plans";
import { formatLocalizedDate, formatSubscriptionDate, formatCount, formatInteger, formatRelativeTime, formatDaysRemaining, getDaysRemainingUrgency } from "@/lib/localization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Carousel {
  id: string;
  tone: string;
  style: string;
  format: string;
  status: string;
  slide_count: number;
  image_urls: string[] | null;
  created_at: string;
  has_watermark: boolean | null;
}

const Dashboard = () => {
  const { user, loading, signOut, isEmailConfirmed } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { isPro, plan, dailyUsed, dailyLimit, limitPeriod, periodUsed, subscriptionEnd, createCheckout, openCustomerPortal, loading: subLoading, getRemainingCarousels, getPeriodLabel, getDaysRemaining, isCancelled, isLastDay, cancelAtPeriodEnd, status, failedPaymentCount } = useSubscription();
  const { notifications, unreadCount, markAsRead, clearNotification } = useNotifications();
  const { language, setLanguage } = useLanguage();
  const { showOnboarding, loading: onboardingLoading, completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loadingCarousels, setLoadingCarousels] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);


  // Handle subscription callback
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    if (subscription === "success") {
      toast.success(t("dashboard", "subscriptionSuccess", language));
      window.history.replaceState({}, "", "/dashboard");
    } else if (subscription === "canceled") {
      toast.info(t("dashboard", "checkoutCanceled", language));
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, language]);

  // State to track if we're checking email verification
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    // Check email verification status
    if (!loading && user) {
      const checkVerification = async () => {
        // Check if email verification is required
        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "email_verification_enabled")
          .maybeSingle();

        const verificationRequired = settingsData?.value !== "false";

        if (verificationRequired && !isEmailConfirmed) {
          // Email verification required but not confirmed
          // Send verification email, sign out and redirect to verify page
          try {
            await supabase.functions.invoke("send-signup-verification", {
              body: {
                userId: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.user_metadata?.full_name || undefined
              },
            });
          } catch (emailError) {
            console.error("Error sending verification email:", emailError);
          }

          // Sign out and redirect to verify page
          await supabase.auth.signOut();
          navigate(`/auth/verify?email=${encodeURIComponent(user.email || "")}`);
          return;
        }

        // All checks passed
        setCheckingVerification(false);
      };

      checkVerification();
    }
  }, [user, loading, isEmailConfirmed, navigate]);

  useEffect(() => {
    if (user) {
      fetchCarousels();
    }
  }, [user]);

  const fetchCarousels = async () => {
    try {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCarousels(data || []);
    } catch (error) {
      console.error("Error fetching carousels:", error);
    } finally {
      setLoadingCarousels(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await createCheckout();
    } catch (error) {
      toast.error(t("common", "error", language));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRegenerateWithoutWatermark = async (carouselId: string) => {
    if (!user || !isPro) {
      toast.error(t("dashboard", "proOnly", language));
      return;
    }

    setRegeneratingId(carouselId);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-without-watermark", {
        body: { carouselId, userId: user.id }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Error");
      }

      toast.success(t("dashboard", "watermarkRemoved", language));
      await fetchCarousels();
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error(t("dashboard", "watermarkError", language));
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as "pt-BR" | "en" | "es");
    toast.success(t("settings", "languageChanged", newLang as "pt-BR" | "en" | "es"));
  };

  const getToneLabel = (tone: string) => {
    const tones: Record<string, string> = {
      EMOTIONAL: t("toneShowcase", "emotional", language),
      PROFESSIONAL: t("toneShowcase", "professional", language),
      PROVOCATIVE: t("toneShowcase", "provocative", language)
    };
    return tones[tone] || tone;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: "bg-green-500/10 text-green-500",
      PROCESSING: "bg-yellow-500/10 text-yellow-500",
      FAILED: "bg-red-500/10 text-red-500"
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status: string) => {
    if (status === "COMPLETED") return t("dashboard", "ready", language);
    if (status === "PROCESSING") return t("dashboard", "processing", language);
    return t("dashboard", "errorStatus", language);
  };

  if (loading || subLoading || onboardingLoading || checkingVerification) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Onboarding Modal */}
      <OnboardingModal open={showOnboarding} onComplete={completeOnboarding} />
      
      {/* Plans Modal */}
      <PlansModal open={showPlansModal} onOpenChange={setShowPlansModal} />
      
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
            </a>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Plan badge - hidden on mobile */}
              {!subLoading && (
                <div className="hidden sm:flex items-center gap-2">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
                      <Crown className="w-3.5 h-3.5" />
                      {PLANS[plan].name}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpgrade}
                      disabled={checkoutLoading}
                      className="text-accent border-accent/30 hover:bg-accent/10"
                    >
                      {checkoutLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-1" />
                          {t("create", "upgradePro", language)}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Desktop: Show all buttons */}
              <div className="hidden md:flex items-center gap-2">
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} title="Admin Panel">
                    <Shield className="w-4 h-4 text-accent mr-1" />
                    Admin
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")} title="Suporte">
                  <Headphones className="w-4 h-4 mr-1" />
                  Suporte
                </Button>
                <NotificationBell />
                <Button variant="ghost" size="icon" onClick={() => navigate("/settings/profile")} title={t("settings", "profile", language)}>
                  <User className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav", "logout", language)}
                </Button>
              </div>

              {/* Mobile: Notification + Support + Menu */}
              <div className="flex md:hidden items-center gap-1">
                <NotificationBell />
                <Button variant="ghost" size="icon" onClick={() => navigate("/support")} title="Suporte">
                  <Headphones className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="w-4 h-4 mr-2 text-accent" />
                          Admin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      {t("settings", "profile", language)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("nav", "logout", language)}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t("dashboard", "hello", language)}{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground">{t("dashboard", "manageCarousels", language)}</p>
        </div>

        {/* Language Settings Card */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{t("settings", "language", language)}</p>
                <p className="text-sm text-muted-foreground">{t("settings", "languageDesc", language)}</p>
              </div>
            </div>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Subscription status card */}
        {!subLoading && (
          <Card className={`mb-6 ${isPro ? "border-accent/30 bg-gradient-to-br from-accent/5 to-transparent" : "border-border"}`}>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPro ? "bg-accent/10" : "bg-muted"}`}>
                  {isPro ? <Crown className="w-5 h-5 text-accent" /> : <CreditCard className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{PLANS[plan].name}</span>
                    {isPro && subscriptionEnd && !cancelAtPeriodEnd && (
                      <span className="text-xs text-muted-foreground">
                        {t("dashboard", "until", language)} {formatSubscriptionDate(subscriptionEnd, language)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPro
                      ? `${getRemainingCarousels()} ${language === "pt-BR" ? "restantes" : language === "es" ? "restantes" : "remaining"} ${getPeriodLabel(language)}`
                      : `${periodUsed}/1 ${t("dashboard", "carouselUsed", language)}`}
                  </p>
                </div>
              </div>
              {isPro ? (
                <Button variant="outline" size="sm" onClick={() => setShowPlansModal(true)}>
                  {t("dashboard", "manageSubscription", language)}
                </Button>
              ) : (
                <Button variant="accent" size="sm" onClick={() => setShowPlansModal(true)}>
                  <Crown className="w-4 h-4 mr-2" />
                  {t("dashboard", "seePlans", language)}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancellation Banner */}
        {cancelAtPeriodEnd && subscriptionEnd && (
          <Card className="mb-6 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {language === "pt-BR" ? "Assinatura cancelada" : language === "es" ? "Suscripción cancelada" : "Subscription cancelled"}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {getDaysRemaining() > 0 ? (
                      language === "pt-BR"
                        ? `Você ainda pode usar o plano ${PLANS[plan].name} por mais ${getDaysRemaining()} dia(s) até ${formatSubscriptionDate(subscriptionEnd, language)}.`
                        : language === "es"
                          ? `Aún puedes usar el plan ${PLANS[plan].name} por ${getDaysRemaining()} día(s) más hasta ${formatSubscriptionDate(subscriptionEnd, language)}.`
                          : `You can still use the ${PLANS[plan].name} plan for ${getDaysRemaining()} more day(s) until ${formatSubscriptionDate(subscriptionEnd, language)}.`
                    ) : (
                      language === "pt-BR"
                        ? "Sua assinatura expira hoje. Renove para continuar usando."
                        : language === "es"
                          ? "Tu suscripción expira hoy. Renueva para continuar usando."
                          : "Your subscription expires today. Renew to continue using."
                    )}
                  </p>
                </div>
              </div>
              <Button variant="accent" size="sm" onClick={() => setShowPlansModal(true)}>
                <Crown className="w-4 h-4 mr-2" />
                {language === "pt-BR" ? "Renovar assinatura" : language === "es" ? "Renovar suscripción" : "Renew subscription"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Failure Banner */}
        {failedPaymentCount > 0 && status === "past_due" && (
          <Card className="mb-6 border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {language === "pt-BR" ? "Falha no pagamento" : language === "es" ? "Fallo en el pago" : "Payment failed"}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {failedPaymentCount >= 3 ? (
                      language === "pt-BR"
                        ? "Sua conta será rebaixada para o plano gratuito em breve. Atualize seu método de pagamento."
                        : language === "es"
                          ? "Tu cuenta será degradada al plan gratuito pronto. Actualiza tu método de pago."
                          : "Your account will be downgraded to free plan soon. Update your payment method."
                    ) : (
                      language === "pt-BR"
                        ? `${3 - failedPaymentCount} tentativa(s) restante(s) antes da suspensão.`
                        : language === "es"
                          ? `${3 - failedPaymentCount} intento(s) restante(s) antes de la suspensión.`
                          : `${3 - failedPaymentCount} attempt(s) remaining before suspension.`
                    )}
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => openCustomerPortal()}>
                <CreditCard className="w-4 h-4 mr-2" />
                {language === "pt-BR" ? "Atualizar pagamento" : language === "es" ? "Actualizar pago" : "Update payment"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notifications Banner */}
        {notifications.filter(n => !n.read && n.isFromServer).slice(0, 1).map((notification) => (
          <Card key={notification.id} className="mb-6 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <span className="font-semibold">{notification.title}</span>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {notification.link && (
                  <Button variant="outline" size="sm" onClick={() => {
                    markAsRead(notification.id);
                    navigate(notification.link!);
                  }}>
                    {language === "pt-BR" ? "Ver mais" : language === "es" ? "Ver más" : "View more"}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => clearNotification(notification.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Usage Stats - Metrics */}
        <div className="mb-6">
          <UsageStats />
        </div>

        {/* Quick actions */}
        <Card className="mb-8 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">{t("dashboard", "createNewCarousel", language)}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard", "transformAudio", language)}</p>
              </div>
            </div>
            <Button variant="accent" className="w-full sm:w-auto" onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4 mr-2" />
              {t("dashboard", "newCarousel", language)}
            </Button>
          </CardContent>
        </Card>

        {/* Carousels grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("dashboard", "yourCarousels", language)}</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {formatCount(carousels.length, language)} {carousels.length !== 1 ? t("dashboard", "carouselsCount", language) : t("dashboard", "carouselCount", language)}
              </span>
              {isPro && carousels.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
                  <History className="w-4 h-4 mr-2" />
                  {t("history", "viewHistory", language)}
                </Button>
              )}
            </div>
          </div>

          {loadingCarousels ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : carousels.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg mb-2">{t("dashboard", "noCarouselsYet", language)}</CardTitle>
                <CardDescription className="mb-4">{t("dashboard", "createFirstCarousel", language)}</CardDescription>
                <Button variant="accent" onClick={() => navigate("/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("dashboard", "createFirst", language)}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carousels.map((carousel) => (
                <Card 
                  key={carousel.id} 
                  className="group hover:shadow-lg transition-all hover:border-accent/50 cursor-pointer"
                  onClick={() => navigate(`/carousel/${carousel.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{getToneLabel(carousel.tone)}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatInteger(carousel.slide_count, language)} {t("dashboard", "slides", language)} • {carousel.format.replace("_", " ")}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {carousel.has_watermark && (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Watermark
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(carousel.status)}`}>
                          {getStatusLabel(carousel.status)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={formatLocalizedDate(carousel.created_at, language, "withTime")}>
                      <Calendar className="w-3 h-3" />
                      {formatRelativeTime(carousel.created_at, language)}
                    </div>

                    {/* Days remaining indicator */}
                    {carousel.status === "COMPLETED" && carousel.image_urls && carousel.image_urls.length > 0 && (() => {
                      const urgency = getDaysRemainingUrgency(carousel.created_at);
                      const urgencyStyles = {
                        critical: "text-red-500",
                        warning: "text-amber-500",
                        normal: "text-blue-500",
                        expired: "text-gray-400"
                      };
                      return (
                        <div className={`flex items-center gap-1.5 text-xs ${urgencyStyles[urgency]}`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDaysRemaining(carousel.created_at, language)}</span>
                        </div>
                      );
                    })()}

                    {/* Retry button for failed carousels */}
                    {carousel.status === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/create?retry=${carousel.id}`);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Tentar Novamente
                      </Button>
                    )}

                    {carousel.has_watermark && carousel.status === "COMPLETED" && isPro && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateWithoutWatermark(carousel.id);
                        }}
                        disabled={regeneratingId === carousel.id}
                      >
                        {regeneratingId === carousel.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {t("dashboard", "removing", language)}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            {t("dashboard", "removeWatermark", language)}
                          </>
                        )}
                      </Button>
                    )}
                    
                    {carousel.has_watermark && carousel.status === "COMPLETED" && !isPro && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-accent hover:text-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpgrade();
                        }}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        {t("dashboard", "upgradeToRemove", language)}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default Dashboard;