import { useTranslation } from "react-i18next";

/** Bilingual copy for the workflow components, alongside existing i18next keys. */
export function useCopy() {
  const { i18n } = useTranslation();
  return (english: string, russian: string) =>
    i18n.language.startsWith("ru") ? russian : english;
}
