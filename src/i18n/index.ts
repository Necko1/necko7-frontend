import { operationsEn, operationsRu } from "./operations";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ru } from "./locales/ru";
import { en } from "./locales/en";

const savedLang = (typeof window !== "undefined" && localStorage.getItem("necko_lang")) || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: { ...ru, ops: operationsRu } },
      en: { translation: { ...en, ops: operationsEn } },
    },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  if (typeof window !== "undefined") {
    localStorage.setItem("necko_lang", lng);
  }
});

export const changeAppLanguage = (lang: "ru" | "en") => {
  if (typeof window !== "undefined") {
    localStorage.setItem("necko_lang", lang);
  }
  return i18n.changeLanguage(lang);
};

export default i18n;

document.documentElement.lang = i18n.language;
