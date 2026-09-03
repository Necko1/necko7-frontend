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

  // ── Render auth page (login or init-bot) ──────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-animated relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #2a526a 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #78c2cc 0%, transparent 70%)" }}
      />

      {/* Page content */}
      <div className="relative z-10 w-full max-w-md px-4">
        <Outlet />
      </div>
    </div>
  );
}
