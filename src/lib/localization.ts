import { SupportedLanguage } from "@/hooks/useLanguage";
import { ptBR, enUS, es } from "date-fns/locale";
import { format as formatDate, Locale } from "date-fns";

// Currency configuration per language/region
interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  position: "before" | "after";
  decimalSeparator: string;
  thousandsSeparator: string;
}

const CURRENCY_CONFIG: Record<SupportedLanguage, CurrencyConfig> = {
  "pt-BR": {
    code: "BRL",
    symbol: "R$",
    locale: "pt-BR",
    position: "before",
    decimalSeparator: ",",
    thousandsSeparator: ".",
  },
  en: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    position: "before",
    decimalSeparator: ".",
    thousandsSeparator: ",",
  },
  es: {
    code: "EUR",
    symbol: "€",
    locale: "es-ES",
    position: "after",
    decimalSeparator: ",",
    thousandsSeparator: ".",
  },
};

// Base prices in cents (BRL as base)
const BASE_PRICES_BRL: Record<string, number> = {
  free: 0,
  starter: 2990,
  creator: 9990,
  agency: 19990,
};

// Exchange rates (approximate, BRL to other currencies)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.17, // 1 BRL ≈ 0.17 USD
  EUR: 0.16, // 1 BRL ≈ 0.16 EUR
};

/**
 * Format a price in cents to a localized currency string
 */
export function formatCurrency(
  amountInCents: number,
  language: SupportedLanguage
): string {
  const config = CURRENCY_CONFIG[language];
  const rate = EXCHANGE_RATES[config.code];
  
  // Convert from BRL cents to target currency
  const convertedAmount = (amountInCents * rate) / 100;
  
  // Format the number
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedAmount);

  // Apply symbol position
  if (config.position === "before") {
    return `${config.symbol} ${formattedNumber}`;
  } else {
    return `${formattedNumber} ${config.symbol}`;
  }
}

/**
 * Get the formatted price for a plan tier
 */
export function getPlanPrice(
  planTier: string,
  language: SupportedLanguage
): string {
  const priceInCents = BASE_PRICES_BRL[planTier] ?? 0;
  return formatCurrency(priceInCents, language);
}

/**
 * Get the date-fns locale for a language
 */
export function getDateFnsLocale(language: SupportedLanguage): Locale {
  switch (language) {
    case "pt-BR":
      return ptBR;
    case "en":
      return enUS;
    case "es":
      return es;
    default:
      return ptBR;
  }
}

// Date format patterns per language
const DATE_FORMATS: Record<SupportedLanguage, {
  short: string;
  medium: string;
  long: string;
  withTime: string;
}> = {
  "pt-BR": {
    short: "dd/MM/yyyy",
    medium: "d 'de' MMM, yyyy",
    long: "d 'de' MMMM 'de' yyyy",
    withTime: "d 'de' MMM, yyyy 'às' HH:mm",
  },
  en: {
    short: "MM/dd/yyyy",
    medium: "MMM d, yyyy",
    long: "MMMM d, yyyy",
    withTime: "MMM d, yyyy 'at' h:mm a",
  },
  es: {
    short: "dd/MM/yyyy",
    medium: "d 'de' MMM, yyyy",
    long: "d 'de' MMMM 'de' yyyy",
    withTime: "d 'de' MMM, yyyy 'a las' HH:mm",
  },
};

export type DateFormatType = "short" | "medium" | "long" | "withTime";

/**
 * Format a date according to the user's language preference
 */
export function formatLocalizedDate(
  date: Date | string,
  language: SupportedLanguage,
  formatType: DateFormatType = "medium"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const pattern = DATE_FORMATS[language][formatType];
  const locale = getDateFnsLocale(language);
  
  return formatDate(dateObj, pattern, { locale });
}

/**
 * Format a subscription end date with relative context
 */
export function formatSubscriptionDate(
  date: Date | string,
  language: SupportedLanguage
): string {
  return formatLocalizedDate(date, language, "medium");
}

/**
 * Get currency symbol for language
 */
export function getCurrencySymbol(language: SupportedLanguage): string {
  return CURRENCY_CONFIG[language].symbol;
}

/**
 * Get currency code for language
 */
export function getCurrencyCode(language: SupportedLanguage): string {
  return CURRENCY_CONFIG[language].code;
}
