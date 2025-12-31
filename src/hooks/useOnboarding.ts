import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingState {
  showOnboarding: boolean;
  loading: boolean;
  completeOnboarding: () => void;
}

export const useOnboarding = (): OnboardingState => {
  const { user, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        setShowOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setShowOnboarding(false);
        } else {
          setShowOnboarding(!profile?.onboarding_completed);
        }
      } catch (error) {
        console.error('Error:', error);
        setShowOnboarding(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    loading,
    completeOnboarding,
  };
};
