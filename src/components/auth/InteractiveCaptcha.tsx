import { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

// reCAPTCHA v2 site key - this is a publishable key
const RECAPTCHA_V2_SITE_KEY = '6LckrjssAAAAALZUi5LorvDMcL6AqGHsi2wGr10r';

interface RecaptchaV2 {
  render: (container: HTMLElement | string, options: {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact';
  }) => number;
  reset: (widgetId?: number) => void;
}

// Access grecaptcha with v2 methods
const getGrecaptchaV2 = (): RecaptchaV2 | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).grecaptcha;
  if (g?.render && g?.reset) {
    return g as RecaptchaV2;
  }
  return null;
};

interface InteractiveCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function InteractiveCaptcha({ onVerify, onExpire, onError }: InteractiveCaptchaProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const renderCaptcha = useCallback(() => {
    const grecaptcha = getGrecaptchaV2();
    if (!containerRef.current || !grecaptcha || widgetIdRef.current !== null) return;

    try {
      widgetIdRef.current = grecaptcha.render(containerRef.current, {
        sitekey: RECAPTCHA_V2_SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onError,
        theme: 'light',
        size: 'normal',
      });
    } catch (error) {
      console.error('Failed to render reCAPTCHA:', error);
    }
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    // Check if already loaded
    const grecaptcha = getGrecaptchaV2();
    if (grecaptcha) {
      setIsLoaded(true);
      renderCaptcha();
      return;
    }

    // Set up callback for when script loads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onRecaptchaLoad = () => {
      setIsLoaded(true);
      renderCaptcha();
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="recaptcha/api.js?onload"]');
    if (existingScript) {
      return;
    }

    // Load reCAPTCHA v2 script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit&hl=${language === 'pt-BR' ? 'pt-BR' : language}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onRecaptchaLoad = undefined;
    };
  }, [language, renderCaptcha]);

  useEffect(() => {
    if (isLoaded) {
      renderCaptcha();
    }
  }, [isLoaded, renderCaptcha]);

  return (
    <div className="flex justify-center my-4">
      <div ref={containerRef} />
    </div>
  );
}

export function resetCaptcha(widgetId?: number) {
  const grecaptcha = getGrecaptchaV2();
  if (grecaptcha) {
    grecaptcha.reset(widgetId);
  }
}
