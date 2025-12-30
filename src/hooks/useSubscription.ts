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
  hasImageGeneration: boolean;
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
    hasImageGeneration: false,
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
        hasImageGeneration: false,
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
      
      if (error) {
        console.error("Error checking subscription:", error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const plan = (data.plan || "free") as PlanTier;
      const planConfig = PLANS[plan];

      setState({
        subscribed: data.subscribed,
        plan,
        dailyLimit: planConfig.dailyLimit,
        dailyUsed: data.daily_used || 0,
        hasWatermark: planConfig.hasWatermark,
        hasImageGeneration: planConfig.hasImageGeneration,
        hasEditor: planConfig.hasEditor,
        hasHistory: planConfig.hasHistory,
        hasZipDownload: planConfig.hasZipDownload,
        subscriptionEnd: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
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
