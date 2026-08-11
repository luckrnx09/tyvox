import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

export const SUPPORTED_LOCALES = ["en", "zh"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

/** Detect locale from persisted config or fall back to system language. */
export const detectLocale = (configured?: string): AppLocale => {
  if (configured === "en" || configured === "zh") {
    return configured;
  }
  const sys = (typeof navigator === "undefined" ? "en" : navigator.language).toLowerCase();
  return sys.startsWith("zh") ? "zh" : DEFAULT_LOCALE;
};

void i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  lng: DEFAULT_LOCALE,
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
});

export default i18n;
