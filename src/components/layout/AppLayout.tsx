import Brand from "./Brand";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { QueryError } from "@/components/common/Page";
import PanelGuide from "@/components/layout/PanelGuide";
import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import LanguageSwitcher from "./LanguageSwitcher";

import { usersApi, broadcastersApi, authApi, redemptionsApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";

import type { AxiosError } from "axios";

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
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

export default function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setCurrentUser, broadcasters, setBroadcasters, selectedBroadcasterId, setSelectedBroadcasterId } = useAppStore();
  const { data: meData, isLoading: meLoading, error: meError, refetch: retrySession } = useQuery({ queryKey: ["me"], queryFn: () => usersApi.me().then(r => r.data), retry: false, staleTime: 300_000 });
  const { data: channels, isLoading: channelsLoading, isError: channelsError, refetch: retryChannels } = useQuery({ queryKey: ["broadcasters"], queryFn: () => broadcastersApi.list().then(r => r.data), enabled: !!meData, staleTime: 60_000 });
  const selected = meData ? broadcasters.find(b => b.channel_id === selectedBroadcasterId) : undefined;
  const role = selected?.role.toUpperCase();
  const operator = role === "OWNER" || role === "EDITOR";
  const publicRoute = location.pathname.startsWith("/c/") || location.pathname.startsWith("/r/");
  const adminRoute = ["/dashboard", "/rewards", "/redemptions", "/logs", "/leaderboard", "/chat", "/broadcasters"].some(p => location.pathname === p || location.pathname.startsWith(p + "/"));
  const { data: holds } = useQuery({ queryKey: ["redemptions", selectedBroadcasterId, "attention-count"], queryFn: () => redemptionsApi.list(selectedBroadcasterId!, { status: "MANUAL_HOLD", limit: 1 }).then(r => r.data), enabled: operator, refetchInterval: 15_000 });
  const logout = useMutation({ mutationFn: authApi.logout, onSuccess: () => { setCurrentUser(null); setBroadcasters([]); setSelectedBroadcasterId(null); qc.clear(); navigate("/login"); }, onError: () => toast.error(t("ops.loadError")) });
  useEffect(() => { setCurrentUser(meData ?? null); }, [meData, setCurrentUser]);
  useEffect(() => {
    if (!channels) return;
    setBroadcasters(channels);
    const pathId = location.pathname.startsWith("/broadcasters/") ? location.pathname.split("/")[2] : null;
    const publicId = location.pathname.startsWith("/c/") ? location.pathname.split("/")[2]?.toLowerCase() : null;
    const match = channels.find(b => b.channel_id === pathId || (publicId && (b.channel_id === publicId || b.channel_login.toLowerCase() === publicId)));
    if (match) setSelectedBroadcasterId(match.channel_id);
    else if (!channels.some(b => b.channel_id === selectedBroadcasterId)) setSelectedBroadcasterId(channels[0]?.channel_id ?? null);
  }, [channels, location.pathname, selectedBroadcasterId, setBroadcasters, setSelectedBroadcasterId]);

  if (meLoading) return <div className="page-shell"><Skeleton className="h-12 w-48" /><Skeleton className="h-64" /><p role="status" className="text-sm text-muted-foreground">{t("nav.verifyingSession")}</p></div>;
  if (meError) {
    const status = (meError as AxiosError).response?.status;
    if (status === 404) return <Navigate to="/init-bot" replace />;
    if (status !== 401) return <div className="page-shell"><QueryError onRetry={() => void retrySession()} /></div>;
    if (!publicRoute) return <Navigate to="/login" replace />;
  }
  if (meData && channelsLoading) return <div className="page-shell"><Skeleton className="h-12 w-48" /><Skeleton className="h-64" /></div>;
  if (meData && channelsError) return <div className="page-shell"><QueryError onRetry={() => void retryChannels()} /></div>;
  if (role === "VIEWER" && adminRoute && selected) return <Navigate to={`/c/${selected.channel_login}`} replace />;
  if (meData && !selected && channels?.length) return <div className="page-shell"><Skeleton className="h-64" /></div>;
  if (meData && !selected && adminRoute) return <Navigate to="/channels" replace />;

  const catalog = `/c/${selected?.channel_login || location.pathname.split("/")[2] || ""}`;
  const groups: { label: string; items: NavItem[] }[] = operator ? [
    { label: t("ops.operations"), items: [
      { label: t("ops.overview"), to: "/dashboard", icon: <IconGrid /> },
      { label: t("ops.holds"), to: "/redemptions?status=MANUAL_HOLD", icon: <span className="text-amber-300 text-base w-[18px] text-center">!</span>, isActive: p => p === "/redemptions" && new URLSearchParams(location.search).get("status") === "MANUAL_HOLD" },
      { label: t("ops.transactions"), to: "/redemptions", icon: <IconList />, isActive: p => p === "/redemptions" && new URLSearchParams(location.search).get("status") !== "MANUAL_HOLD" },
      { label: t("nav.logs"), to: "/logs", icon: <IconTerminal /> },
    ] },
    { label: t("ops.configuration"), items: [
      { label: t("nav.rewards"), to: "/rewards", icon: <IconGift /> },
      { label: t("ops.settings"), to: `/broadcasters/${selected!.channel_id}/settings`, icon: <IconSettings /> },
    ] },
    { label: t("ops.community"), items: [
      { label: t("nav.chat"), to: "/chat", icon: <IconChat /> },
      { label: t("nav.leaderboard"), to: "/leaderboard", icon: <IconTrophy /> },
      { label: t("ops.publicLink"), to: catalog, icon: <IconGift />, end: true },
    ] },
  ] : [{ label: t("ops.community"), items: publicRoute || selected ? [
    { label: t("nav.rewards"), to: catalog, icon: <IconGift />, end: true },
    ...(meData ? [{ label: t("nav.profile"), to: `${catalog}/profile`, icon: <IconUser /> }] : []),
  ] : [] }];
  const sidebar = (mobile = false) => <div className="flex h-full flex-col">
    <div className="flex h-24 shrink-0 items-center px-5"><Brand /></div>
    {meData && <div className="channel-selector"><div className="flex items-center gap-2.5 min-w-0"><Avatar className="size-8"><AvatarImage src={selected?.profile_image_url ?? undefined} /><AvatarFallback>{selected?.channel_login.slice(0, 2).toUpperCase() ?? "–"}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selected?.display_name || selected?.channel_login || t("nav.selectChannel")}</p><p className="text-xs text-muted-foreground">{role === "OWNER" ? t("settings.permissionsTab.ownerRole") : role === "EDITOR" ? t("settings.permissionsTab.editorRole") : t("channels.viewer")}</p></div></div><NavLink to="/channels" onClick={() => setMobileOpen(false)} className="mt-3 flex items-center justify-between text-xs text-muted-foreground hover:text-primary"><span>{t("nav.switchChannel")}</span><IconSwap /></NavLink></div>}
    <nav aria-label={t("ops.workspace")} className="min-h-0 flex-1 overflow-y-auto px-3 space-y-6 pb-5">{groups.map((group, groupIndex) => <div key={group.label}><p className="nav-group-label px-3 mb-2"><span>0{groupIndex + 1}</span>{group.label}</p><div className="space-y-1">{group.items.map(item => {
      const active = item.isActive ? item.isActive(location.pathname) : item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
      const id = item.to.includes("MANUAL_HOLD") ? "holds" : item.to.includes("settings") ? "settings" : item.to.slice(1);
      return <NavLink key={item.to} to={item.to} end={item.end} aria-current={active ? "page" : false} data-tour={!mobile ? id : undefined} className="workspace-link" onClick={() => setMobileOpen(false)}>{item.icon}<span className="flex-1">{item.label}</span>{id === "holds" && holds && holds.total > 0 && <span className="rounded bg-amber-400/15 text-amber-300 px-1.5 text-xs tabular-nums">{holds.total}</span>}</NavLink>;
    })}</div></div>)}</nav>
    <div className="border-t border-border p-3 space-y-2">{operator && meData && selected && <PanelGuide userId={meData.twitch_id} channelId={selected.channel_id} role={role!} mobile={mobile} onStart={() => setMobileOpen(false)} />}
    <LanguageSwitcher />
    <div className="flex items-center gap-2 border-t border-border pt-3">{meData ? <><NavLink to="/me" onClick={() => setMobileOpen(false)} className="flex min-w-0 flex-1 items-center gap-2 p-1.5 rounded-md hover:bg-muted"><Avatar className="size-7"><AvatarImage src={meData.avatar_url ?? undefined} /><AvatarFallback>{meData.login.slice(0, 2)}</AvatarFallback></Avatar><span className="text-sm truncate">{meData.login}</span></NavLink><Button aria-label={t("nav.logout")} variant="ghost" size="icon" disabled={logout.isPending} onClick={() => logout.mutate()}><IconLogOut /></Button></> : <Button className="w-full" onClick={() => navigate("/login")}><IconTwitch />{t("profile.signInWithTwitch")}</Button>}</div></div>
  </div>;
  return <div className="flex min-h-screen w-full">
    <a href="#main-content" className="skip-link">{t("ops.skipContent")}</a>
    <aside className="hidden md:block sticky top-0 h-dvh w-[232px] shrink-0 border-r border-border bg-sidebar">{sidebar()}</aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[288px] max-w-[90vw]" ><SheetTitle className="sr-only">{t("ops.workspace")}</SheetTitle>{sidebar(true)}</SheetContent></Sheet>
    <div className="flex-1 min-w-0">
      <header data-tour="mobile-header" className="workspace-topbar flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-20"><div className="flex items-center gap-3 min-w-0"><Button variant="ghost" size="icon" className="md:hidden" aria-label={t("ops.openNavigation")} onClick={() => setMobileOpen(true)}><IconMenu /></Button><span className="hidden sm:inline text-xs text-muted-foreground">{t("ops.workspace")}</span><span className="hidden sm:inline text-muted-foreground/50">/</span><span className="text-sm font-medium truncate">{selected?.display_name || selected?.channel_login || "necko7"}</span></div>{operator && <NavLink className="text-xs text-muted-foreground hover:text-primary shrink-0" to={catalog}>{t("ops.publicLink")} ↗</NavLink>}</header>
      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none"><Suspense fallback={<div className="page-shell"><Skeleton className="h-64" /></div>}><Outlet key={selectedBroadcasterId} /></Suspense></main>
    </div>
  </div>;
}
