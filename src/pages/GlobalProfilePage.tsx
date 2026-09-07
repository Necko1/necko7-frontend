import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { viewerApi } from "@/lib/apiClient";
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
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconGift = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" />
    <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const IconBroadcast = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
  </svg>
);

const IconExternal = ({ className }: { className?: string } = {}) => (
  <svg className={cn("shrink-0", className)} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
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

export default function GlobalProfilePage() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const [page, setPage] = useState(0);
  const pageSize = 15;

  // 1. Global viewer profile
  const { data: globalProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["viewer-global-profile"],
    queryFn: () => viewerApi.getGlobalProfile().then((r) => r.data),
    staleTime: 30_000,
  });

  // 2. Global redemptions history across all channels
  const { data: globalRedemptions = [], isLoading: isRedemptionsLoading } = useQuery({
    queryKey: ["viewer-global-redemptions", page],
    queryFn: () =>
      viewerApi
        .getGlobalRedemptions({ limit: pageSize, offset: page * pageSize })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  if (isProfileLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Global Header ── */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-full ring-4 ring-primary/20 shrink-0 shadow-sm overflow-hidden">
              <AvatarImage src={currentUser?.avatar_url ?? undefined} alt={currentUser?.login} className="rounded-full object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground rounded-full">
                {(currentUser?.login || "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                @{currentUser?.login}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Twitch ID: {currentUser?.twitch_id}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/channels")}
            className="text-xs h-9 gap-1.5"
          >
            <span>Switch Channels</span>
          </Button>
        </div>
      </div>

      {/* ── Summary Statistics Cards ── */}
      {globalProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chat Total Stats */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <IconChat />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Cross-Stream Chat Activity
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground block">Total Messages</span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {globalProfile.total_chat_messages.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground block">Total Characters</span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {globalProfile.total_chat_characters.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Redemptions Total Stats */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <IconGift />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Global Rewards Summary
                </h3>
              </div>
              <span className="text-xs font-mono text-purple-400 font-semibold">
                {globalProfile.redemption_stats.total_points_spent.toLocaleString()} pts spent
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total</span>
                <span className="text-xl font-black text-foreground font-mono">
                  {globalProfile.redemption_stats.total_redemptions}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">Completed</span>
                <span className="text-xl font-black text-emerald-500 font-mono">
                  {globalProfile.redemption_stats.completed}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <span className="text-[11px] text-destructive block">Failed</span>
                <span className="text-xl font-black text-destructive font-mono">
                  {globalProfile.redemption_stats.failed}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
              <span>Pending orders: {globalProfile.redemption_stats.pending}</span>
              <span>Total skin value: ~{formatMinorCurrency(globalProfile.redemption_stats.total_market_value, globalRedemptions[0]?.currency ?? "RUB")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Channels Grid ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <IconBroadcast />
          <h3 className="text-sm font-bold text-foreground">
            Channels with Your Activity ({globalProfile?.channels.length ?? 0})
          </h3>
        </div>

        {(!globalProfile?.channels || globalProfile.channels.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No channel activity recorded yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {globalProfile.channels.map((ch) => (
              <div
                key={ch.channel_id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-background hover:border-primary/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 rounded-full ring-1 ring-primary/20 shrink-0 overflow-hidden">
                    <AvatarImage src={ch.profile_image_url ?? undefined} alt={ch.display_name || ch.channel_login} className="rounded-full object-cover" />
                    <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground rounded-full">
                      {ch.channel_login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {ch.display_name || ch.channel_login}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ch.redemptions_count} rewards • {ch.messages_count} msgs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/c/${ch.channel_login}`}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-xs"
                    title="View Showcase"
                  >
                    <IconExternal />
                  </Link>
                  <Link
                    to={`/c/${ch.channel_login}/profile`}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Stats
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Global Redemptions Feed ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">
          All Redemptions (Across All Channels)
        </h3>

        {isRedemptionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : globalRedemptions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No redemptions recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {globalRedemptions.map((redemption) => (
              <div
                key={redemption.twitch_redemption_id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-background gap-4 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    to={`/c/${redemption.channel_login}/rewards/${redemption.twitch_reward_id}`}
                    className="w-10 h-10 rounded-lg bg-secondary/50 p-1 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                    title={`View "${redemption.reward_title}" on @${redemption.channel_login} showcase`}
                  >
                    <SkinImage marketItemName={redemption.market_item_name} size={150} />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/c/${redemption.channel_login}/rewards/${redemption.twitch_reward_id}`}
                        className="text-xs font-bold text-foreground truncate hover:text-primary hover:underline transition-colors flex items-center gap-1"
                        title={`View "${redemption.reward_title}" on @${redemption.channel_login} showcase`}
                      >
                        <span className="truncate">{redemption.reward_title}</span>
                        <IconExternal className="opacity-60" />
                      </Link>
                      <Link
                        to={`/c/${redemption.channel_login}`}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground hover:text-foreground font-mono"
                      >
                        @{redemption.channel_login}
                      </Link>
                    </div>
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
                disabled={globalRedemptions.length < pageSize}
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
