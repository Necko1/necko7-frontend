import i18n from "@/i18n";
import "monaco-editor/nls/lang/ru.js";

const nls = globalThis as typeof globalThis & {
  _VSCODE_NLS_MESSAGES?: string[];
  _VSCODE_NLS_LANGUAGE?: string;
};
const russianMessages = nls._VSCODE_NLS_MESSAGES;
function setLocale(language: string) {
  nls._VSCODE_NLS_MESSAGES = language.startsWith("ru") ? russianMessages : undefined;
  nls._VSCODE_NLS_LANGUAGE = language.startsWith("ru") ? "ru" : "en";
}
setLocale(i18n.language);
i18n.on("languageChanged", setLocale);
