import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage, LANGUAGES } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic2, Plus, LogOut, Loader2, Image as ImageIcon, Calendar,
  Sparkles, FolderOpen, Crown, CreditCard, RefreshCw, AlertTriangle, Globe
} from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/constants";
import { PLANS } from "@/lib/plans";
import { formatLocalizedDate, formatSubscriptionDate, formatCount, formatInteger, formatRelativeTime } from "@/lib/localization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { user, loading, signOut } = useAuth();
  const { isPro, plan, dailyUsed, dailyLimit, subscriptionEnd, createCheckout, openCustomerPortal, loading: subLoading, getRemainingCarousels } = useSubscription();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loadingCarousels, setLoadingCarousels] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);


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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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

  if (loading) {
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
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
            </a>

            <div className="flex items-center gap-4">
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
              <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {t("nav", "logout", language)}
              </Button>
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
                    {isPro && subscriptionEnd && (
                      <span className="text-xs text-muted-foreground">
                        {t("dashboard", "until", language)} {formatSubscriptionDate(subscriptionEnd, language)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPro 
                      ? `${getRemainingCarousels()} ${t("dashboard", "remainingToday", language)}` 
                      : `${dailyUsed}/1 ${t("dashboard", "carouselUsed", language)}`}
                  </p>
                </div>
              </div>
              {isPro ? (
                <Button variant="outline" size="sm" onClick={openCustomerPortal}>
                  {t("dashboard", "manageSubscription", language)}
                </Button>
              ) : (
                <Button variant="accent" size="sm" onClick={() => createCheckout("starter")} disabled={checkoutLoading}>
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                  {t("dashboard", "seePlans", language)}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
            <span className="text-sm text-muted-foreground">
              {formatCount(carousels.length, language)} {carousels.length !== 1 ? t("dashboard", "carouselsCount", language) : t("dashboard", "carouselCount", language)}
            </span>
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
  );
};

export default Dashboard;