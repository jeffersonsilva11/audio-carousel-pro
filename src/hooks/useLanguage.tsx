import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t as translateFn, TranslationKey } from "@/lib/translations";

export type SupportedLanguage = "pt-BR" | "en" | "es";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "audisell_language";

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["pt-BR", "en", "es"];

function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "pt-BR";
  
  // Check exact match first
  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }
  
  // Check language prefix (e.g., "en-US" -> "en")
  const langPrefix = browserLang.split("-")[0];
  if (langPrefix === "pt") return "pt-BR";
  if (langPrefix === "en") return "en";
  if (langPrefix === "es") return "es";
  
  // Default to Portuguese
  return "pt-BR";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
    // Otherwise detect from browser
    return detectBrowserLanguage();
  });

  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user's preferred language from profile
  const fetchProfileLanguage = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_lang")
        .eq("user_id", uid)
        .single();

      if (!error && data?.preferred_lang) {
        const profileLang = data.preferred_lang as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(profileLang)) {
          setLanguageState(profileLang);
          localStorage.setItem(LANGUAGE_KEY, profileLang);
          document.documentElement.lang = profileLang;
        }
      }
    } catch (err) {
      console.error("Error fetching profile language:", err);
    }
  }, []);

  // Save language to profile
  const saveProfileLanguage = useCallback(async (uid: string, lang: SupportedLanguage) => {
    try {
      await supabase
        .from("profiles")
        .update({ preferred_lang: lang })
        .eq("user_id", uid);
    } catch (err) {
      console.error("Error saving profile language:", err);
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      
      // Fetch profile language when user logs in
      if (uid && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setTimeout(() => {
          fetchProfileLanguage(uid);
        }, 0);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchProfileLanguage(uid);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileLanguage]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.lang = lang;
    
    // Save to profile if user is logged in
    if (userId) {
      saveProfileLanguage(userId, lang);
    }
  }, [userId, saveProfileLanguage]);

  // Set initial HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Language display info
export const LANGUAGES = [
  { code: "pt-BR" as const, name: "Português", flag: "🇧🇷" },
  { code: "en" as const, name: "English", flag: "🇺🇸" },
  { code: "es" as const, name: "Español", flag: "🇪🇸" },
];

// Hook to get translated text
export function useTranslation() {
  const { language } = useLanguage();
  
  const translate = (section: TranslationKey, key: string): string => {
    return translateFn(section, key, language);
  };
  
  return { t: translate, language };
}
