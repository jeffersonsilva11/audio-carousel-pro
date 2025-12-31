import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { initGA, trackPageView, setUserProperties } from "@/hooks/useAnalytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { plan, isPro } = useSubscription();

  // Initialize GA on mount
  useEffect(() => {
    initGA();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  // Set user properties when user or subscription changes
  useEffect(() => {
    if (user) {
      setUserProperties({
        userId: user.id,
        planTier: plan,
        isSubscribed: isPro,
      });
    }
  }, [user, plan, isPro]);

  return <>{children}</>;
};

export default AnalyticsProvider;
