import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicApi, viewerApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SkinImage from "@/components/common/SkinImage";
import { formatMinorCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { RedemptionStatus } from "@/types/api";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconExternalLink = ({ className }: { className?: string } = {}) => (
  <svg className={cn("shrink-0", className)} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconGift = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" />
    <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

function getStatusBadge(status: RedemptionStatus) {
  const norm = status.toUpperCase();
  if (norm === "COMPLETED") {
    return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">Completed</Badge>;
  }
  if (norm === "PENDING" || norm === "ORDER_CREATED") {
    return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">Pending</Badge>;
  }
  if (norm.includes("FAILED")) {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Failed</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

export default function ChannelProfilePage() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const [page, setPage] = useState(0);
  const pageSize = 15;

  // 1. Broadcaster info
  const { data: broadcasterInfo, isLoading: isInfoLoading } = useQuery({
    queryKey: ["public-broadcaster", identifier],
    queryFn: () => publicApi.getBroadcasterInfo(identifier!).then((r) => r.data),
    enabled: !!identifier,
    staleTime: 60_000,
  });

  const channelId = broadcasterInfo?.channel_id;

  // 2. Viewer channel profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["viewer-channel-profile", channelId],
    queryFn: () => viewerApi.getChannelProfile(channelId!).then((r) => r.data),
    enabled: !!channelId && !!currentUser,
    staleTime: 30_000,
  });

  // 3. Viewer channel redemptions
  const { data: redemptions = [], isLoading: isRedemptionsLoading } = useQuery({
    queryKey: ["viewer-channel-redemptions", channelId, page],
    queryFn: () =>
      viewerApi
        .getChannelRedemptions(channelId!, { limit: pageSize, offset: page * pageSize })
        .then((r) => r.data),
    enabled: !!channelId && !!currentUser,
    staleTime: 30_000,
  });

  if (isInfoLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!broadcasterInfo) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Channel Not Found</h2>
        <Button onClick={() => navigate("/channels")} variant="outline" className="text-xs">
          Browse Channels
        </Button>
      </div>
    );
  }

  // If user is guest:
  if (!currentUser) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/c/${identifier}`)}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft />
          <span>Back to @{broadcasterInfo.channel_login} showcase</span>
        </Button>

        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-6 max-w-xl mx-auto">
          <Avatar className="h-20 w-20 rounded-full ring-4 ring-primary/20 mx-auto overflow-hidden">
            <AvatarImage src={broadcasterInfo.profile_image_url ?? undefined} className="rounded-full object-cover" />
            <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground rounded-full">
              {broadcasterInfo.channel_login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Personal Channel Profile
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Log in with Twitch to view your chat activity rank, points spent, active limits, and personal reward history on @{broadcasterInfo.display_name || broadcasterInfo.channel_login}'s stream.
            </p>
          </div>

          <Button
            onClick={() => {
              window.location.href = authApi.loginUrl();
            }}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md"
          >
            <IconTwitch />
            <span>Sign In with Twitch</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/c/${identifier}`)}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft />
          <span>Rewards Showcase</span>
        </Button>

        <span className="text-xs text-muted-foreground font-mono">
          Channel: @{broadcasterInfo.channel_login}
        </span>
      </div>

      {/* ── Channel Profile Header ── */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-full ring-4 ring-primary/20 shrink-0 shadow-sm overflow-hidden">
              <AvatarImage src={currentUser.avatar_url ?? undefined} alt={currentUser.login} className="rounded-full object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground rounded-full">
                {currentUser.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                @{currentUser.login}
              </h1>
              <p className="text-xs text-muted-foreground">
                Statistics on stream <span className="font-semibold text-foreground">@{broadcasterInfo.display_name || broadcasterInfo.channel_login}</span>
              </p>
            </div>
          </div>

          <Link
            to="/me"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
          >
            <span>View All Channels (Global Profile) →</span>
          </Link>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      {isProfileLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chat Stats Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <IconChat />
                </div>
                <h3 className="text-sm font-bold text-foreground">Chat Activity</h3>
              </div>
              {profile.chat_stats.leaderboard_rank != null && (
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1 text-xs font-bold">
                  <IconTrophy />
                  <span>#{profile.chat_stats.leaderboard_rank} in Chat</span>
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground block">Messages</span>
                <span className="text-xl font-black text-foreground font-mono">
                  {profile.chat_stats.total_messages.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground block">Characters</span>
                <span className="text-xl font-black text-foreground font-mono">
                  {profile.chat_stats.total_characters.toLocaleString()}
                </span>
              </div>
            </div>

            {(profile.chat_stats.first_seen_at || profile.chat_stats.last_seen_at) && (
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                <span>First active: {profile.chat_stats.first_seen_at ? new Date(profile.chat_stats.first_seen_at).toLocaleDateString() : "—"}</span>
                <span>Last active: {profile.chat_stats.last_seen_at ? new Date(profile.chat_stats.last_seen_at).toLocaleDateString() : "—"}</span>
              </div>
            )}
          </div>

          {/* Redemptions Stats Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <IconGift />
                </div>
                <h3 className="text-sm font-bold text-foreground">Rewards Overview</h3>
              </div>
              <span className="text-xs font-mono text-purple-400 font-semibold">
                {profile.redemption_stats.total_points_spent.toLocaleString()} pts spent
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total</span>
                <span className="text-lg font-black text-foreground font-mono">
                  {profile.redemption_stats.total_redemptions}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">Completed</span>
                <span className="text-lg font-black text-emerald-500 font-mono">
                  {profile.redemption_stats.completed}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <span className="text-[11px] text-destructive block">Failed</span>
                <span className="text-lg font-black text-destructive font-mono">
                  {profile.redemption_stats.failed}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
              <span>Pending delivery: {profile.redemption_stats.pending}</span>
              <span>Total skin value: ~{formatMinorCurrency(profile.redemption_stats.total_market_value, redemptions[0]?.currency ?? "RUB")}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Active Reward Limits / Cooldowns ── */}
      {profile?.limits && profile.limits.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <IconClock />
            <h3 className="text-sm font-bold text-foreground">
              Your Reward Limits & Cooldowns
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {profile.limits.map((limit) => {
              const progressPct = Math.min(
                100,
                Math.round((limit.used_redemptions / limit.max_redemptions) * 100)
              );

              return (
                <Link
                  key={limit.twitch_reward_id}
                  to={`/c/${broadcasterInfo.channel_login}/rewards/${limit.twitch_reward_id}`}
                  className="p-4 rounded-xl border border-border/70 bg-background space-y-2.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all block group text-left"
                  title={`View "${limit.reward_title}" on stream showcase`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors" title={limit.reward_title}>
                      {limit.reward_title}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {limit.is_limit_reached ? (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                          Limit Reached
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                          {limit.remaining_redemptions} left
                        </Badge>
                      )}
                      <IconExternalLink className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        limit.is_limit_reached ? "bg-destructive" : "bg-primary"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{limit.used_redemptions} / {limit.max_redemptions} used</span>
                    <span>{limit.window_hours ? `Per ${limit.window_hours}h` : "All-time"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Redemption History on this Channel ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">
          Channel Redemption History
        </h3>

        {isRedemptionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : redemptions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            You haven't redeemed any rewards on this channel yet.
          </p>
        ) : (
          <div className="space-y-2">
            {redemptions.map((redemption) => (
              <div
                key={redemption.twitch_redemption_id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-background gap-4 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    to={`/c/${broadcasterInfo.channel_login}/rewards/${redemption.twitch_reward_id}`}
                    className="w-10 h-10 rounded-lg bg-secondary/50 p-1 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                    title={`View "${redemption.reward_title}" on stream showcase`}
                  >
                    <SkinImage marketItemName={redemption.market_item_name} size={150} />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/c/${broadcasterInfo.channel_login}/rewards/${redemption.twitch_reward_id}`}
                      className="text-xs font-bold text-foreground truncate hover:text-primary hover:underline transition-colors flex items-center gap-1.5"
                      title={`View "${redemption.reward_title}" on stream showcase`}
                    >
                      <span className="truncate">{redemption.reward_title}</span>
                      <IconExternalLink className="text-muted-foreground shrink-0" />
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {redemption.market_item_name || "Custom item"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="font-mono text-purple-400 font-semibold">
                    {redemption.twitch_points_cost.toLocaleString()} pts
                  </span>

                  {redemption.market_paid_price != null && (
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {formatMinorCurrency(redemption.market_paid_price, redemption.currency)}
                    </span>
                  )}

                  {getStatusBadge(redemption.status)}

                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(redemption.created_at).toLocaleDateString()}
                  </span>
                </div>

                {redemption.fail_cause && (
                  <div className="w-full text-[11px] text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/20">
                    Failure reason: {redemption.fail_description || redemption.fail_cause}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="text-muted-foreground font-mono">Page {page + 1}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={redemptions.length < pageSize}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
