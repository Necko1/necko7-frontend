import { useEffect } from "react";
import { Navigate, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usersApi, broadcastersApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import type { AxiosError } from "axios";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
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

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: <IconGrid /> },
  { label: "Rewards", to: "/rewards", icon: <IconGift /> },
  { label: "Redemptions", to: "/redemptions", icon: <IconList /> },
];

export default function AppLayout() {
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

  // ── Auth guard: GET /api/v1/users/me ─────────────────────────────────────
  // This query blocks the layout from rendering until authentication is confirmed.
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

  // Sync user into store safely inside useEffect (never in render body!)
  useEffect(() => {
    if (meData) {
      setCurrentUser(meData);
    }
  }, [meData, setCurrentUser]);

  // ── While checking auth — show full-screen loader ─────────────────────────
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
          <p className="text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  // ── Auth error handling ───────────────────────────────────────────────────
  if (meError) {
    const status = (meError as AxiosError)?.response?.status;
    if (status === 404) return <Navigate to="/init-bot" replace />;
    return <Navigate to="/login" replace />;
  }

  // ── Fetch broadcasters after auth confirmed ───────────────────────────────
  const { data: broadcastersData, isLoading: bcastLoading } = useQuery({
    queryKey: ["broadcasters"],
    queryFn: () => broadcastersApi.list().then((r) => r.data),
    enabled: !!meData,
    staleTime: 60_000,
  });

  // Sync broadcasters safely in useEffect
  useEffect(() => {
    if (broadcastersData) {
      setBroadcasters(broadcastersData);
      if (!selectedBroadcasterId && broadcastersData.length > 0) {
        setSelectedBroadcasterId(broadcastersData[0].channel_id);
      }
    }
  }, [broadcastersData, selectedBroadcasterId, setBroadcasters, setSelectedBroadcasterId]);

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

  const selectedBroadcaster = getSelectedBroadcaster();

  return (
    <div className="flex w-full min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 overflow-hidden">
        {/* Brand header */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm glow-teal">
            7
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-sidebar-foreground">
              necko7
            </span>
            <span className="text-xs text-muted-foreground block -mt-0.5">
              Twitch Bot Panel
            </span>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Broadcaster section */}
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
                    src={`https://static-cdn.jtvnw.net/jtv_user_pictures/${selectedBroadcaster.channel_login}-profile_image-70x70.png`}
                    alt={selectedBroadcaster.channel_login}
                  />
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                    {(selectedBroadcaster.channel_login || "??").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {selectedBroadcaster.channel_login}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedBroadcaster.role}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger
                    className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-sidebar-foreground hover:bg-accent"
                    onClick={() =>
                      navigate(`/broadcasters/${selectedBroadcaster.channel_id}/settings`)
                    }
                  >
                    <IconSettings />
                  </TooltipTrigger>
                  <TooltipContent>Channel settings</TooltipContent>
                </Tooltip>
              </div>

              {/* Switch broadcaster button */}
              {broadcasters.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="w-full flex items-center justify-start gap-2 text-xs h-7 px-2 rounded-md border border-sidebar-border text-muted-foreground hover:text-sidebar-foreground hover:bg-accent transition-colors"
                  >
                    <IconSwap />
                    Switch channel
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {broadcasters.map((b) => (
                      <DropdownMenuItem
                        key={b.channel_id}
                        onClick={() => setSelectedBroadcasterId(b.channel_id)}
                        className={cn(
                          b.channel_id === selectedBroadcasterId && "bg-accent text-accent-foreground"
                        )}
                      >
                        <span className="truncate">{b.channel_login}</span>
                        <span className="ml-auto text-xs text-muted-foreground capitalize">
                          {b.role}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </>
          ) : broadcasters.length === 0 ? (
            <div className="p-2.5 rounded-xl border border-dashed border-sidebar-border text-center">
              <p className="text-xs text-muted-foreground">No channel selected</p>
            </div>
          ) : null}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-primary font-semibold shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User profile at bottom */}
        <div className="p-4">
          <div className="flex items-center gap-3 group">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={meData?.avatar_url ?? undefined} alt={meData?.login} />
              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                {(meData?.login || "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {meData?.login}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger
                className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-accent"
                onClick={() => logoutMutation.mutate()}
                aria-disabled={logoutMutation.isPending}
              >
                <IconLogOut />
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 min-h-screen overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
