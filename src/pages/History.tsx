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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mic2, ArrowLeft, Loader2, Image as ImageIcon, Calendar, Search,
  Crown, RefreshCw, AlertTriangle, X, Download, Eye, CheckSquare, Square, Package, Clock
} from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/constants";
import HistorySkeleton from "@/components/skeletons/HistorySkeleton";
import { formatLocalizedDate, formatRelativeTime, formatInteger, formatDaysRemaining, getDaysRemainingUrgency } from "@/lib/localization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import JSZip from "jszip";

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
  
  // Selection for batch download
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [downloadingBatch, setDownloadingBatch] = useState(false);
  
  // Preview modal
  const [previewCarousel, setPreviewCarousel] = useState<Carousel | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  
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
      toast.error(t("common", "errorLoadingData", language));
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
        throw new Error(data?.error || error?.message || t("common", "errorUnexpected", language));
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

  // Selection handlers
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const completedCarousels = filteredCarousels.filter(c => c.status === "COMPLETED" && c.image_urls?.length);
    if (selectedIds.size === completedCarousels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completedCarousels.map(c => c.id)));
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    
    setDownloadingBatch(true);
    try {
      const zip = new JSZip();
      const selectedCarousels = carousels.filter(c => selectedIds.has(c.id));
      
      for (const carousel of selectedCarousels) {
        if (!carousel.image_urls?.length) continue;
        
        const carouselFolder = zip.folder(`carousel-${carousel.id.slice(0, 8)}`);
        if (!carouselFolder) continue;
        
        for (let i = 0; i < carousel.image_urls.length; i++) {
          const url = carousel.image_urls[i];
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.error(`Failed to fetch slide ${i + 1}: ${response.status}`);
              continue;
            }
            const blob = await response.blob();
            carouselFolder.file(`slide-${i + 1}.svg`, blob);
          } catch (err) {
            console.error(`Error downloading slide ${i + 1}:`, err);
          }
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousels-batch-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t("history", "batchDownloadSuccess", language));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Batch download error:", error);
      toast.error(t("history", "batchDownloadError", language));
    } finally {
      setDownloadingBatch(false);
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

  // Helper to get month/year key from date
  const getMonthKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper to format month label
  const getMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString(language, { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
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

  // Group carousels by month
  const groupedCarousels = useMemo(() => {
    const groups: Record<string, Carousel[]> = {};

    for (const carousel of filteredCarousels) {
      const monthKey = getMonthKey(carousel.created_at);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(carousel);
    }

    // Sort month keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return dateSort === "newest" ? b.localeCompare(a) : a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      monthKey: key,
      label: getMonthLabel(key),
      carousels: groups[key],
      count: groups[key].length
    }));
  }, [filteredCarousels, dateSort, language]);

  // Pagination (now works on total filtered, groups are displayed without pagination)
  const totalPages = Math.ceil(filteredCarousels.length / ITEMS_PER_PAGE);
  const paginatedCarousels = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCarousels.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCarousels, currentPage]);

  // Group paginated carousels by month for display
  const paginatedGroups = useMemo(() => {
    const groups: Record<string, Carousel[]> = {};

    for (const carousel of paginatedCarousels) {
      const monthKey = getMonthKey(carousel.created_at);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(carousel);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return dateSort === "newest" ? b.localeCompare(a) : a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      monthKey: key,
      label: getMonthLabel(key),
      carousels: groups[key],
      count: groups[key].length
    }));
  }, [paginatedCarousels, dateSort, language]);

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
  
  const completedCount = filteredCarousels.filter(c => c.status === "COMPLETED" && c.image_urls?.length).length;

  if (loading || loadingCarousels) {
    return <HistorySkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Modal */}
      <Dialog open={!!previewCarousel} onOpenChange={(open) => !open && setPreviewCarousel(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewCarousel && previewCarousel.image_urls && (
            <div className="relative">
              <img
                src={previewCarousel.image_urls[previewSlideIndex]}
                alt={`Slide ${previewSlideIndex + 1}`}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              
              {/* Slide navigation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-white hover:bg-white/20"
                  onClick={() => setPreviewSlideIndex(i => Math.max(0, i - 1))}
                  disabled={previewSlideIndex === 0}
                  aria-label={t("carouselPreview", "previousSlide", language)}
                >
                  ←
                </Button>
                <span className="text-white text-sm px-2">
                  {previewSlideIndex + 1} / {previewCarousel.image_urls.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-white hover:bg-white/20"
                  onClick={() => setPreviewSlideIndex(i => Math.min(previewCarousel.image_urls!.length - 1, i + 1))}
                  disabled={previewSlideIndex === previewCarousel.image_urls.length - 1}
                  aria-label={t("carouselPreview", "nextSlide", language)}
                >
                  →
                </Button>
              </div>
              
              {/* Slide thumbnails */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1 max-w-[80%] overflow-x-auto pb-2">
                {previewCarousel.image_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewSlideIndex(i)}
                    aria-label={t("carouselPreview", "goToSlide", language).replace("{number}", String(i + 1))}
                    className={`w-12 h-12 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                      i === previewSlideIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumb ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="%23ccc" width="48" height="48"/></svg>';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                aria-label={t("common", "back", language)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Mic2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
              </a>
            </div>
            
            <div className="flex items-center gap-2">
              {isSelectionMode && selectedIds.size > 0 && (
                <Button 
                  variant="accent" 
                  size="sm"
                  onClick={handleBatchDownload}
                  disabled={downloadingBatch}
                >
                  {downloadingBatch ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  {t("history", "downloadSelected", language)} ({selectedIds.size})
                </Button>
              )}
              
              {isPro && (
                <Badge variant="outline" className="border-accent/30 text-accent">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t("history", "title", language)}</h1>
            <p className="text-muted-foreground">{t("history", "subtitle", language)}</p>
          </div>
          
          {completedCount > 0 && (
            <Button 
              variant={isSelectionMode ? "secondary" : "outline"} 
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
            >
              {isSelectionMode ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  {t("history", "cancelSelection", language)}
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {t("history", "selectMultiple", language)}
                </>
              )}
            </Button>
          )}
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
            
            {/* Results count and select all */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {formatInteger(filteredCarousels.length, language)} {filteredCarousels.length !== 1 
                  ? t("dashboard", "carouselsCount", language) 
                  : t("dashboard", "carouselCount", language)}
                {hasActiveFilters && ` (${t("history", "filtered", language)})`}
              </span>
              
              {isSelectionMode && completedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === completedCount ? (
                    <>
                      <Square className="w-4 h-4 mr-1" />
                      {t("history", "deselectAll", language)}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      {t("history", "selectAll", language)} ({completedCount})
                    </>
                  )}
                </Button>
              )}
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
            {/* Grouped by month */}
            <div className="space-y-8">
              {paginatedGroups.map((group) => (
                <div key={group.monthKey}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold text-sm">{group.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.count} {group.count === 1 ? t("dashboard", "carouselCount", language) : t("dashboard", "carouselsCount", language)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Carousels grid for this month */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.carousels.map((carousel) => {
                      const isSelected = selectedIds.has(carousel.id);
                      const canSelect = carousel.status === "COMPLETED" && carousel.image_urls?.length;

                      return (
                        <Card
                          key={carousel.id}
                          className={`group hover:shadow-lg transition-all cursor-pointer overflow-hidden ${
                            isSelected ? "border-accent ring-2 ring-accent/20" : "hover:border-accent/50"
                          }`}
                          onClick={() => {
                            if (isSelectionMode && canSelect) {
                              toggleSelection(carousel.id, { stopPropagation: () => {} } as React.MouseEvent);
                            } else {
                              navigate(`/carousel/${carousel.id}`);
                            }
                          }}
                        >
                    {/* Thumbnail preview with hover card */}
                    <HoverCard openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {carousel.image_urls && carousel.image_urls[0] ? (
                            <>
                              <img
                                src={carousel.image_urls[0]}
                                alt="Carousel preview"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              
                              {/* Selection checkbox */}
                              {isSelectionMode && canSelect && (
                                <div 
                                  className="absolute top-2 left-2 z-10"
                                  onClick={(e) => toggleSelection(carousel.id, e)}
                                >
                                  <Checkbox 
                                    checked={isSelected}
                                    className="w-6 h-6 bg-white/90 border-2"
                                  />
                                </div>
                              )}
                              
                              {/* Action buttons */}
                              {!isSelectionMode && (
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="w-8 h-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewCarousel(carousel);
                                      setPreviewSlideIndex(0);
                                    }}
                                    aria-label={t("history", "preview", language)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </HoverCardTrigger>
                      
                      {/* Hover preview - larger image */}
                      {carousel.image_urls && carousel.image_urls[0] && !isSelectionMode && (
                        <HoverCardContent side="right" className="w-80 p-0 overflow-hidden">
                          <img 
                            src={carousel.image_urls[0]} 
                            alt="Preview" 
                            className="w-full h-auto"
                          />
                          <div className="p-3 text-xs text-muted-foreground">
                            {carousel.image_urls.length} slides • {getToneLabel(carousel.tone)}
                          </div>
                        </HoverCardContent>
                      )}
                    </HoverCard>
                    
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

                      {carousel.has_watermark && carousel.status === "COMPLETED" && isPro && !isSelectionMode && (
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
                      );
                    })}
                  </div>
                </div>
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
