import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = "G-8RGJS3QZN8";

// Initialize GA script
export const initGA = () => {
  if (typeof window === "undefined") return;
  
  // Check if already initialized
  if (window.gtag) return;

  // Create script element
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll handle page views manually
  });
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (!window.gtag) return;
  
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
};

// Custom event types
export type AnalyticsEvent = 
  | "sign_up"
  | "login"
  | "logout"
  | "carousel_created"
  | "carousel_downloaded"
  | "checkout_started"
  | "checkout_completed"
  | "subscription_upgraded"
  | "subscription_cancelled"
  | "audio_uploaded"
  | "audio_recorded"
  | "slide_edited"
  | "slide_regenerated"
  | "export_data"
  | "onboarding_completed"
  | "onboarding_step"
  | "plan_viewed"
  | "upgrade_modal_opened"
  | "upgrade_modal_closed"
  | "feature_used";

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

// Track custom events
export const trackEvent = (event: AnalyticsEvent, params?: EventParams) => {
  if (!window.gtag) return;
  
  window.gtag("event", event, {
    ...params,
    timestamp: new Date().toISOString(),
  });
};

// Track conversions
export const trackConversion = (
  transactionId: string,
  value: number,
  currency = "BRL",
  items?: { name: string; price: number }[]
) => {
  if (!window.gtag) return;

  window.gtag("event", "purchase", {
    transaction_id: transactionId,
    value,
    currency,
    items: items?.map((item) => ({
      item_name: item.name,
      price: item.price,
    })),
  });
};

// Track checkout begin
export const trackBeginCheckout = (
  value: number,
  currency = "BRL",
  planName?: string
) => {
  if (!window.gtag) return;

  window.gtag("event", "begin_checkout", {
    value,
    currency,
    items: planName ? [{ item_name: planName }] : undefined,
  });
};

// Set user properties
export const setUserProperties = (properties: {
  userId?: string;
  planTier?: string;
  isSubscribed?: boolean;
}) => {
  if (!window.gtag) return;

  if (properties.userId) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: properties.userId,
    });
  }

  window.gtag("set", "user_properties", {
    plan_tier: properties.planTier,
    is_subscribed: properties.isSubscribed,
  });
};

// Hook for automatic page tracking
export const useAnalytics = () => {
  const location = useLocation();

  // Initialize GA on mount
  useEffect(() => {
    initGA();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  // Return tracking functions
  return {
    trackEvent: useCallback(trackEvent, []),
    trackConversion: useCallback(trackConversion, []),
    trackBeginCheckout: useCallback(trackBeginCheckout, []),
    setUserProperties: useCallback(setUserProperties, []),
  };
};

export default useAnalytics;
