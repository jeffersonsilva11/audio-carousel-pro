import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic2, 
  Plus, 
  LogOut, 
  Loader2, 
  Image as ImageIcon, 
  Calendar,
  Sparkles,
  FolderOpen,
  Crown,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  const { isPro, subscribed, subscriptionEnd, createCheckout, openCustomerPortal, loading: subLoading } = useSubscription();
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
      toast.success("Assinatura Pro ativada com sucesso! 🎉");
      window.history.replaceState({}, "", "/dashboard");
    } else if (subscription === "canceled") {
      toast.info("Checkout cancelado");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

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
      toast.error("Erro ao iniciar checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast.error("Erro ao abrir portal de assinatura");
    }
  };

  const handleRegenerateWithoutWatermark = async (carouselId: string) => {
    if (!user || !isPro) {
      toast.error("Apenas assinantes Pro podem remover marca d'água");
      return;
    }

    setRegeneratingId(carouselId);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-without-watermark", {
        body: { carouselId, userId: user.id }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao regenerar");
      }

      toast.success("Marca d'água removida com sucesso!");
      // Refresh carousels list
      await fetchCarousels();
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error("Erro ao remover marca d'água");
    } finally {
      setRegeneratingId(null);
    }
  };

  const getToneLabel = (tone: string) => {
    const tones: Record<string, string> = {
      EMOTIONAL: "Emocional",
      PROFESSIONAL: "Profissional",
      PROVOCATIVE: "Provocador"
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
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                Carrossel<span className="text-accent">AI</span>
              </span>
            </a>

            {/* User actions */}
            <div className="flex items-center gap-4">
              {/* Subscription badge */}
              {!subLoading && (
                <div className="hidden sm:flex items-center gap-2">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
                      <Crown className="w-3.5 h-3.5" />
                      Pro
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
                          Upgrade Pro
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              <span className="text-sm text-muted-foreground hidden md:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
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
            Olá{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus carrosséis e crie novos conteúdos.
          </p>
        </div>

        {/* Subscription status card */}
        {!subLoading && (
          <Card className={`mb-6 ${isPro ? "border-accent/30 bg-gradient-to-br from-accent/5 to-transparent" : "border-border"}`}>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPro ? "bg-accent/10" : "bg-muted"}`}>
                  {isPro ? (
                    <Crown className="w-5 h-5 text-accent" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{isPro ? "Plano Pro" : "Plano Gratuito"}</span>
                    {isPro && subscriptionEnd && (
                      <span className="text-xs text-muted-foreground">
                        até {format(new Date(subscriptionEnd), "d MMM yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPro 
                      ? "Carrosséis ilimitados, sem marca d'água" 
                      : "1 carrossel grátis com marca d'água"}
                  </p>
                </div>
              </div>
              {isPro ? (
                <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                  Gerenciar assinatura
                </Button>
              ) : (
                <Button 
                  variant="accent" 
                  size="sm" 
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  Assinar Pro - R$ 29,90/mês
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
                <h3 className="font-semibold">Criar novo carrossel</h3>
                <p className="text-sm text-muted-foreground">
                  Transforme seu áudio em carrossel profissional
                </p>
              </div>
            </div>
            <Button variant="accent" className="w-full sm:w-auto" onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Carrossel
            </Button>
          </CardContent>
        </Card>

        {/* Carousels grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Seus Carrosséis</h2>
            <span className="text-sm text-muted-foreground">
              {carousels.length} carrossel{carousels.length !== 1 ? "éis" : ""}
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
                <CardTitle className="text-lg mb-2">Nenhum carrossel ainda</CardTitle>
                <CardDescription className="mb-4">
                  Crie seu primeiro carrossel a partir de um áudio
                </CardDescription>
                <Button variant="accent" onClick={() => navigate("/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Carrossel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carousels.map((carousel) => (
                <Card 
                  key={carousel.id} 
                  className="group hover:shadow-lg transition-all hover:border-accent/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {getToneLabel(carousel.tone)}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {carousel.slide_count} slides • {carousel.format.replace("_", " ")}
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
                          {carousel.status === "COMPLETED" ? "Pronto" : 
                           carousel.status === "PROCESSING" ? "Processando" : "Erro"}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(carousel.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </div>
                    
                    {/* Regenerate without watermark button for Pro users */}
                    {carousel.has_watermark && carousel.status === "COMPLETED" && isPro && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleRegenerateWithoutWatermark(carousel.id)}
                        disabled={regeneratingId === carousel.id}
                      >
                        {regeneratingId === carousel.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Remover marca d'água
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Upgrade prompt for free users with watermarked carousels */}
                    {carousel.has_watermark && carousel.status === "COMPLETED" && !isPro && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-accent hover:text-accent"
                        onClick={handleUpgrade}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Upgrade Pro para remover
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
