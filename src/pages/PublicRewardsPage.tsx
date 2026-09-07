import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicApi, broadcastersApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import type { PublicRewardResponse, PublicPoolItem } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SkinImage from "@/components/common/SkinImage";
import { cn } from "@/lib/utils";
import type { AxiosError } from "axios";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconPin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A4 4 0 0 1 14 9V5a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v4a4 4 0 0 1-2.11 3.56l-1.78.89A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const IconPinOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M9 9v-.24A2 2 0 0 1 11 7h2a2 2 0 0 1 2 2v4a4 4 0 0 0 .86 2.45" />
    <path d="M5 17h12" />
  </svg>
);

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const IconCheck = ({ className }: { className?: string } = {}) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLock = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconSparkles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

export default function PublicRewardsPage() {
  const { identifier, rewardId } = useParams<{ identifier: string; rewardId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser, broadcasters } = useAppStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  // 1. Broadcaster public info
  const {
    data: broadcasterInfo,
    isLoading: isInfoLoading,
    error: infoError,
  } = useQuery({
    queryKey: ["public-broadcaster", identifier],
    queryFn: () => publicApi.getBroadcasterInfo(identifier!).then((r) => r.data),
    enabled: !!identifier,
    staleTime: 60_000,
  });

  // 2. Rewards catalog
  const {
    data: rewards = [],
    isLoading: isRewardsLoading,
    error: rewardsError,
  } = useQuery({
    queryKey: ["public-rewards", identifier],
    queryFn: () => publicApi.getRewards(identifier!).then((r) => r.data),
    enabled: !!identifier && broadcasterInfo?.public_rewards_enabled !== false,
    staleTime: 30_000,
  });

  // Check if channel is pinned in current user's list
  const isPinned = useMemo(() => {
    if (!broadcasterInfo || !currentUser) return false;
    return broadcasters.some(
      (b) =>
        b.channel_id === broadcasterInfo.channel_id ||
        b.channel_login.toLowerCase() === broadcasterInfo.channel_login.toLowerCase()
    );
  }, [broadcasterInfo, currentUser, broadcasters]);

  // Pin / Unpin mutations
  const pinMutation = useMutation({
    mutationFn: () => broadcastersApi.pin(broadcasterInfo!.channel_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasters"] });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: () => broadcastersApi.unpin(broadcasterInfo!.channel_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasters"] });
    },
  });

  // 3. Direct single reward query (if opened directly via /rewards/:rewardId)
  const { data: singleReward } = useQuery({
    queryKey: ["public-reward", identifier, rewardId],
    queryFn: () => publicApi.getRewardById(identifier!, rewardId!).then((r) => r.data),
    enabled: !!identifier && !!rewardId && broadcasterInfo?.public_rewards_enabled !== false,
    staleTime: 30_000,
  });

  // Selected reward for expanded detail view (from direct query or catalog list)
  const selectedReward = useMemo(() => {
    if (!rewardId) return null;
    return singleReward ?? rewards.find((r) => r.twitch_id === rewardId) ?? null;
  }, [rewardId, singleReward, rewards]);

  // Filter rewards for catalog grid
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.twitch_title.toLowerCase().includes(search.toLowerCase().trim()) ||
        (r.market_item_name ?? "").toLowerCase().includes(search.toLowerCase().trim()) ||
        (r.pool_items ?? []).some((item) =>
          item.market_hash_name.toLowerCase().includes(search.toLowerCase().trim())
        );

      const matchType =
        typeFilter === "ALL" || r.reward_type === typeFilter;

      return matchSearch && matchType;
    });
  }, [rewards, search, typeFilter]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAccessDenied =
    broadcasterInfo?.public_rewards_enabled === false ||
    (rewardsError as AxiosError)?.response?.status === 403;

  if (isInfoLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (infoError || !broadcasterInfo) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <IconLock />
        </div>
        <h2 className="text-xl font-bold text-foreground">Channel Not Found</h2>
        <p className="text-sm text-muted-foreground">
          We couldn't find a broadcaster matching &ldquo;{identifier}&rdquo;. Please check the link or search again.
        </p>
        <Button onClick={() => navigate("/channels")} variant="outline" className="text-xs">
          Browse Channels
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Channel Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 backdrop-blur p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar + Name + Badges */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-2xl ring-4 ring-primary/20 shrink-0 shadow-md">
              <AvatarImage
                src={broadcasterInfo.profile_image_url ?? undefined}
                alt={broadcasterInfo.display_name || broadcasterInfo.channel_login}
              />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground rounded-2xl">
                {broadcasterInfo.channel_login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-foreground truncate">
                  {broadcasterInfo.display_name || broadcasterInfo.channel_login}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5",
                    broadcasterInfo.public_rewards_enabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {broadcasterInfo.public_rewards_enabled ? "Rewards Showcase Active" : "Showcase Disabled"}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground/80">
                  @{broadcasterInfo.channel_login}
                </span>
                <span>•</span>
                <a
                  href={`https://twitch.tv/${broadcasterInfo.channel_login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-purple-400 transition-colors font-medium"
                >
                  <IconTwitch />
                  <span>Twitch Channel</span>
                  <IconExternal />
                </a>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {currentUser ? (
              <>
                {/* Channel stats for viewer */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/c/${broadcasterInfo.channel_login}/profile`)}
                  className="gap-2 text-xs h-9 border-border/80 hover:border-primary/40"
                >
                  <IconUser />
                  <span>My Channel Stats</span>
                </Button>

                {/* Pin / Unpin button */}
                {isPinned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unpinMutation.mutate()}
                    disabled={unpinMutation.isPending}
                    className="gap-2 text-xs h-9 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                    title="Remove from my channels list"
                  >
                    <IconPinOff />
                    <span>Unpin</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => pinMutation.mutate()}
                    disabled={pinMutation.isPending}
                    className="gap-2 text-xs h-9"
                  >
                    <IconPin />
                    <span>Pin to My Channels</span>
                  </Button>
                )}
              </>
            ) : (
              /* Guest prompt */
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = authApi.loginUrl();
                }}
                className="gap-2 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              >
                <IconTwitch />
                <span>Log in with Twitch</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Copy link to this showcase"
            >
              {copied ? <IconCheck className="text-emerald-400" /> : <IconShare />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── If Showcase is disabled by streamer ── */}
      {isAccessDenied ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <IconLock />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Public Rewards Catalog is Disabled
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            @{broadcasterInfo.display_name || broadcasterInfo.channel_login} has disabled their public rewards showcase. Rewards can still be redeemed directly on the Twitch stream using channel points.
          </p>
          <a
            href={`https://twitch.tv/${broadcasterInfo.channel_login}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:underline"
          >
            <IconTwitch />
            <span>Open Twitch Stream</span>
            <IconExternal />
          </a>
        </div>
      ) : selectedReward ? (
        /* ── Full Content Detail View (Expanded) ── */
        <RewardDetailExpandedView
          reward={selectedReward}
          onBack={() => navigate(`/c/${identifier}`)}
          onCopyLink={handleCopyLink}
          copied={copied}
        />
      ) : (
        /* ── Catalog Overview (Cards Grid) ── */
        <div className="space-y-6">
          {/* Toolbar: Search and Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto">
              {[
                { id: "ALL", label: "All Rewards" },
                { id: "FIXED", label: "Single Skin" },
                { id: "POOL", label: "Skin Pools" },
                { id: "FILTER", label: "Filter Auto" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all select-none cursor-pointer",
                    typeFilter === tab.id
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <IconSearch />
              </span>
              <Input
                type="search"
                placeholder="Search skins or rewards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {isRewardsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-2">
              <p className="text-base font-semibold text-foreground">
                No rewards available
              </p>
              <p className="text-xs text-muted-foreground">
                {search ? "No rewards match your search criteria." : "This streamer hasn't published any rewards yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.twitch_id}
                  reward={reward}
                  onClick={() => navigate(`/c/${identifier}/rewards/${reward.twitch_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reward Card (Grid Item) ────────────────────────────────────────────────
function RewardCard({
  reward,
  onClick,
}: {
  reward: PublicRewardResponse;
  onClick: () => void;
}) {
  const isPool = reward.reward_type === "POOL";
  const isFilter = reward.reward_type === "FILTER";

  // First skin image to show
  const primarySkinName =
    reward.market_item_name ??
    reward.pool_items?.[0]?.market_hash_name ??
    null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group flex flex-col justify-between p-4 rounded-2xl border border-border bg-card/80 hover:bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer min-h-[260px] text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Top: Badges */}
      <div className="flex items-center justify-between gap-1.5">
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-semibold uppercase px-1.5 py-0.2",
            reward.reward_type === "FIXED" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
            reward.reward_type === "POOL" && "bg-purple-500/10 text-purple-500 border-purple-500/20",
            reward.reward_type === "FILTER" && "bg-teal-500/10 text-teal-500 border-teal-500/20"
          )}
        >
          {reward.reward_type === "FIXED" ? "Single Skin" : reward.reward_type === "POOL" ? `Pool (${reward.pool_items?.length ?? 0})` : "Filter Auto"}
        </Badge>

        {reward.is_paused && (
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10">
            Paused
          </Badge>
        )}
      </div>

      {/* Middle: Skin Image Preview */}
      <div className="relative py-4 flex items-center justify-center h-32 my-auto">
        {isPool && (reward.pool_items?.length ?? 0) > 1 ? (
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Multi-item preview stack */}
            {reward.pool_items?.[1] && (
              <div className="absolute right-0 top-0 w-20 h-20 opacity-40 group-hover:opacity-60 transition-opacity">
                <SkinImage marketItemName={reward.pool_items[1].market_hash_name} size={150} />
              </div>
            )}
            <div className="relative z-10 w-24 h-24 drop-shadow-md group-hover:scale-105 transition-transform">
              <SkinImage marketItemName={primarySkinName} size={150} />
            </div>
          </div>
        ) : isFilter ? (
          <div className="w-24 h-24 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col items-center justify-center text-teal-500 group-hover:scale-105 transition-transform">
            <IconSparkles />
            <span className="text-[11px] font-bold mt-1">Auto-Pick</span>
          </div>
        ) : (
          <div className="w-28 h-28 drop-shadow-md group-hover:scale-105 transition-transform">
            <SkinImage marketItemName={primarySkinName} size={150} />
          </div>
        )}
      </div>

      {/* Bottom: Title & Cost */}
      <div className="pt-2 border-t border-border/50 space-y-1">
        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors" title={reward.twitch_title}>
          {reward.twitch_title}
        </h3>

        <div className="flex items-center justify-between text-xs">
          {reward.cost_points != null ? (
            <span className="font-semibold text-purple-400 font-mono text-[11px]">
              {reward.cost_points.toLocaleString()} pts
            </span>
          ) : (
            <span className="text-muted-foreground text-[11px]">Points hidden</span>
          )}

          {reward.market_price != null ? (
            <span className="font-medium text-foreground/80 font-mono text-[11px]">
              ~{reward.currency ?? ""} {reward.market_price.toFixed(2)}
            </span>
          ) : isPool && reward.pool_items?.[0]?.current_market_price != null ? (
            <span className="font-medium text-foreground/80 font-mono text-[11px]">
              from {reward.pool_items[0].current_market_price.toFixed(2)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Full Content Detail View (Expanded) ────────────────────────────────────
function RewardDetailExpandedView({
  reward,
  onBack,
  onCopyLink,
  copied,
}: {
  reward: PublicRewardResponse;
  onBack: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const isPool = reward.reward_type === "POOL";
  const isFilter = reward.reward_type === "FILTER";
  const isFixed = reward.reward_type === "FIXED";

  return (
    <div className="space-y-6">
      {/* Top navigation & action bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft />
          <span>Back to all rewards</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
            className="gap-1.5 text-xs"
          >
            {copied ? <IconCheck className="text-emerald-400" /> : <IconShare />}
            <span>{copied ? "Link Copied" : "Share Reward"}</span>
          </Button>
        </div>
      </div>

      {/* Main Reward Card Hero */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-semibold px-2 py-0.5",
                  isFixed && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                  isPool && "bg-purple-500/10 text-purple-500 border-purple-500/20",
                  isFilter && "bg-teal-500/10 text-teal-500 border-teal-500/20"
                )}
              >
                {isFixed ? "Single Skin Reward" : isPool ? `Skin Pool (${reward.pool_items?.length ?? 0} skins)` : "Filter Auto Reward"}
              </Badge>

              {reward.is_paused ? (
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-xs">
                  Paused {reward.pause_reason ? `(${reward.pause_reason})` : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                  Available on Stream
                </Badge>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {reward.twitch_title}
            </h2>

            {reward.twitch_description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {reward.twitch_description}
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="flex flex-row md:flex-col items-baseline md:items-end justify-between w-full md:w-auto p-4 rounded-2xl bg-secondary/30 border border-border/60 shrink-0 gap-1">
            <span className="text-xs text-muted-foreground font-medium">Channel Points Cost</span>
            {reward.cost_points != null ? (
              <span className="text-2xl font-black text-purple-400 font-mono">
                {reward.cost_points.toLocaleString()} pts
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Points cost hidden</span>
            )}
            {reward.market_price != null && (
              <span className="text-xs text-muted-foreground font-mono">
                Market Value: {reward.currency ?? ""} {reward.market_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* ── If FIXED: Large Single Skin Showcase ── */}
        {isFixed && (
          <div className="p-8 rounded-2xl border border-border/60 bg-background/50 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="w-48 h-48 drop-shadow-xl shrink-0">
              <SkinImage marketItemName={reward.market_item_name} size={300} />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Item Drop</span>
              <h3 className="text-xl font-bold text-foreground">
                {reward.market_item_name || "Unknown skin"}
              </h3>
              {reward.market_price != null && (
                <p className="text-sm text-muted-foreground font-mono">
                  Estimated Steam Market Price:{" "}
                  <span className="text-foreground font-bold font-mono">
                    {reward.currency ?? ""} {reward.market_price.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── If FILTER: Criteria Box ── */}
        {isFilter && reward.filter_details && (
          <div className="p-6 rounded-2xl border border-teal-500/20 bg-teal-500/5 space-y-3">
            <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
              <IconSparkles />
              <span>Auto-Purchase Filter Criteria</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block mb-1">Price Range</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {reward.filter_details.min_price ?? 0} – {reward.filter_details.max_price ?? "∞"} {reward.currency ?? ""}
                </span>
              </div>
              {reward.filter_details.name_contains && (
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block mb-1">Name Contains</span>
                  <span className="font-semibold text-foreground">{reward.filter_details.name_contains}</span>
                </div>
              )}
              {reward.filter_details.name_prefix && (
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block mb-1">Name Prefix</span>
                  <span className="font-semibold text-foreground">{reward.filter_details.name_prefix}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── If POOL: Sub-Grid of Mini-Cards ── */}
        {isPool && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pool Drop Items ({reward.pool_items?.length ?? 0})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When redeemed, one skin is randomly selected from this pool based on the drop chances below.
                </p>
              </div>
            </div>

            {(!reward.pool_items || reward.pool_items.length === 0) ? (
              <p className="text-xs text-muted-foreground py-4 italic">
                Items in this pool are currently hidden or not configured.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {reward.pool_items.map((item: PublicPoolItem, index: number) => (
                  <PoolMiniCard key={`${item.market_hash_name}-${index}`} item={item} currency={reward.currency} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Requirements & Limits Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60">
          {/* Chat Requirements */}
          {reward.chat_requirements && (
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/60 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chat Activity Requirement
              </h4>
              <p className="text-xs text-foreground leading-relaxed">
                Viewer must have sent at least{" "}
                <span className="font-bold text-primary">{reward.chat_requirements.min_messages ?? 0} messages</span>
                {reward.chat_requirements.min_characters ? ` (${reward.chat_requirements.min_characters} characters)` : ""}{" "}
                in the last {reward.chat_requirements.time_window_hours ?? 24} hours to redeem this reward.
              </p>
            </div>
          )}

          {/* Limits / Cooldowns */}
          {(reward.purchase_limits || reward.max_redemptions_per_user_per_stream || reward.global_cooldown_seconds) && (
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/60 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Redemption Limits & Cooldowns
              </h4>
              <div className="space-y-1 text-xs text-foreground">
                {reward.max_redemptions_per_user_per_stream && (
                  <p>• Max {reward.max_redemptions_per_user_per_stream} per user per stream</p>
                )}
                {reward.global_cooldown_seconds && (
                  <p>• Cooldown: {Math.round(reward.global_cooldown_seconds / 60)} minutes between redemptions</p>
                )}
                {reward.purchase_limits?.user?.map((rule, i) => (
                  <p key={i}>• Personal limit: max {rule.max_redemptions} every {rule.window_hours ? `${rule.window_hours}h` : "stream"}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pool Mini-Card ─────────────────────────────────────────────────────────
function PoolMiniCard({
  item,
  currency,
}: {
  item: PublicPoolItem;
  currency?: string | null;
}) {
  return (
    <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/80 bg-background hover:border-primary/40 transition-colors space-y-3">
      {/* Top: Drop Chance Badge */}
      <div className="flex items-center justify-between gap-1.5">
        {item.chance_percentage != null ? (
          <Badge
            variant="secondary"
            className="text-[11px] font-mono font-bold bg-primary/10 text-primary border-primary/20 px-2 py-0.2"
          >
            🎯 {item.chance_percentage.toFixed(2)}%
          </Badge>
        ) : (
          <span />
        )}

        {item.current_market_price != null && (
          <span className="text-[11px] font-mono font-semibold text-foreground/90">
            {currency ?? ""} {item.current_market_price.toFixed(2)}
          </span>
        )}
      </div>

      {/* Middle: Skin Image */}
      <div className="w-24 h-24 mx-auto drop-shadow-sm flex items-center justify-center">
        <SkinImage marketItemName={item.market_hash_name} size={150} />
      </div>

      {/* Bottom: Item Name */}
      <div>
        <p className="text-xs font-semibold text-foreground truncate" title={item.market_hash_name}>
          {item.market_hash_name}
        </p>
        {item.permissible_market_price_deviation != null && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Dev: ±{item.permissible_market_price_deviation}%
          </p>
        )}
      </div>
    </div>
  );
}
