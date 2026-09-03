import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi, usersApi } from "@/lib/apiClient";
import type { AxiosError } from "axios";

const IconAlertTriangle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconBot = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

const Step = ({ num, text }: { num: number; text: React.ReactNode }) => (
  <div className="flex gap-3 items-start">
    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
      {num}
    </span>
    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
  </div>
);

export default function InitBotPage() {
  // Check if the bot is already initialized
  const { data, error, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <svg
          className="animate-spin w-7 h-7 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  // Already logged in
  if (data) {
    return <Navigate to="/dashboard" replace />;
  }

  // If status is NOT 404 (e.g. 401 Unauthorized), the bot is ALREADY initialized!
  // App init guard on the backend only returns 404 when the bot is not yet initialized.
  const status = (error as AxiosError)?.response?.status;
  if (status && status !== 404) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-animated relative overflow-hidden px-4">
      {/* Ambient glow orbs */}
      <div
        className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #40372e 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #2a526a 0%, transparent 70%)" }}
      />

      <div className="relative z-10 glass rounded-2xl p-8 glow-teal space-y-6 max-w-lg w-full">
      {/* Warning header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
          <IconAlertTriangle />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bot not initialized</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The necko7 bot account hasn't been authorized yet. Nothing will work until it's set up.
        </p>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border border-border bg-background/40 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary">📋</span> Before you begin
        </h2>
        <div className="space-y-3">
          <Step
            num={1}
            text={
              <>
                Go to{" "}
                <a
                  href="https://dev.twitch.tv/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  dev.twitch.tv/console
                </a>{" "}
                and create a new application.
              </>
            }
          />
          <Step
            num={2}
            text={
              <>
                In the OAuth Redirect URLs field, add:{" "}
                <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">
                  https://your-backend.domain/api/v1/auth/callback
                </code>
              </>
            }
          />
          <Step
            num={3}
            text={
              <>
                Copy your <strong className="text-foreground">Client ID</strong> and{" "}
                <strong className="text-foreground">Client Secret</strong>, then fill them into the{" "}
                <code className="px-1 py-0.5 rounded bg-white/10 text-xs font-mono">.env</code> file on the backend server.
              </>
            }
          />
          <Step
            num={4}
            text="Restart the backend server to apply the new environment variables."
          />
          <Step
            num={5}
            text="Click the button below while logged into the Twitch bot account to authorize it."
          />
        </div>
      </div>

      {/* Authorize button */}
      <a
        href={authApi.initBotUrl()}
        className="flex items-center justify-center gap-3 w-full py-3.5 px-5 rounded-xl font-semibold text-sm transition-all duration-200
          bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
      >
        <IconBot />
        Authorize Bot Account on Twitch
      </a>

      <p className="text-center text-xs text-muted-foreground/60">
        This endpoint is only accessible once — before the bot is initialized.
      </p>
      </div>
    </div>
  );
}
