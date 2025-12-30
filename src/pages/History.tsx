import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Mic2, ArrowLeft, Loader2, Image as ImageIcon, Calendar, Search,
  Crown, RefreshCw, AlertTriangle, Filter, X, Download, Eye, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/constants";
import { formatLocalizedDate, formatRelativeTime, formatInteger } from "@/lib/localization";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

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
  transcription: string | null;
}

const ITEMS_PER_PAGE = 12;

const History = () => {
  const { user, loading } = useAuth();
  const { isPro } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loadingCarousels, setLoadingCarousels] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [toneFilter, setToneFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

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
      toast.error(t("common", "error", language));
    } finally {
      setLoadingCarousels(false);
    }
  };

  const handleRegenerateWithoutWatermark = async (carouselId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
      PROCESSING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      FAILED: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return colors[status] || "bg-muted text-muted-foreground border-border";
  };

  const getStatusLabel = (status: string) => {
    if (status === "COMPLETED") return t("dashboard", "ready", language);
    if (status === "PROCESSING") return t("dashboard", "processing", language);
    return t("dashboard", "errorStatus", language);
  };

  const getFormatLabel = (format: string) => {
    const formats: Record<string, string> = {
      POST_SQUARE: "1:1",
      POST_PORTRAIT: "4:5",
      STORY: "9:16"
    };
    return formats[format] || format;
  };

  // Filtered and sorted carousels
  const filteredCarousels = useMemo(() => {
    let result = [...carousels];
    
    // Search filter (searches in transcription)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.transcription?.toLowerCase().includes(query) ||
        getToneLabel(c.tone).toLowerCase().includes(query)
      );
    }
    
    // Tone filter
    if (toneFilter !== "all") {
      result = result.filter(c => c.tone === toneFilter);
    }
    
    // Style filter
    if (styleFilter !== "all") {
      result = result.filter(c => c.style === styleFilter);
    }
    
    // Format filter
    if (formatFilter !== "all") {
      result = result.filter(c => c.format === formatFilter);
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }
    
    // Date sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateSort === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [carousels, searchQuery, toneFilter, styleFilter, formatFilter, statusFilter, dateSort, language]);

  // Pagination
  const totalPages = Math.ceil(filteredCarousels.length / ITEMS_PER_PAGE);
  const paginatedCarousels = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCarousels.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCarousels, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, toneFilter, styleFilter, formatFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setToneFilter("all");
    setStyleFilter("all");
    setFormatFilter("all");
    setStatusFilter("all");
    setDateSort("newest");
  };

  const hasActiveFilters = searchQuery || toneFilter !== "all" || styleFilter !== "all" || formatFilter !== "all" || statusFilter !== "all";

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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Mic2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
              </a>
            </div>
            
            {isPro && (
              <Badge variant="outline" className="border-accent/30 text-accent">
                <Crown className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{t("history", "title", language)}</h1>
          <p className="text-muted-foreground">{t("history", "subtitle", language)}</p>
        </div>

        {/* Search and filters */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("history", "searchPlaceholder", language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={toneFilter} onValueChange={setToneFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("history", "filterTone", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("history", "allTones", language)}</SelectItem>
                  <SelectItem value="EMOTIONAL">{t("toneShowcase", "emotional", language)}</SelectItem>
                  <SelectItem value="PROFESSIONAL">{t("toneShowcase", "professional", language)}</SelectItem>
                  <SelectItem value="PROVOCATIVE">{t("toneShowcase", "provocative", language)}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={styleFilter} onValueChange={setStyleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("history", "filterStyle", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("history", "allStyles", language)}</SelectItem>
                  <SelectItem value="BLACK_WHITE">{t("history", "blackWhite", language)}</SelectItem>
                  <SelectItem value="WHITE_BLACK">{t("history", "whiteBlack", language)}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("history", "filterFormat", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("history", "allFormats", language)}</SelectItem>
                  <SelectItem value="POST_SQUARE">1:1 (Square)</SelectItem>
                  <SelectItem value="POST_PORTRAIT">4:5 (Portrait)</SelectItem>
                  <SelectItem value="STORY">9:16 (Story)</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("history", "filterStatus", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("history", "allStatuses", language)}</SelectItem>
                  <SelectItem value="COMPLETED">{t("dashboard", "ready", language)}</SelectItem>
                  <SelectItem value="PROCESSING">{t("dashboard", "processing", language)}</SelectItem>
                  <SelectItem value="FAILED">{t("dashboard", "errorStatus", language)}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateSort} onValueChange={(v) => setDateSort(v as "newest" | "oldest")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("history", "newest", language)}</SelectItem>
                  <SelectItem value="oldest">{t("history", "oldest", language)}</SelectItem>
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="w-4 h-4 mr-1" />
                  {t("history", "clearFilters", language)}
                </Button>
              )}
            </div>
            
            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {formatInteger(filteredCarousels.length, language)} {filteredCarousels.length !== 1 
                  ? t("dashboard", "carouselsCount", language) 
                  : t("dashboard", "carouselCount", language)}
                {hasActiveFilters && ` (${t("history", "filtered", language)})`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Carousels grid */}
        {loadingCarousels ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : paginatedCarousels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg mb-2">
                {hasActiveFilters ? t("history", "noResults", language) : t("dashboard", "noCarouselsYet", language)}
              </CardTitle>
              <CardDescription className="mb-4">
                {hasActiveFilters ? t("history", "tryDifferentFilters", language) : t("dashboard", "createFirstCarousel", language)}
              </CardDescription>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {t("history", "clearFilters", language)}
                </Button>
              ) : (
                <Button variant="accent" onClick={() => navigate("/create")}>
                  {t("dashboard", "createFirst", language)}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedCarousels.map((carousel) => (
                <Card 
                  key={carousel.id} 
                  className="group hover:shadow-lg transition-all hover:border-accent/50 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/carousel/${carousel.id}`)}
                >
                  {/* Thumbnail preview */}
                  {carousel.image_urls && carousel.image_urls[0] ? (
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img 
                        src={carousel.image_urls[0]} 
                        alt="Carousel preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="w-8 h-8" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/carousel/${carousel.id}`);
                        }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">{getToneLabel(carousel.tone)}</CardTitle>
                        <CardDescription className="text-xs">
                          {formatInteger(carousel.slide_count, language)} slides • {getFormatLabel(carousel.format)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {carousel.has_watermark && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            WM
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(carousel.status)}`}>
                          {getStatusLabel(carousel.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={formatLocalizedDate(carousel.created_at, language, "withTime")}>
                      <Calendar className="w-3 h-3" />
                      {formatRelativeTime(carousel.created_at, language)}
                    </div>
                    
                    {carousel.has_watermark && carousel.status === "COMPLETED" && isPro && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={(e) => handleRegenerateWithoutWatermark(carousel.id, e)}
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
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default History;
