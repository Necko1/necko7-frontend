import RewardShowcase from "@/components/rewards/RewardShowcase";
import { QueryError } from "@/components/common/Page";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { publicApi, broadcastersApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import type { PublicRewardResponse } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SkinImage from "@/components/common/SkinImage";
import { HugeiconsIcon } from "@hugeicons/react";
import { PinIcon, PinOffIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { getShortRewardUrl, base64UrlToUuid } from "@/lib/shortUrl";
import type { AxiosError } from "axios";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconTwitch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const IconPin = () => (
  <HugeiconsIcon icon={PinIcon} size={15} strokeWidth={2} />
);

const IconPinOff = () => (
  <HugeiconsIcon icon={PinOffIcon} size={15} strokeWidth={2} />
);

const IconExternal = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconShare = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const IconCheck = ({ className }: { className?: string } = {}) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLock = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconUser = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconSparkles = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const IconExternalLink = ({ className }: { className?: string } = {}) => (
  <svg
    className={cn("shrink-0", className)}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconPool = ({ className }: { className?: string } = {}) => (
  <svg
    className={cn("shrink-0", className)}
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconFilter = ({ className }: { className?: string } = {}) => (
  <svg
    className={cn("shrink-0", className)}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

function getCsgoMarketUrl(marketHashName?: string | null): string {
  if (!marketHashName) return "#";
  return `https://market.csgo.com/en/?search=${encodeURIComponent(marketHashName)}`;
}

function formatPriceWithDeviation(
  price: number | null | undefined,
  deviationPercent: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (price == null) return null;
  const curr = currency ? `${currency} ` : "";
  if (deviationPercent != null && deviationPercent > 0) {
    const dev = (price * deviationPercent) / 100;
    return `${curr}${price.toFixed(2)} ±${dev.toFixed(2)}`;
  }
  return `${curr}${price.toFixed(2)}`;
}

export default function PublicRewardsPage() {
  const { t } = useTranslation();
  const { identifier, rewardId: rawRewardId } = useParams<{
    identifier: string;
    rewardId?: string;
  }>();
  const rewardId = useMemo(
    () => (rawRewardId ? base64UrlToUuid(rawRewardId) : undefined),
    [rawRewardId],
  );
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
    refetch: retryInfo,
  } = useQuery({
    queryKey: ["public-broadcaster", identifier],
    queryFn: () =>
      publicApi.getBroadcasterInfo(identifier!).then((r) => r.data),
    enabled: !!identifier,
    staleTime: 60_000,
  });

  // 2. Rewards catalog
  const {
    data: rewards = [],
    isLoading: isRewardsLoading,
    error: rewardsError,
    refetch: retryRewards,
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
        b.channel_login.toLowerCase() ===
          broadcasterInfo.channel_login.toLowerCase(),
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
  const {
    data: singleReward,
    isFetching: singleLoading,
    error: singleError,
    refetch: retrySingle,
  } = useQuery({
    queryKey: ["public-reward", identifier, rewardId],
    queryFn: () =>
      publicApi.getRewardById(identifier!, rewardId!).then((r) => r.data),
    enabled:
      !!identifier &&
      !!rewardId &&
      broadcasterInfo?.public_rewards_enabled !== false,
    staleTime: 30_000,
  });

  // Selected reward for expanded detail view (from direct query or catalog list)
  const selectedReward = useMemo(() => {
    if (!rewardId) return null;
    return (
      singleReward ?? rewards.find((r) => r.twitch_id === rewardId) ?? null
    );
  }, [rewardId, singleReward, rewards]);

  // Filter rewards for catalog grid
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.twitch_title.toLowerCase().includes(search.toLowerCase().trim()) ||
        (r.market_item_name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase().trim()) ||
        (r.pool_items ?? []).some((item) =>
          item.market_hash_name
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
        );

      const matchType = typeFilter === "ALL" || r.reward_type === typeFilter;

      return matchSearch && matchType;
    });
  }, [rewards, search, typeFilter]);

  const handleCopyLink = () => {
    const url =
      selectedReward && identifier
        ? getShortRewardUrl(identifier, selectedReward.twitch_id)
        : window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAccessDenied =
    broadcasterInfo?.public_rewards_enabled === false ||
    (rewardsError as AxiosError)?.response?.status === 403;

  if (isInfoLoading) {
    return (
      <div className="page-shell max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (
    (infoError && (infoError as AxiosError)?.response?.status !== 404) ||
    (rewardsError && !isAccessDenied)
  )
    return (
      <div className="page-shell">
        <QueryError
          onRetry={() => {
            void retryInfo();
            void retryRewards();
          }}
        />
      </div>
    );
  if (infoError || !broadcasterInfo) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <IconLock />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {t("profile.channelNotFound", "Channel Not Found")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "public.channelNotFoundDesc",
            "We couldn't find a broadcaster matching this address. Please check the link or search again.",
          )}
        </p>
        <Button
          onClick={() => navigate("/channels")}
          variant="outline"
          className="text-xs"
        >
          {t("profile.browseChannels", "Browse Channels")}
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-6xl">
      {/* ── Channel Header ── */}
      <div className="catalog-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar + Name + Badges */}
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 rounded-md shrink-0">
              <AvatarImage
                src={broadcasterInfo.profile_image_url ?? undefined}
                alt={
                  broadcasterInfo.display_name || broadcasterInfo.channel_login
                }
              />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground rounded-full">
                {broadcasterInfo.channel_login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-foreground truncate">
                {broadcasterInfo.display_name || broadcasterInfo.channel_login}
              </h1>

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
                  <span>Twitch</span>
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
                  onClick={() =>
                    navigate(`/c/${broadcasterInfo.channel_login}/profile`)
                  }
                  className="gap-2 text-xs h-9 border-border/80 hover:border-primary/40"
                >
                  <IconUser />
                  <span>{t("public.myChannelStats", "My Channel Stats")}</span>
                </Button>

                {/* Pin / Unpin button */}
                {isPinned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unpinMutation.mutate()}
                    disabled={unpinMutation.isPending}
                    className="gap-2 text-xs h-9 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                    title={t("public.unpin", "Unpin")}
                  >
                    <IconPinOff />
                    <span>{t("public.unpin", "Unpin")}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => pinMutation.mutate()}
                    disabled={pinMutation.isPending}
                    className="gap-2 text-xs h-9"
                  >
                    <IconPin />
                    <span>{t("public.pin", "Pin to My Channels")}</span>
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
                <span>
                  {t("profile.signInWithTwitch", "Log in with Twitch")}
                </span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title={t("public.copyLinkShowcase", "Copy link to this showcase")}
            >
              {copied ? (
                <IconCheck className="text-emerald-400" />
              ) : (
                <IconShare />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── If Showcase is disabled by streamer ── */}
      {isAccessDenied ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <IconLock />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {t(
              "public.catalogDisabledTitle",
              "Public Rewards Catalog is Disabled",
            )}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("public.catalogDisabledDesc", {
              channel:
                broadcasterInfo.display_name || broadcasterInfo.channel_login,
            })}
          </p>
          <a
            href={`https://twitch.tv/${broadcasterInfo.channel_login}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:underline"
          >
            <IconTwitch />
            <span>{t("public.openTwitchStream", "Open Twitch Stream")}</span>
            <IconExternal />
          </a>
        </div>
      ) : selectedReward ? (
        /* ── Full Content Detail View (Expanded) ── */
        <RewardShowcase
          reward={selectedReward}
          identifier={identifier!}
          onBack={() => navigate(`/c/${identifier}`)}
        />
      ) : rewardId ? (
        singleLoading ? (
          <Skeleton className="h-48" />
        ) : singleError &&
          (singleError as AxiosError)?.response?.status !== 404 ? (
          <QueryError onRetry={() => retrySingle()} />
        ) : (
          <div className="empty-state">
            <h2>
              {t(
                "public.rewardUnavailable",
                "This reward is no longer publicly available",
              )}
            </h2>
            <Button
              variant="outline"
              onClick={() => navigate(`/c/${identifier}`)}
            >
              {t("public.backToAll", "Back to all rewards")}
            </Button>
          </div>
        )
      ) : (
        /* ── Catalog Overview (Cards Grid) ── */
        <div className="space-y-6">
          {/* Toolbar: Search and Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto">
              {[
                { id: "ALL", label: t("public.allRewards", "All Rewards") },
                { id: "FIXED", label: t("public.typeFixed", "Fixed") },
                { id: "POOL", label: t("public.typePool", "Skin Pool") },
                { id: "FILTER", label: t("public.typeFilter", "Filter") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all select-none cursor-pointer",
                    typeFilter === tab.id
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
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
                placeholder={t(
                  "public.searchPlaceholder",
                  "Search skins or rewards…",
                )}
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
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
              <p className="text-base font-semibold text-foreground">
                {t("public.noRewardsAvailable", "No rewards available")}
              </p>
              <p className="text-xs text-muted-foreground">
                {search
                  ? t(
                      "public.noRewardsMatch",
                      "No rewards match your search criteria.",
                    )
                  : t(
                      "public.noRewardsPublished",
                      "This streamer hasn't published any rewards yet.",
                    )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.twitch_id}
                  reward={reward}
                  onClick={() =>
                    navigate(`/c/${identifier}/rewards/${reward.twitch_id}`)
                  }
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
  const { t } = useTranslation();
  const isPool = reward.reward_type === "POOL";
  const isFilter = reward.reward_type === "FILTER";
  const isFixed = reward.reward_type === "FIXED";

  const hasLimits =
    (reward.purchase_limits?.user?.length ?? 0) > 0 ||
    (reward.purchase_limits?.global?.length ?? 0) > 0 ||
    (reward.max_redemptions_per_user_per_stream ?? 0) > 0 ||
    (reward.max_redemptions_per_stream ?? 0) > 0;

  const formattedCardPrice =
    reward.market_price != null
      ? formatPriceWithDeviation(
          reward.market_price,
          reward.permissible_market_price_deviation,
          reward.currency,
        )
      : isPool && reward.pool_items?.[0]?.current_market_price != null
        ? `${t("public.priceFrom", "from")} ${reward.currency ?? ""} ${reward.pool_items[0].current_market_price.toFixed(2)}`
        : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "reward-tile public-reward-tile group relative cursor-pointer overflow-hidden flex flex-col select-none text-left",
        "hover:border-primary/40  hover:shadow-primary/5 ",
        reward.is_paused ? "public-reward-paused" : "border-border bg-card",
      )}
    >
      {/* ── Top Visual Media Banner ── */}
      {isFixed && (
        <div className="reward-art w-full flex items-center justify-center p-4 overflow-hidden">
          {reward.market_item_name ? (
            <SkinImage
              marketItemName={reward.market_item_name}
              size={300}
              className="w-full h-full object-contain drop-shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <IconSparkles />
            </div>
          )}

          {reward.is_paused && (
            <div className="absolute top-2.5 right-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>
                {t("public.paused", "Paused")}
                {reward.pause_reason ? ` (${reward.pause_reason})` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {isPool && (
        <div className="reward-art w-full flex items-center justify-center p-4 overflow-hidden">
          {reward.pool_items?.[0]?.market_hash_name ? (
            <SkinImage
              marketItemName={reward.pool_items[0].market_hash_name}
              size={300}
              className="w-full h-full object-contain drop-shadow-md transition-transform duration-300"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <IconPool />
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/60 px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-white/90 font-medium border border-white/10 shadow-sm">
            <IconPool />
            <span>
              {t("public.poolSkinsCount", {
                count: reward.pool_items?.length ?? 0,
              })}
            </span>
          </div>

          {reward.is_paused && (
            <div className="absolute top-2.5 right-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>
                {t("public.paused", "Paused")}
                {reward.pause_reason ? ` (${reward.pause_reason})` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {isFilter && (
        <div className="reward-art w-full flex flex-col items-center justify-center gap-2 p-4 overflow-hidden">
          <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 shadow-sm">
            <IconFilter />
          </div>
          {reward.filter_details && (
            <span className="text-xs text-muted-foreground font-mono font-medium">
              {reward.filter_details.min_price ?? 0} –{" "}
              {reward.filter_details.max_price ?? "∞"} {reward.currency ?? ""}
            </span>
          )}

          {reward.is_paused && (
            <div className="absolute top-2.5 right-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>
                {t("public.paused", "Paused")}
                {reward.pause_reason ? ` (${reward.pause_reason})` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Body Content ── */}
      <div className="reward-body flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5",
                reward.reward_type === "FIXED" &&
                  "bg-blue-500/10 text-blue-500 border-blue-500/20",
                reward.reward_type === "POOL" &&
                  "bg-purple-500/10 text-purple-500 border-purple-500/20",
                reward.reward_type === "FILTER" &&
                  "bg-teal-500/10 text-teal-500 border-teal-500/20",
              )}
            >
              {reward.reward_type === "FIXED"
                ? t("public.typeFixed", "Fixed")
                : reward.reward_type === "POOL"
                  ? `${t("public.typePool", "Skin Pool")} (${reward.pool_items?.length ?? 0})`
                  : t("public.typeFilter", "Filter")}
            </Badge>

            {hasLimits && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10"
              >
                {t("public.limits", "Limits")}
              </Badge>
            )}
          </div>

          <h3
            className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors"
            title={reward.twitch_title}
          >
            {reward.twitch_title}
          </h3>

          <div className="text-xs text-muted-foreground truncate">
            {reward.reward_type === "FIXED" && reward.market_item_name ? (
              <a
                href={getCsgoMarketUrl(reward.market_item_name)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary hover:underline inline-flex items-center gap-1 transition-colors truncate max-w-full"
                title={`View "${reward.market_item_name}" on CS2 Market`}
              >
                <span className="truncate">{reward.market_item_name}</span>
                <IconExternalLink />
              </a>
            ) : reward.reward_type === "POOL" ? (
              <span>
                {t("public.skinsInDropPool", {
                  count: reward.pool_items?.length ?? 0,
                })}
              </span>
            ) : reward.reward_type === "FILTER" ? (
              <span>
                {reward.filter_details?.name_contains
                  ? t("public.containsText", {
                      text: reward.filter_details.name_contains,
                    })
                  : t("public.autoMarketFilter", "Automatic market filter")}
              </span>
            ) : null}
          </div>
        </div>

        {/* Price & points footer */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground block font-medium">
              {t("public.channelPoints", "Channel Points")}
            </span>
            {reward.cost_points != null ? (
              <span className="font-mono font-bold text-purple-400 text-xs">
                {reward.cost_points.toLocaleString()} {t("common.pts", "pts")}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">
                {t("public.pointsHidden", "Points hidden")}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block font-medium">
              {t("public.marketEst", "Market Est.")}
            </span>
            {formattedCardPrice ? (
              <span className="font-mono font-semibold text-foreground/90 text-xs">
                {formattedCardPrice}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
