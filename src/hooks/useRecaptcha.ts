import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// reCAPTCHA v3 site key - this is a publishable key
const RECAPTCHA_SITE_KEY = '6LckrjssAAAAALZUi5LorvDMcL6AqGHsi2wGr10r';

// Check if running in development mode using Vite's environment variable
// This is safe because import.meta.env.DEV is replaced at build time
const isDevelopment = import.meta.env.DEV;

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already loaded
    if (window.grecaptcha) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        setIsLoaded(true);
        setIsLoading(false);
      });
    };

    script.onerror = () => {
      console.error('Failed to load reCAPTCHA');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(`script[src*="recaptcha"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded yet');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      return null;
    }
  }, [isLoaded]);

  const verifyRecaptcha = useCallback(async (action: string): Promise<{ success: boolean; score?: number; error?: string }> => {
    // Skip reCAPTCHA in development environment (import.meta.env.DEV is false in production builds)
    if (isDevelopment) {
      return { success: true, score: 1.0 };
    }

    const token = await executeRecaptcha(action);

    if (!token) {
      return { success: false, error: 'Failed to execute reCAPTCHA' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
        body: { token, action }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }, [executeRecaptcha]);

  return {
    isLoaded,
    isLoading,
    executeRecaptcha,
    verifyRecaptcha,
  };
}
