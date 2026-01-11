import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  display_name: string;
  activity_type: string;
  created_at: string;
}

interface SocialProofSettings {
  enabled: boolean;
  interval_seconds: number;
  position: "left" | "right";
}

const SocialProofToast = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<SocialProofSettings>({ enabled: true, interval_seconds: 8, position: "left" });
  const [dismissed, setDismissed] = useState(false);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["social_proof_enabled", "social_proof_interval_seconds", "social_proof_position"]);

      if (data) {
        const enabled = data.find((d) => d.key === "social_proof_enabled")?.value;
        const interval = data.find((d) => d.key === "social_proof_interval_seconds")?.value;
        const position = data.find((d) => d.key === "social_proof_position")?.value;

        setSettings({
          enabled: enabled !== "false",
          interval_seconds: parseInt(interval || "8", 10),
          position: (position === "right" ? "right" : "left") as "left" | "right",
        });
      }
    };

    fetchSettings();
  }, []);

  // Generate demo activities for fallback when no real data exists
  const generateDemoActivities = (): Activity[] => {
    const names = [
      "João S.", "Maria L.", "Pedro C.", "Ana R.", "Carlos M.",
      "Fernanda B.", "Lucas P.", "Juliana A.", "Roberto F.", "Patricia N.",
      "John D.", "Sarah M.", "Mike R.", "Emma L.", "David K."
    ];
    const now = Date.now();

    return names.slice(0, 10).map((name, index) => ({
      id: `demo-${index}`,
      display_name: name,
      activity_type: "carousel_created",
      // Spread activities over the last hour with random intervals
      created_at: new Date(now - Math.random() * 3600000).toISOString(),
    }));
  };

  // Fetch recent activities
  useEffect(() => {
    if (!settings.enabled) return;

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("id, display_name, activity_type, created_at")
        .eq("is_public", true)
        .eq("activity_type", "carousel_created")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        setActivities(data);
      } else {
        // Use demo data as fallback when no real activities exist
        setActivities(generateDemoActivities());
      }
    };

    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("activity_feed_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_feed",
          filter: "is_public=eq.true",
        },
        (payload) => {
          const newActivity = payload.new as Activity;
          setActivities((prev) => [newActivity, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings.enabled]);

  // Show activities in rotation
  useEffect(() => {
    if (!settings.enabled || activities.length === 0 || dismissed) return;

    let currentIndex = 0;

    // Initial delay before first toast
    const initialDelay = setTimeout(() => {
      setCurrentActivity(activities[0]);
      setIsVisible(true);
    }, 5000);

    // Rotation interval
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        currentIndex = (currentIndex + 1) % activities.length;
        setCurrentActivity(activities[currentIndex]);
        setIsVisible(true);
      }, 500);
    }, settings.interval_seconds * 1000);

    // Auto-hide after 4 seconds
    const hideInterval = setInterval(() => {
      setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }, settings.interval_seconds * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      clearInterval(hideInterval);
    };
  }, [activities, settings, dismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
      return language === "pt-BR" ? "agora mesmo" : language === "es" ? "ahora mismo" : "just now";
    }
    if (diffMins < 60) {
      return language === "pt-BR"
        ? `há ${diffMins} min`
        : language === "es"
        ? `hace ${diffMins} min`
        : `${diffMins} min ago`;
    }
    if (diffHours < 24) {
      return language === "pt-BR"
        ? `há ${diffHours}h`
        : language === "es"
        ? `hace ${diffHours}h`
        : `${diffHours}h ago`;
    }
    return language === "pt-BR" ? "recentemente" : language === "es" ? "recientemente" : "recently";
  };

  const getMessage = () => {
    if (!currentActivity) return "";

    const name = currentActivity.display_name || "Alguém";

    switch (currentActivity.activity_type) {
      case "carousel_created":
        return language === "pt-BR"
          ? `${name} acabou de criar um carrossel`
          : language === "es"
          ? `${name} acaba de crear un carrusel`
          : `${name} just created a carousel`;
      case "signup":
        return language === "pt-BR"
          ? `${name} acabou de se cadastrar`
          : language === "es"
          ? `${name} acaba de registrarse`
          : `${name} just signed up`;
      default:
        return language === "pt-BR"
          ? `${name} está usando o Audisell`
          : language === "es"
          ? `${name} está usando Audisell`
          : `${name} is using Audisell`;
    }
  };

  if (!settings.enabled || dismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && currentActivity && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-4 z-40 max-w-sm ${settings.position === "right" ? "right-4" : "left-4"}`}
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{getMessage()}</p>
              <p className="text-xs text-muted-foreground">{getTimeAgo(currentActivity.created_at)}</p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofToast;
