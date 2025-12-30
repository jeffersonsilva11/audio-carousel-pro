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

// Locale configuration for number and date formatting
const LOCALE_CONFIG: Record<SupportedLanguage, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
};

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
 * Get the user's timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Convert a date to the user's local timezone
 */
export function toLocalTimezone(date: Date | string): Date {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  // The Date object already represents the moment in time correctly,
  // formatting will automatically use the browser's local timezone
  return dateObj;
}

/**
 * Format a date according to the user's language preference and local timezone
 */
export function formatLocalizedDate(
  date: Date | string,
  language: SupportedLanguage,
  formatType: DateFormatType = "medium"
): string {
  const dateObj = toLocalTimezone(date);
  const pattern = DATE_FORMATS[language][formatType];
  const locale = getDateFnsLocale(language);
  
  return formatDate(dateObj, pattern, { locale });
}

/**
 * Format a date with timezone indicator
 */
export function formatDateWithTimezone(
  date: Date | string,
  language: SupportedLanguage,
  formatType: DateFormatType = "withTime"
): string {
  const dateObj = toLocalTimezone(date);
  const formattedDate = formatLocalizedDate(dateObj, language, formatType);
  const timezone = getUserTimezone();
  
  // Get short timezone name
  const timezoneName = new Intl.DateTimeFormat(LOCALE_CONFIG[language], {
    timeZoneName: "short",
  }).formatToParts(dateObj).find(part => part.type === "timeZoneName")?.value || "";
  
  return `${formattedDate} (${timezoneName})`;
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

// ============================================
// NUMBER FORMATTING UTILITIES
// ============================================

/**
 * Format a number according to the user's locale
 */
export function formatNumber(
  value: number,
  language: SupportedLanguage,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(LOCALE_CONFIG[language], options).format(value);
}

/**
 * Format an integer (no decimal places)
 */
export function formatInteger(
  value: number,
  language: SupportedLanguage
): string {
  return formatNumber(value, language, {
    maximumFractionDigits: 0,
  });
}

/**
 * Format a decimal number with specified precision
 */
export function formatDecimal(
  value: number,
  language: SupportedLanguage,
  decimals: number = 2
): string {
  return formatNumber(value, language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  language: SupportedLanguage,
  decimals: number = 0
): string {
  return formatNumber(value / 100, language, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a compact number (e.g., 1K, 1M)
 */
export function formatCompactNumber(
  value: number,
  language: SupportedLanguage
): string {
  return formatNumber(value, language, {
    notation: "compact",
    compactDisplay: "short",
  });
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(
  bytes: number,
  language: SupportedLanguage
): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formattedSize = formatNumber(size, language, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  });

  return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(
  seconds: number,
  language: SupportedLanguage
): string {
  if (seconds < 60) {
    return `${formatInteger(Math.round(seconds), language)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${formatInteger(minutes, language)}m ${formatInteger(remainingSeconds, language)}s`
      : `${formatInteger(minutes, language)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0
    ? `${formatInteger(hours, language)}h ${formatInteger(remainingMinutes, language)}m`
    : `${formatInteger(hours, language)}h`;
}

/**
 * Format a count with singular/plural handling
 * Returns the formatted number (use with translation strings)
 */
export function formatCount(
  count: number,
  language: SupportedLanguage
): string {
  return formatInteger(count, language);
}
