import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  };

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
