import { useLanguagePair } from "../language-context";
import { de } from "./dictionaries/de";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { fr } from "./dictionaries/fr";
import { id } from "./dictionaries/id";
import { ja } from "./dictionaries/ja";
import { zh } from "./dictionaries/zh";
import type { TranslationDictionary, TranslationKey } from "./types";

export * from "./types";

export const DICTIONARIES: Record<string, TranslationDictionary> = {
  de,
  en,
  es,
  fr,
  id,
  ja,
  zh,
};

function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) {
    return template;
  }
  return template.replaceAll(/\{(?<paramKey>\w+)\}/gu, (match, key) =>
    key in params ? String(params[key]) : match
  );
}

export function translate(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale = "en"
): string {
  const normalized = locale.toLowerCase().trim();
  const dict = DICTIONARIES[normalized] || DICTIONARIES.en;
  let text = getNestedValue(dict as unknown as Record<string, unknown>, key);

  // Fallback to English if key missing in dictionary
  if (!text && dict !== DICTIONARIES.en) {
    text = getNestedValue(
      DICTIONARIES.en as unknown as Record<string, unknown>,
      key
    );
  }

  if (!text) {
    return key;
  }

  return interpolate(text, params);
}

export function translateCategory(slug: string, locale = "en"): string {
  const normalized = locale.toLowerCase().trim();
  const dict = DICTIONARIES[normalized] || DICTIONARIES.en;
  if (dict.categories && slug in dict.categories) {
    return dict.categories[slug];
  }
  if (DICTIONARIES.en.categories && slug in DICTIONARIES.en.categories) {
    return DICTIONARIES.en.categories[slug];
  }
  // Default format slug to Title Case
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function useTranslation(explicitLangCode?: string) {
  const { originLanguage } = useLanguagePair();
  const locale = explicitLangCode || originLanguage.code || "en";

  const t = (
    key: TranslationKey,
    params?: Record<string, string | number>
  ): string => translate(key, params, locale);

  const tCategory = (slug: string): string => translateCategory(slug, locale);

  return {
    currentLocale: locale,
    t,
    tCategory,
  };
}
