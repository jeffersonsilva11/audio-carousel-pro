import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { PlanTier, PLANS } from "@/lib/plans";

export type LimitPeriod = "daily" | "weekly" | "monthly";

interface SubscriptionState {
  subscribed: boolean;
  plan: PlanTier;
  dailyLimit: number;
  limitPeriod: LimitPeriod;
  periodUsed: number;
  dailyUsed: number; // Kept for backward compatibility
  hasWatermark: boolean;
  hasEditor: boolean;
  hasHistory: boolean;
  hasZipDownload: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  failedPaymentCount: number;
  status: string;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: "free",
    dailyLimit: 1,
    limitPeriod: "daily",
    periodUsed: 0,
    dailyUsed: 0,
    hasWatermark: true,
    hasEditor: false,
    hasHistory: false,
    hasZipDownload: false,
    subscriptionEnd: null,
    loading: true,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    failedPaymentCount: 0,
    status: "active",
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setState({
        subscribed: false,
        plan: "free",
        dailyLimit: 1,
        limitPeriod: "daily",
        periodUsed: 0,
        dailyUsed: 0,
        hasWatermark: true,
        hasEditor: false,
        hasHistory: false,
        hasZipDownload: false,
        subscriptionEnd: null,
        loading: false,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        failedPaymentCount: 0,
        status: "active",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      // Handle 401 errors silently (invalid/expired token) - fallback to free plan
      if (error) {
        const errorMessage = error.message?.toLowerCase() || "";
        const is401 = errorMessage.includes("401") || errorMessage.includes("jwt") || errorMessage.includes("unauthorized");
        
        if (is401) {
          console.log("Auth token issue, using free plan defaults");
        } else {
          console.error("Error checking subscription:", error);
        }
        
        // Fallback to free plan on any error
        setState({
          subscribed: false,
          plan: "free",
          dailyLimit: 1,
          limitPeriod: "daily",
          periodUsed: 0,
          dailyUsed: 0,
          hasWatermark: true,
          hasEditor: false,
          hasHistory: false,
          hasZipDownload: false,
          subscriptionEnd: null,
          loading: false,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          failedPaymentCount: 0,
          status: "active",
        });
        return;
      }

      // Handle error in data response
      if (data?.error) {
        console.error("Subscription check returned error:", data.error);
        setState({
          subscribed: false,
          plan: "free",
          dailyLimit: 1,
          limitPeriod: "daily",
          periodUsed: 0,
          dailyUsed: 0,
          hasWatermark: true,
          hasEditor: false,
          hasHistory: false,
          hasZipDownload: false,
          subscriptionEnd: null,
          loading: false,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          failedPaymentCount: 0,
          status: "active",
        });
        return;
      }

      const plan = (data.plan || "free") as PlanTier;
      const planConfig = PLANS[plan];

      setState({
        subscribed: data.subscribed,
        plan,
        dailyLimit: data.daily_limit || planConfig.dailyLimit,
        limitPeriod: (data.limit_period || "daily") as LimitPeriod,
        periodUsed: data.period_used || data.daily_used || 0,
        dailyUsed: data.daily_used || 0,
        hasWatermark: data.has_watermark ?? planConfig.hasWatermark,
        hasEditor: data.has_editor ?? planConfig.hasEditor,
        hasHistory: data.has_history ?? planConfig.hasHistory,
        hasZipDownload: planConfig.hasZipDownload,
        subscriptionEnd: data.subscription_end,
        loading: false,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        cancelledAt: data.cancelled_at || null,
        failedPaymentCount: data.failed_payment_count || 0,
        status: data.status || "active",
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      // Fallback to free plan on any error
      setState({
        subscribed: false,
        plan: "free",
        dailyLimit: 1,
        limitPeriod: "daily",
        periodUsed: 0,
        dailyUsed: 0,
        hasWatermark: true,
        hasEditor: false,
        hasHistory: false,
        hasZipDownload: false,
        subscriptionEnd: null,
        loading: false,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        failedPaymentCount: 0,
        status: "active",
      });
    }
  }, [user, session]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (planTier: PlanTier = "starter", currency: string = "brl", couponCode?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planTier, currency, couponCode }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  };

  const validateCoupon = async (code: string, planTier: PlanTier, priceInCents: number = 0) => {
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: code,
        p_user_id: user?.id || "",
        p_plan_tier: planTier,
        p_price_cents: priceInCents
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      return { is_valid: false, error_message: "Coupon not found" };
    } catch (error) {
      console.error("Error validating coupon:", error);
      return { is_valid: false, error_message: "Error validating coupon" };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      throw error;
    }
  };

  const canCreateCarousel = () => {
    if (state.plan === "free") {
      // Free users: 1 carousel total
      return state.periodUsed < 1;
    }
    // Paid users: check against period limit
    return state.periodUsed < state.dailyLimit;
  };

  const getRemainingCarousels = () => {
    return Math.max(0, state.dailyLimit - state.periodUsed);
  };

  const getPeriodLabel = (language: string = "pt-BR") => {
    const labels: Record<string, Record<LimitPeriod, string>> = {
      "pt-BR": { daily: "hoje", weekly: "esta semana", monthly: "este mês" },
      en: { daily: "today", weekly: "this week", monthly: "this month" },
      es: { daily: "hoy", weekly: "esta semana", monthly: "este mes" },
    };
    return labels[language]?.[state.limitPeriod] || labels["pt-BR"][state.limitPeriod];
  };

  const getDaysRemaining = () => {
    if (!state.subscriptionEnd) return 0;
    const endDate = new Date(state.subscriptionEnd);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isCancelled = () => {
    return state.cancelAtPeriodEnd;
  };

  const isLastDay = () => {
    return getDaysRemaining() === 0 && state.cancelAtPeriodEnd;
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    validateCoupon,
    openCustomerPortal,
    canCreateCarousel,
    getRemainingCarousels,
    getPeriodLabel,
    getDaysRemaining,
    isCancelled,
    isLastDay,
    isPro: state.plan !== "free",
    isCreator: state.plan === "creator",
  };
}
