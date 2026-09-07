import { useEffect, useMemo } from "react";
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import LanguageSwitcher from "./LanguageSwitcher";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usersApi, broadcastersApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import type { AxiosError } from "axios";

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  isActive?: (pathname: string) => boolean;
}

// Simple SVG icons inline to avoid import issues
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconGift = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" />
    <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconLogOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSwap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const IconTerminal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: <IconGrid /> },
  { label: "Rewards", to: "/rewards", icon: <IconGift /> },
  { label: "Redemptions", to: "/redemptions", icon: <IconList /> },
  { label: "Logs", to: "/logs", icon: <IconTerminal /> },
  { label: "Leaderboard", to: "/leaderboard", icon: <IconTrophy /> },
  { label: "Chat", to: "/chat", icon: <IconChat /> },
];

export default function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {
    setCurrentUser,
    broadcasters,
    setBroadcasters,
    selectedBroadcasterId,
    setSelectedBroadcasterId,
    getSelectedBroadcaster,
  } = useAppStore();

  // ── HOOK 1: Auth query ──────────────────────────────────────────────────
  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
    staleTime: 5 * 60_000,
  });

  // ── HOOK 2: Broadcasters query (enabled only when authenticated) ──────────
  const { data: broadcastersData, isLoading: bcastLoading } = useQuery({
    queryKey: ["broadcasters"],
    queryFn: () => broadcastersApi.list().then((r) => r.data),
    enabled: !!meData,
    staleTime: 60_000,
  });

  // ── HOOK 3: Logout mutation ──────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      setCurrentUser(null);
      setBroadcasters([]);
      setSelectedBroadcasterId(null);
      qc.clear();
      navigate("/login");
    },
  });

  // ── HOOK 4: Sync user into store ─────────────────────────────────────────
  useEffect(() => {
    if (meData) {
      setCurrentUser(meData);
    } else if (meError) {
      setCurrentUser(null);
    }
  }, [meData, meError, setCurrentUser]);

  // ── HOOK 5: Sync broadcasters into store ─────────────────────────────────
  useEffect(() => {
    if (broadcastersData) {
      setBroadcasters(broadcastersData);
      if (!selectedBroadcasterId && broadcastersData.length > 0) {
        setSelectedBroadcasterId(broadcastersData[0].channel_id);
      }
    }
  }, [broadcastersData, selectedBroadcasterId, setBroadcasters, setSelectedBroadcasterId]);

  const location = useLocation();

  // Sync selected broadcaster if navigating directly to a /c/:identifier URL
  useEffect(() => {
    if (location.pathname.startsWith("/c/")) {
      const ident = location.pathname.split("/")[2]?.toLowerCase();
      if (ident && broadcasters.length > 0) {
        const match = broadcasters.find(
          (b) =>
            b.channel_id === ident ||
            b.channel_login.toLowerCase() === ident
        );
        if (match && match.channel_id !== selectedBroadcasterId) {
          setSelectedBroadcasterId(match.channel_id);
        }
      }
    }
  }, [location.pathname, broadcasters, selectedBroadcasterId, setSelectedBroadcasterId]);

  const selectedBroadcaster = meData ? getSelectedBroadcaster() : null;
  const roleUpper = selectedBroadcaster?.role?.toUpperCase();
  const isViewer = roleUpper === "VIEWER";

  // Route protection for VIEWER role: redirect away from admin pages
  useEffect(() => {
    if (isViewer && selectedBroadcaster) {
      const adminPrefixes = ["/dashboard", "/rewards", "/redemptions", "/logs", "/leaderboard", "/chat", "/broadcasters"];
      if (adminPrefixes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) {
        navigate(`/c/${selectedBroadcaster.channel_login}`, { replace: true });
      }
    }
  }, [isViewer, selectedBroadcaster, location.pathname, navigate]);

  const navItems: NavItem[] = useMemo(() => {
    // 1. Guest viewing public channel route: show Rewards only, no Profile!
    if (!meData && location.pathname.startsWith("/c/")) {
      const channelLogin = location.pathname.split("/")[2] || "";
      return [
        {
          label: t("nav.rewards"),
          to: `/c/${channelLogin}`,
          icon: <IconGift />,
          isActive: (pathname: string) => {
            const lower = pathname.toLowerCase();
            const target = `/c/${channelLogin.toLowerCase()}`;
            return lower === target || lower.startsWith(`${target}/rewards`);
          },
        },
      ];
    }

    if (isViewer && selectedBroadcaster) {
      return [
        {
          label: t("nav.rewards"),
          to: `/c/${selectedBroadcaster.channel_login}`,
          icon: <IconGift />,
          isActive: (pathname: string) => {
            const lower = pathname.toLowerCase();
            const target = `/c/${selectedBroadcaster.channel_login.toLowerCase()}`;
            return lower === target || lower.startsWith(`${target}/rewards`);
          },
        },
        {
          label: t("nav.profile"),
          to: `/c/${selectedBroadcaster.channel_login}/profile`,
          icon: <IconUser />,
          end: true,
        },
      ];
    }
    return [
      { label: t("nav.dashboard"), to: "/dashboard", icon: <IconGrid />, end: true },
      { label: t("nav.rewards"), to: "/rewards", icon: <IconGift /> },
      { label: t("nav.redemptions"), to: "/redemptions", icon: <IconList /> },
      { label: t("nav.logs"), to: "/logs", icon: <IconTerminal /> },
      { label: t("nav.leaderboard"), to: "/leaderboard", icon: <IconTrophy /> },
      { label: t("nav.chat"), to: "/chat", icon: <IconChat /> },
    ];
  }, [meData, location.pathname, isViewer, selectedBroadcaster, t]);


  // While checking auth — show full-screen loader
  if (meLoading || (!meData && !meError)) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <svg
            className="animate-spin w-8 h-8 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm">{t("nav.verifyingSession")}</p>
        </div>
      </div>
    );
  }

  // Auth error handling
  if (meError) {
    const status = (meError as AxiosError)?.response?.status;
    if (status === 404) return <Navigate to="/init-bot" replace />;
    if (!location.pathname.startsWith("/c/")) {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 overflow-hidden">

        {/* Broadcaster section */}
        {meData ? (
        <div className="p-4 space-y-2">
          {bcastLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-7 w-3/4 rounded-lg" />
            </div>
          ) : selectedBroadcaster ? (
            <>
              {/* Broadcaster profile + settings gear */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sidebar-accent group">
                <Avatar className="h-9 w-9 ring-2 ring-primary/30 shrink-0">
                  <AvatarImage
                    src={selectedBroadcaster.profile_image_url ?? undefined}
                    alt={selectedBroadcaster.display_name || selectedBroadcaster.channel_login}
                  />
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                    {(selectedBroadcaster.channel_login || "??").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate" title={selectedBroadcaster.display_name || selectedBroadcaster.channel_login}>
                    {selectedBroadcaster.display_name || selectedBroadcaster.channel_login}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {isViewer ? t("channels.viewer") : selectedBroadcaster.role}
                  </p>
                </div>
                {!isViewer && (
                  <Tooltip>
                    <TooltipTrigger
                      className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-sidebar-foreground hover:bg-accent"
                      onClick={() =>
                        navigate(`/broadcasters/${selectedBroadcaster.channel_id}/settings`)
                      }
                    >
                      <IconSettings />
                    </TooltipTrigger>
                    <TooltipContent>{t("nav.channelSettings")}</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Switch channel button — always shown */}
              <button
                type="button"
                onClick={() => navigate("/channels")}
                className="w-full flex items-center justify-between text-xs h-7.5 px-2.5 rounded-lg border border-sidebar-border text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <IconSwap />
                  {t("nav.switchChannel")}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono font-medium">
                  {broadcasters.length}
                </span>
              </button>
            </>
          ) : (
            /* No broadcaster selected */
            <button
              type="button"
              onClick={() => navigate("/channels")}
              className="w-full p-2.5 rounded-xl border border-dashed border-sidebar-border text-center hover:border-primary/50 hover:bg-sidebar-accent/50 transition-colors group"
            >
              <p className="text-xs font-medium text-primary flex items-center justify-center gap-1.5">
                <IconPlus />
                {t("nav.selectChannel")}
              </p>
            </button>
          )}
        </div>
        ) : null}

        {meData && <Separator className="bg-sidebar-border" />}

        {/* Navigation */}
        <nav className={cn("flex-1 p-3 space-y-0.5 overflow-y-auto", !meData && "pt-4")}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => {
                const active = item.isActive ? item.isActive(location.pathname) : isActive;
                return cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-primary font-semibold shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                );
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* Language switcher directly above user profile */}
        <div className="px-3 pt-2">
          <LanguageSwitcher />
        </div>

        {/* User profile or Guest login at bottom */}
        <div className="p-3">
          {!meData ? (
            <Button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2.5 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              <IconTwitch />
              <span>{t("profile.signInWithTwitch", "Log in with Twitch")}</span>
            </Button>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/me")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/me")}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group text-left select-none",
                location.pathname === "/me"
                  ? "bg-sidebar-accent border border-primary/30 shadow-xs"
                  : "hover:bg-sidebar-accent/60"
              )}
              title={t("nav.myProfile")}
            >
              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border group-hover:ring-primary/40 transition-all">
                <AvatarImage src={meData.avatar_url ?? undefined} alt={meData.login} />
                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                  {(meData.login || "??").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                  {meData.login}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none">
                  • {t("nav.myProfile")}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    logoutMutation.mutate();
                  }}
                  aria-disabled={logoutMutation.isPending}
                >
                  <IconLogOut />
                </TooltipTrigger>
                <TooltipContent>{t("nav.logout")}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 min-h-screen overflow-y-scroll [scrollbar-gutter:stable] bg-background">
        <Outlet />
      </main>
    </div>
  );
}
