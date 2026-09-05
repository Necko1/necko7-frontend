import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { authApi } from "@/lib/apiClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconPlus = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function ChannelsPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    broadcasters,
    selectedBroadcasterId,
    setSelectedBroadcasterId,
  } = useAppStore();

  const [search, setSearch] = useState("");

  // Check if the current user's own channel is present in the broadcasters list
  const isSelfConnected = useMemo(() => {
    if (!currentUser) return false;
    return broadcasters.some(
      (b) =>
        b.channel_id === currentUser.twitch_id ||
        b.channel_login.toLowerCase() === currentUser.login.toLowerCase()
    );
  }, [broadcasters, currentUser]);

  // Filter broadcasters by search query
  const filteredBroadcasters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return broadcasters;
    return broadcasters.filter(
      (b) =>
        b.channel_login.toLowerCase().includes(q) ||
        b.role.toLowerCase().includes(q)
    );
  }, [broadcasters, search]);

  const handleSelectChannel = (channelId: string) => {
    setSelectedBroadcasterId(channelId);
    navigate("/dashboard");
  };

  const handleConnectChannel = () => {
    window.location.href = authApi.connectUrl();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Channels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose an active channel to manage or connect your own Twitch stream
          </p>
        </div>

        {/* Search bar & connect action */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconSearch />
            </span>
            <Input
              type="search"
              placeholder="Search channels…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          <Button
            onClick={handleConnectChannel}
            variant="outline"
            className="shrink-0 gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground"
          >
            <IconTwitch />
            <span>Connect Channel</span>
          </Button>
        </div>
      </div>

      {/* ── Channels Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* ── "Connect to your channel" card — shown first if user is not in list ── */}
        {!isSelfConnected && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleConnectChannel}
            onKeyDown={(e) => e.key === "Enter" && handleConnectChannel()}
            className="group relative flex flex-col justify-between p-6 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all duration-200 cursor-pointer min-h-56 text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 glow-teal">
                <IconPlus />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  Connect your channel
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Authorize necko7 bot to manage channel point skin rewards on your personal Twitch stream.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
              <IconTwitch />
              <span>Connect via Twitch</span>
              <IconArrowRight />
            </div>
          </div>
        )}

        {/* ── Broadcaster cards ── */}
        {filteredBroadcasters.map((b) => {
          const isSelected = b.channel_id === selectedBroadcasterId;
          return (
            <div
              key={b.channel_id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectChannel(b.channel_id)}
              onKeyDown={(e) => e.key === "Enter" && handleSelectChannel(b.channel_id)}
              className={cn(
                "group relative flex flex-col justify-between p-5 rounded-2xl border bg-card transition-all duration-200 cursor-pointer min-h-56 text-left focus:outline-none focus:ring-2 focus:ring-primary/40 hover:shadow-lg hover:shadow-primary/5",
                isSelected
                  ? "border-primary ring-1 ring-primary/40 shadow-sm"
                  : "border-border hover:border-primary/40 hover:-translate-y-0.5"
              )}
            >
              {/* Card top: Avatar + Badges */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <Avatar className="h-14 w-14 rounded-xl ring-2 ring-primary/20 shrink-0">
                    <AvatarImage
                      alt={b.channel_login}
                    />
                    <AvatarFallback className="text-base font-bold bg-primary text-primary-foreground rounded-xl">
                      {(b.channel_login || "??").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Status / Role badge */}
                  <div className="flex items-center gap-1.5">
                    {isSelected ? (
                      <Badge className="bg-primary/20 text-primary border border-primary/30 gap-1 text-[11px] font-semibold">
                        <IconCheck />
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[11px] font-medium capitalize",
                          b.role === "Owner"
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/20"
                            : "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/20"
                        )}
                      >
                        {b.role}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Channel Name */}
                <div>
                  <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {b.channel_login}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    ID: {b.channel_id}
                  </p>
                </div>
              </div>

              {/* Card bottom: Actions */}
              <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                  {isSelected ? "Currently active" : "Switch to channel"}
                  {!isSelected && <IconArrowRight />}
                </span>

                {/* Settings shortcut button */}
                <button
                  type="button"
                  title="Channel settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/broadcasters/${b.channel_id}/settings`);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <IconSettings />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Empty search state ── */}
      {filteredBroadcasters.length === 0 && search.trim() && (
        <div className="py-16 text-center space-y-3">
          <p className="text-base font-semibold text-foreground">
            No channels match "{search}"
          </p>
          <p className="text-xs text-muted-foreground">
            Try a different search query or clear the filter.
          </p>
          <Button
            variant="ghost"
            onClick={() => setSearch("")}
            className="text-primary text-xs"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
