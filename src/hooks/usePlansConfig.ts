import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SupportedLanguage } from "./useLanguage";

export interface PlanConfigData {
  id: string;
  tier: string;
  name_pt: string;
  name_en: string | null;
  name_es: string | null;
  description_pt: string | null;
  description_en: string | null;
  description_es: string | null;
  price_brl: number;
  price_usd: number | null;
  price_eur: number | null;
  stripe_price_id_brl: string | null;
  stripe_price_id_usd: string | null;
  stripe_price_id_eur: string | null;
  checkout_link_brl: string | null;
  checkout_link_usd: string | null;
  checkout_link_eur: string | null;
  daily_limit: number;
  monthly_limit: number | null;
  has_watermark: boolean;
  has_editor: boolean;
  has_history: boolean;
  has_zip_download: boolean;
  has_custom_fonts: boolean;
  has_gradients: boolean;
  has_slide_images: boolean;
  // New template features
  has_cover_templates: boolean;
  has_content_templates: boolean;
  has_custom_colors: boolean;
  has_image_upload: boolean;
  max_templates_saved: number;
  features_pt: string[] | null;
  features_en: string[] | null;
  features_es: string[] | null;
  limitations_pt: string[] | null;
  limitations_en: string[] | null;
  limitations_es: string[] | null;
  is_active: boolean;
  display_order: number;
}

interface UsePlansConfigReturn {
  plans: PlanConfigData[];
  loading: boolean;
  error: string | null;
  getPlanByTier: (tier: string) => PlanConfigData | undefined;
  getPlanPrice: (tier: string, language: SupportedLanguage) => string;
  getPlanPriceInCents: (tier: string, language: SupportedLanguage) => number;
  getPlanName: (tier: string, language: SupportedLanguage) => string;
  getPlanDescription: (tier: string, language: SupportedLanguage) => string;
  getPlanFeatures: (tier: string, language: SupportedLanguage) => string[];
  getPlanLimitations: (tier: string, language: SupportedLanguage) => string[];
  getStripePriceId: (tier: string, language: SupportedLanguage) => string | null;
  getCheckoutLink: (tier: string, language: SupportedLanguage) => string | null;
  refetch: () => Promise<void>;
}

// Currency configuration
const CURRENCY_CONFIG: Record<SupportedLanguage, { symbol: string; position: "before" | "after"; locale: string }> = {
  "pt-BR": { symbol: "R$", position: "before", locale: "pt-BR" },
  en: { symbol: "$", position: "before", locale: "en-US" },
  es: { symbol: "€", position: "after", locale: "es-ES" },
};

// Fallback prices (used when database is not available)
const FALLBACK_PRICES: Record<string, { brl: number; usd: number; eur: number }> = {
  free: { brl: 0, usd: 0, eur: 0 },
  starter: { brl: 2990, usd: 699, eur: 599 },
  creator: { brl: 9990, usd: 1999, eur: 1799 },
  agency: { brl: 19990, usd: 3999, eur: 3599 },
};

export function usePlansConfig(): UsePlansConfigReturn {
  const [plans, setPlans] = useState<PlanConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("plans_config")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (fetchError) {
        throw fetchError;
      }

      setPlans((data as PlanConfigData[]) || []);
    } catch (err) {
      console.error("Error fetching plans config:", err);
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getPlanByTier = useCallback(
    (tier: string): PlanConfigData | undefined => {
      return plans.find((p) => p.tier === tier);
    },
    [plans]
  );

  const getPlanPriceInCents = useCallback(
    (tier: string, language: SupportedLanguage): number => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.price_brl;
          case "en":
            return plan.price_usd || Math.round(plan.price_brl * 0.17);
          case "es":
            return plan.price_eur || Math.round(plan.price_brl * 0.16);
        }
      }

      // Fallback to hardcoded prices
      const fallback = FALLBACK_PRICES[tier];
      if (fallback) {
        switch (language) {
          case "pt-BR":
            return fallback.brl;
          case "en":
            return fallback.usd;
          case "es":
            return fallback.eur;
        }
      }

      return 0;
    },
    [getPlanByTier]
  );

  const getPlanPrice = useCallback(
    (tier: string, language: SupportedLanguage): string => {
      const priceInCents = getPlanPriceInCents(tier, language);
      const config = CURRENCY_CONFIG[language];
      const amount = priceInCents / 100;

      const formattedNumber = new Intl.NumberFormat(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

      if (config.position === "before") {
        return `${config.symbol} ${formattedNumber}`;
      } else {
        return `${formattedNumber} ${config.symbol}`;
      }
    },
    [getPlanPriceInCents]
  );

  const getPlanName = useCallback(
    (tier: string, language: SupportedLanguage): string => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.name_pt;
          case "en":
            return plan.name_en || plan.name_pt;
          case "es":
            return plan.name_es || plan.name_pt;
        }
      }

      // Fallback
      return tier.charAt(0).toUpperCase() + tier.slice(1);
    },
    [getPlanByTier]
  );

  const getPlanDescription = useCallback(
    (tier: string, language: SupportedLanguage): string => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.description_pt || "";
          case "en":
            return plan.description_en || plan.description_pt || "";
          case "es":
            return plan.description_es || plan.description_pt || "";
        }
      }

      return "";
    },
    [getPlanByTier]
  );

  const getPlanFeatures = useCallback(
    (tier: string, language: SupportedLanguage): string[] => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.features_pt || [];
          case "en":
            return plan.features_en || plan.features_pt || [];
          case "es":
            return plan.features_es || plan.features_pt || [];
        }
      }

      return [];
    },
    [getPlanByTier]
  );

  const getPlanLimitations = useCallback(
    (tier: string, language: SupportedLanguage): string[] => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.limitations_pt || [];
          case "en":
            return plan.limitations_en || plan.limitations_pt || [];
          case "es":
            return plan.limitations_es || plan.limitations_pt || [];
        }
      }

      return [];
    },
    [getPlanByTier]
  );

  const getStripePriceId = useCallback(
    (tier: string, language: SupportedLanguage): string | null => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.stripe_price_id_brl;
          case "en":
            return plan.stripe_price_id_usd;
          case "es":
            return plan.stripe_price_id_eur;
        }
      }

      return null;
    },
    [getPlanByTier]
  );

  const getCheckoutLink = useCallback(
    (tier: string, language: SupportedLanguage): string | null => {
      const plan = getPlanByTier(tier);

      if (plan) {
        switch (language) {
          case "pt-BR":
            return plan.checkout_link_brl;
          case "en":
            return plan.checkout_link_usd;
          case "es":
            return plan.checkout_link_eur;
        }
      }

      return null;
    },
    [getPlanByTier]
  );

  return {
    plans,
    loading,
    error,
    getPlanByTier,
    getPlanPrice,
    getPlanPriceInCents,
    getPlanName,
    getPlanDescription,
    getPlanFeatures,
    getPlanLimitations,
    getStripePriceId,
    getCheckoutLink,
    refetch: fetchPlans,
  };
}
