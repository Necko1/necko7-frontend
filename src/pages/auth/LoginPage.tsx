import { authApi } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

const IconTwitch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBroadcast = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
  </svg>
);

interface AuthButtonProps {
  href: string;
  variant: "primary" | "secondary";
  icon: React.ReactNode;
  title: string;
  description: string;
}

function AuthButton({ href, variant, icon, title, description }: AuthButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 group",
        "hover:-translate-y-0.5 active:translate-y-0",
        variant === "primary"
          ? "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      )}
    >
      <span className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
        variant === "primary"
          ? "bg-primary/20 text-primary group-hover:bg-primary/30"
          : "bg-white/10 text-muted-foreground group-hover:text-foreground"
      )}>
        {icon}
      </span>
      <div className="text-left flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-sm",
          variant === "primary" ? "text-primary" : "text-foreground"
        )}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  );
}

export default function LoginPage() {
  return (
    <div className="glass rounded-2xl p-8 glow-teal space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <IconTwitch />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to necko7
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CS:GO skin rewards bot for Twitch streamers
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs text-muted-foreground bg-[#201c18]">
            Choose login type
          </span>
        </div>
      </div>

      {/* Login options */}
      <div className="space-y-3">
        <AuthButton
          href={authApi.connectUrl()}
          variant="primary"
          icon={<IconBroadcast />}
          title="Connect as Streamer"
          description="Authorize bot & get full control over your channel"
        />
        <AuthButton
          href={authApi.loginUrl()}
          variant="secondary"
          icon={<IconUser />}
          title="Login as User / Moderator"
          description="Access channels you've been invited to"
        />
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/60">
        Session is tied to a Twitch OAuth token and expires after 7 days.
      </p>
    </div>
  );
}
