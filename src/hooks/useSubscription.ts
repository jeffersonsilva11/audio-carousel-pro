import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { PlanTier, PLANS } from "@/lib/plans";

interface SubscriptionState {
  subscribed: boolean;
  plan: PlanTier;
  dailyLimit: number;
  dailyUsed: number;
  hasWatermark: boolean;
  hasEditor: boolean;
  hasHistory: boolean;
  hasZipDownload: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: "free",
    dailyLimit: 1,
    dailyUsed: 0,
    hasWatermark: true,
    hasEditor: false,
    hasHistory: false,
    hasZipDownload: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setState({
        subscribed: false,
        plan: "free",
        dailyLimit: 1,
        dailyUsed: 0,
        hasWatermark: true,
        hasEditor: false,
        hasHistory: false,
        hasZipDownload: false,
        subscriptionEnd: null,
        loading: false,
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
          dailyUsed: 0,
          hasWatermark: true,
          hasEditor: false,
          hasHistory: false,
          hasZipDownload: false,
          subscriptionEnd: null,
          loading: false,
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
          dailyUsed: 0,
          hasWatermark: true,
          hasEditor: false,
          hasHistory: false,
          hasZipDownload: false,
          subscriptionEnd: null,
          loading: false,
        });
        return;
      }

      const plan = (data.plan || "free") as PlanTier;
      const planConfig = PLANS[plan];

      setState({
        subscribed: data.subscribed,
        plan,
        dailyLimit: data.daily_limit || planConfig.dailyLimit,
        dailyUsed: data.daily_used || 0,
        hasWatermark: data.has_watermark ?? planConfig.hasWatermark,
        hasEditor: data.has_editor ?? planConfig.hasEditor,
        hasHistory: data.has_history ?? planConfig.hasHistory,
        hasZipDownload: planConfig.hasZipDownload,
        subscriptionEnd: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      // Fallback to free plan on any error
      setState({
        subscribed: false,
        plan: "free",
        dailyLimit: 1,
        dailyUsed: 0,
        hasWatermark: true,
        hasEditor: false,
        hasHistory: false,
        hasZipDownload: false,
        subscriptionEnd: null,
        loading: false,
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

  const createCheckout = async (planTier: PlanTier = "starter") => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planTier }
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
      return state.dailyUsed < 1;
    }
    // Paid users: daily limit
    return state.dailyUsed < state.dailyLimit;
  };

  const getRemainingCarousels = () => {
    return Math.max(0, state.dailyLimit - state.dailyUsed);
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    canCreateCarousel,
    getRemainingCarousels,
    isPro: state.plan !== "free",
    isCreator: state.plan === "creator" || state.plan === "agency",
    isAgency: state.plan === "agency",
  };
}
