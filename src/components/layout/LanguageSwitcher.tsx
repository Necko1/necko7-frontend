import { useTranslation } from "react-i18next";
import { changeAppLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

const IconGlobe = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 text-muted-foreground"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default function LanguageSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || "en").startsWith("ru") ? "ru" : "en";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 p-1 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/60 text-xs select-none",
          className
        )}
        title={t("common.language", "Language")}
      >
        <div className="pl-1.5 text-muted-foreground flex items-center">
          <IconGlobe />
        </div>
        <div className="flex items-center gap-0.5 bg-background/50 p-0.5 rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => changeAppLanguage("ru")}
            className={cn(
              "px-1.5 py-0.5 rounded-md text-sm leading-none transition-all cursor-pointer",
              currentLang === "ru"
                ? "bg-primary/20 border border-primary/40 shadow-xs opacity-100"
                : "opacity-40 hover:opacity-90 grayscale hover:grayscale-0"
            )}
            title="Русский"
            aria-label="Русский язык"
          >
            🇷🇺
          </button>
          <button
            type="button"
            onClick={() => changeAppLanguage("en")}
            className={cn(
              "px-1.5 py-0.5 rounded-md text-sm leading-none transition-all cursor-pointer",
              currentLang === "en"
                ? "bg-primary/20 border border-primary/40 shadow-xs opacity-100"
                : "opacity-40 hover:opacity-90 grayscale hover:grayscale-0"
            )}
            title="English"
            aria-label="English language"
          >
            🇬🇧
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/60 text-xs select-none",
        className
      )}
      title={t("common.language", "Language")}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconGlobe />
        <span className="text-[11px] font-medium tracking-wide">
          {t("common.language", "Language")}
        </span>
      </div>

      <div className="flex items-center gap-0.5 bg-background/50 p-0.5 rounded-lg border border-border/40">
        <button
          type="button"
          onClick={() => changeAppLanguage("ru")}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
            currentLang === "ru"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Русский язык"
        >
          RU
        </button>
        <button
          type="button"
          onClick={() => changeAppLanguage("en")}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
            currentLang === "en"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="English language"
        >
          EN
        </button>
      </div>
    </div>
  );
}
