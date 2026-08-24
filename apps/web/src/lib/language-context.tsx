import React, { createContext, useContext, useState } from "react";

import type { Language } from "../types/api";
import { useLanguages } from "./queries";

export interface LanguageContextType {
  availableLanguages: Language[];
  getLanguageByCode: (code: string) => Language;
  getLanguageFlag: (code: string) => string;
  isSelectorOpen: boolean;
  originLanguage: Language;
  setIsSelectorOpen: (open: boolean) => void;
  setLanguagePair: (
    origin: Language | string,
    target: Language | string
  ) => void;
  setOriginLanguage: (lang: Language | string) => void;
  setTargetLanguage: (lang: Language | string) => void;
  swapLanguages: () => void;
  targetLanguage: Language;
}

export const FALLBACK_LANGUAGES: Language[] = [
  { code: "de", id: 1, name: "German", native_name: "Deutsch" },
  { code: "id", id: 2, name: "Indonesian", native_name: "Bahasa Indonesia" },
  { code: "en", id: 3, name: "English", native_name: "English" },
  { code: "es", id: 4, name: "Spanish", native_name: "Español" },
  { code: "fr", id: 5, name: "French", native_name: "Français" },
  { code: "it", id: 6, name: "Italian", native_name: "Italiano" },
  { code: "ja", id: 7, name: "Japanese", native_name: "日本語" },
  { code: "zh", id: 8, name: "Chinese", native_name: "中文" },
  { code: "ko", id: 9, name: "Korean", native_name: "한국어" },
  { code: "pt", id: 10, name: "Portuguese", native_name: "Português" },
  { code: "nl", id: 11, name: "Dutch", native_name: "Nederlands" },
  { code: "ru", id: 12, name: "Russian", native_name: "Русский" },
  { code: "ar", id: 13, name: "Arabic", native_name: "العربية" },
];

export const LANGUAGE_FLAGS: Record<string, string> = {
  ar: "🇸🇦",
  de: "🇩🇪",
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  id: "🇮🇩",
  it: "🇮🇹",
  ja: "🇯🇵",
  ko: "🇰🇷",
  nl: "🇳🇱",
  pt: "🇵🇹",
  ru: "🇷🇺",
  zh: "🇨🇳",
};

export function getLanguageFlag(code: string): string {
  const normalized = code.toLowerCase().trim();
  return LANGUAGE_FLAGS[normalized] || "🌐";
}

const STORAGE_KEY_ORIGIN = "linguamaxima_origin_lang";
const STORAGE_KEY_TARGET = "linguamaxima_target_lang";

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguagePairProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: serverLanguages } = useLanguages();
  const languagesList =
    serverLanguages && serverLanguages.length > 0
      ? serverLanguages
      : FALLBACK_LANGUAGES;

  const findLanguage = React.useCallback(
    (codeOrName: string, fallback: Language): Language => {
      const targetCode = codeOrName.toLowerCase().trim();
      return (
        languagesList.find(
          (l) =>
            l.code.toLowerCase() === targetCode ||
            l.name.toLowerCase() === targetCode
        ) || fallback
      );
    },
    [languagesList]
  );

  const [originLanguage, setOriginLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_ORIGIN);
      if (stored) {
        return (
          FALLBACK_LANGUAGES.find((l) => l.code === stored) ||
          FALLBACK_LANGUAGES[1]
        );
      }
    }
    return FALLBACK_LANGUAGES[1];
  });

  const [targetLanguage, setTargetLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_TARGET);
      if (stored) {
        return (
          FALLBACK_LANGUAGES.find((l) => l.code === stored) ||
          FALLBACK_LANGUAGES[0]
        );
      }
    }
    return FALLBACK_LANGUAGES[0];
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const handleSetOriginLanguage = React.useCallback(
    (lang: Language | string) => {
      const resolved =
        typeof lang === "string"
          ? findLanguage(lang, FALLBACK_LANGUAGES[1])
          : lang;
      setOriginLanguage(resolved);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_ORIGIN, resolved.code);
      }
    },
    [findLanguage]
  );

  const handleSetTargetLanguage = React.useCallback(
    (lang: Language | string) => {
      const resolved =
        typeof lang === "string"
          ? findLanguage(lang, FALLBACK_LANGUAGES[0])
          : lang;
      setTargetLanguage(resolved);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_TARGET, resolved.code);
      }
    },
    [findLanguage]
  );

  const handleSetLanguagePair = React.useCallback(
    (origin: Language | string, target: Language | string) => {
      handleSetOriginLanguage(origin);
      handleSetTargetLanguage(target);
    },
    [handleSetOriginLanguage, handleSetTargetLanguage]
  );

  const handleSwapLanguages = React.useCallback(() => {
    setOriginLanguage((prevOrigin) => {
      setTargetLanguage((prevTarget) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_ORIGIN, prevTarget.code);
          localStorage.setItem(STORAGE_KEY_TARGET, prevOrigin.code);
        }
        return prevOrigin;
      });
      return targetLanguage;
    });
  }, [targetLanguage]);

  const getLanguageByCode = React.useCallback(
    (code: string): Language =>
      findLanguage(code, {
        code,
        id: 0,
        name: code.toUpperCase(),
        native_name: code.toUpperCase(),
      }),
    [findLanguage]
  );

  const contextValue = React.useMemo(
    () => ({
      availableLanguages: languagesList,
      getLanguageByCode,
      getLanguageFlag,
      isSelectorOpen,
      originLanguage,
      setIsSelectorOpen,
      setLanguagePair: handleSetLanguagePair,
      setOriginLanguage: handleSetOriginLanguage,
      setTargetLanguage: handleSetTargetLanguage,
      swapLanguages: handleSwapLanguages,
      targetLanguage,
    }),
    [
      languagesList,
      getLanguageByCode,
      isSelectorOpen,
      originLanguage,
      handleSetLanguagePair,
      handleSetOriginLanguage,
      handleSetTargetLanguage,
      handleSwapLanguages,
      targetLanguage,
    ]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguagePair() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error(
      "useLanguagePair must be used within a LanguagePairProvider"
    );
  }
  return context;
}
