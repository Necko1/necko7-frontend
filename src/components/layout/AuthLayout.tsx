import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/apiClient";
import type { AxiosError } from "axios";

/**
 * AuthLayout — wrapper for /login only.
 *
 * Probes GET /api/v1/users/me to determine the app state:
 *   - pending  → full-screen loader
 *   - 200 OK   → already logged in → redirect to /dashboard
 *   - 404      → bot not initialized → redirect to /init-bot
 *   - 401      → expected unauthenticated state → render login form
 *   - other    → render login form
 *
 * NOTE: /init-bot is NOT inside this layout — it's a standalone route in
 * App.tsx — so there's no render loop when we Navigate to it from here.
 */
export default function AuthLayout() {
  const { t } = useTranslation();
  const { isLoading, data, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
    staleTime: 0, // always recheck on auth pages
  });

  // ── Pending: show a subtle loader so we don't flash the wrong page ────────
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <svg
          className="animate-spin w-7 h-7 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      </div>
    );
  }

  // ── Already logged in → skip login page ───────────────────────────────────
  if (data) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Auth error handling ────────────────────────────────────────────────────
  if (error) {
    const status = (error as AxiosError)?.response?.status;

    // 404 = bot not initialized — always redirect; /init-bot is outside
    // this layout so there's no loop risk.
    if (status === 404) return <Navigate to="/init-bot" replace />;

    // 401 = expected unauthenticated state → fall through to render Outlet
  }

  return <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
    <section className="hidden lg:flex flex-col justify-between p-14 xl:p-20 border-r border-border bg-sidebar"><div className="text-xl font-bold tracking-tight">necko<span className="text-primary">7</span><span className="ml-4 text-xs uppercase tracking-widest font-medium text-muted-foreground">Reward control</span></div><div className="max-w-lg"><p className="eyebrow text-primary mb-5">{t("ops.loginEyebrow")}</p><h1 className="text-5xl font-semibold leading-[1.1] tracking-tight">{t("ops.loginIntro")}</h1><p className="text-muted-foreground leading-relaxed mt-6 text-lg">{t("ops.loginBody")}</p><div className="mt-10 space-y-4">{["loginFlow1", "loginFlow2", "loginFlow3"].map((key, i) => <div key={key} className="flex items-center gap-4 border-t border-border pt-4"><span className="text-primary font-mono text-xs">0{i + 1}</span><span className="text-sm">{t(`ops.${key}`)}</span></div>)}</div></div><p className="text-xs text-muted-foreground">Twitch / market.csgo.com</p></section>
    <div className="flex items-center justify-center p-4 sm:p-8"><div className="w-full max-w-md"><Outlet /></div></div>
  </div>;
}
