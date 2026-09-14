import BehaviorEditor from "@/components/rewards/BehaviorEditor";
import EffectiveReward from "@/components/rewards/EffectiveReward";
import { isAxiosError } from "axios";
import RewardSummary from "@/components/rewards/RewardSummary";
import { rewardErrors } from "@/components/rewards/validateReward";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, QueryError, EmptyState } from "@/components/common/Page";
import ConfirmAction from "@/components/common/ConfirmAction";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { rewardsApi, broadcastersApi } from "@/lib/apiClient";
import type {
  RewardResponse,
  CreateRewardBody,
  UpdateRewardBody,
  RewardType,
  PriceStrategy,
  PauseReason,
  FilterConfig,
  PoolItemConfig,
  PreviewFilterBody,
  PreviewFilterResponse,
  RewardPurchaseLimitsConfig,
} from "@/types/api";
import { formatMinorCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import RedemptionList from "@/components/redemptions/RedemptionList";
import { config } from "@/config";
import { getShortRewardUrl } from "@/lib/shortUrl";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconLink = () => (
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
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
const IconRefresh = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconPause = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);
const IconPlay = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IconTrash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconClose = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconDownload = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconImage = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconFilter = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const IconPool = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconCheckAll = () => (
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
    <path d="M18 6 7 17l-5-5" />
    <path d="m22 10-7.5 7.5L13 16" />
  </svg>
);

// ── Image helpers ──────────────────────────────────────────────────────────
// Direct CDN URL — for <img> display only (no CORS header, browser shows fine)
function getSkinImageUrl(
  marketItemName: string,
  size: 150 | 300 = 300,
): string {
  return `https://cdn2.csgo.com/item/${encodeURIComponent(marketItemName)}/${size}.png`;
}

// Proxied URL — for canvas pixel access (proxy adds Access-Control-Allow-Origin: *)
function getSkinImageUrlProxied(
  marketItemName: string,
  size: 150 | 300 = 300,
): string {
  const cdnUrl = getSkinImageUrl(marketItemName, size);
  const base = config.API_BASE_URL.replace(/\/$/, "");
  return `${base}/api/v1/proxy/image?url=${encodeURIComponent(cdnUrl)}`;
}

// ── SkinImage: renders skin with center-crop to square ─────────────────────
function SkinImage({
  marketItemName,
  size = 300,
  objectFit = "cover",
  className,
  style,
}: {
  marketItemName: string;
  size?: 150 | 300;
  objectFit?: "cover" | "contain";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const url = getSkinImageUrl(marketItemName, size);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-background/80 to-muted/40 flex items-center justify-center",
        className,
      )}
      style={style}
    >
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-inherit" />
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
          <IconImage />
          <span className="text-[10px]">
            {t("rewards.card.noPreview", "No preview")}
          </span>
        </div>
      )}
      <img
        src={url}
        alt={marketItemName}
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("error")}
        style={{
          display: status === "error" ? "none" : "block",
          width: "100%",
          height: "100%",
          objectFit,
          objectPosition: "center",
          opacity: status === "ok" ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}

// ── SkinIconDownloader: browser-side crop + multi-size download ─────────────
function SkinIconDownloader({
  marketItemName,
  open,
  onClose,
}: {
  marketItemName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildCroppedCanvas = useCallback(
    (targetSize: number): HTMLCanvasElement | null => {
      const src = canvasRef.current;
      if (!src) return null;
      const dst = document.createElement("canvas");
      dst.width = targetSize;
      dst.height = targetSize;
      const ctx = dst.getContext("2d");
      if (!ctx) return null;
      const srcW = src.width;
      const srcH = src.height;
      const cropSide = Math.min(srcW, srcH);
      const offsetX = (srcW - cropSide) / 2;
      const offsetY = (srcH - cropSide) / 2;
      ctx.drawImage(
        src,
        offsetX,
        offsetY,
        cropSide,
        cropSide,
        0,
        0,
        targetSize,
        targetSize,
      );
      return dst;
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setIsReady(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = getSkinImageUrlProxied(marketItemName, 300);
    img.onload = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const preview = buildCroppedCanvas(112);
      if (preview) setPreviewUrl(preview.toDataURL("image/png"));
      setIsReady(true);
      setIsLoading(false);
    };
    img.onerror = () => {
      setError(
        t(
          "rewards.downloader.error",
          "Failed to load skin image. The item name may not match the market exactly.",
        ),
      );
      setIsLoading(false);
    };
  }, [open, marketItemName, buildCroppedCanvas, t]);

  const download = (targetSize: number) => {
    const dst = buildCroppedCanvas(targetSize);
    if (!dst) return;
    const link = document.createElement("a");
    const safeName = marketItemName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.download = `${safeName}_${targetSize}x${targetSize}.png`;
    link.href = dst.toDataURL("image/png");
    link.click();
  };

  const SIZES = [28, 56, 112] as const;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t("rewards.downloader.title", "Download Twitch Panel Icon")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {t(
              "rewards.downloader.description",
              "Center-cropped to a perfect square. Download in the sizes accepted by Twitch reward panels.",
            )}
          </DialogDescription>
        </DialogHeader>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="flex flex-col items-center gap-5 mt-2">
          <div
            className="relative rounded-xl overflow-hidden border border-border shadow-inner"
            style={{ width: 112, height: 112, background: "var(--muted)" }}
          >
            {isLoading && (
              <div className="absolute inset-0 animate-pulse bg-muted/60 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">
                  {t("rewards.downloader.loading", "Loading…")}
                </span>
              </div>
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                width={112}
                height={112}
                style={{ imageRendering: "pixelated", display: "block" }}
              />
            )}
            {!isLoading && !previewUrl && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                <IconImage />
              </div>
            )}
            <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white/80 font-mono">
              112×112
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center max-w-xs leading-relaxed">
              {error}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
            {marketItemName}
          </p>

          <div className="flex items-center gap-2 w-full">
            {SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => download(sz)}
                disabled={!isReady}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 rounded-xl border border-border py-3 px-2 transition-all",
                  "hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed",
                  "text-foreground font-medium",
                )}
              >
                <IconDownload />
                <span className="text-xs tabular-nums">
                  {sz}×{sz}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            {t(
              "rewards.downloader.note",
              "Images are cropped client-side in your browser. Nothing is uploaded.",
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function calcPoolChances(items: PoolItemConfig[]): number[] {
  const total = items.reduce((s, it) => s + (it.weight ?? 0), 0);
  if (total === 0) return items.map(() => 0);
  return items.map((it) => (it.weight / total) * 100);
}

function mostExpensivePoolItem(
  items: PoolItemConfig[],
): PoolItemConfig | undefined {
  return items.reduce<PoolItemConfig | undefined>((best, it) => {
    const price = it.current_market_price ?? 0;
    return best === undefined || price > (best.current_market_price ?? 0)
      ? it
      : best;
  }, undefined);
}

function strategyLabel(s: PriceStrategy): string {
  return s === "AVERAGE" ? "Avg" : s === "MEDIAN" ? "Med" : "Max";
}

// ── Reward Card ────────────────────────────────────────────────────────────
function RewardCard({
  reward,
  selected,
  onToggleSelect,
  onRangeSelect,
  onClick,
}: {
  reward: RewardResponse;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRangeSelect: (id: string) => void;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const formattedPrice = formatMinorCurrency(
    reward.current_market_price,
    reward.currency,
  );
  const type = reward.reward_type ?? "FIXED";
  const isManual = reward.pricing_mode === "MANUAL";

  // Determine preview skin name for POOL
  const poolPreviewSkin =
    type === "POOL" && reward.pool_items?.length
      ? mostExpensivePoolItem(reward.pool_items)?.market_hash_name
      : null;

  const handleCardClick = (e: React.MouseEvent) => {
    if (reward.is_deleted) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button, input")) {
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      onRangeSelect(reward.twitch_id);
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect(reward.twitch_id);
    } else {
      onClick();
    }
  };

  return (
    <div
      data-paused={reward.is_paused}
      data-selected={selected}
      onClick={handleCardClick}
      role="button"
      tabIndex={reward.is_deleted ? -1 : 0}
      aria-disabled={reward.is_deleted}
      aria-label={reward.twitch_title}
      onKeyDown={(e) => {
        if (
          !reward.is_deleted &&
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "reward-tile relative cursor-pointer transition-colors duration-200 group overflow-hidden select-none",
        "hover:border-primary/50 focus-visible:border-primary",
        selected &&
          !reward.is_deleted &&
          "border-primary/80 bg-primary/10 shadow-lg shadow-primary/15 ring-2 ring-primary/50",
        reward.is_paused && !selected && "border-amber-400/25",
        reward.is_deleted && "border-dashed",
      )}
    >
      <div className="relative">
        {/* Skin / type banner */}
        {type === "FIXED" && reward.market_item_name ? (
          <SkinImage
            marketItemName={reward.market_item_name}
            size={300}
            objectFit="contain"
            className="reward-art w-full"
          />
        ) : type === "POOL" && poolPreviewSkin ? (
          <div className="relative">
            <SkinImage
              marketItemName={poolPreviewSkin}
              size={300}
              objectFit="contain"
              className="reward-art w-full"
            />
            <div className="absolute top-2 left-2 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1 flex items-center gap-1.5 text-[10px] text-white/90 font-medium">
              <IconPool />
              {t("rewards.card.poolSkins", {
                count: reward.pool_items?.length ?? 0,
              })}
            </div>
          </div>
        ) : type === "FILTER" ? (
          <div className="reward-art w-full flex flex-col items-center justify-center gap-2 border-b border-border">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <IconFilter />
            </div>
            {reward.filter_config && (
              <span className="text-xs text-muted-foreground font-mono">
                {reward.filter_config.min_price.toFixed(0)} –{" "}
                {reward.filter_config.max_price.toFixed(0)} {reward.currency}
              </span>
            )}
          </div>
        ) : (
          <div className="reward-art w-full flex items-center justify-center text-muted-foreground/30">
            <IconImage />
          </div>
        )}

        <span className="reward-type-stamp">
          {type} / {reward.currency}
        </span>
      </div>
      <div className="reward-body">
        {/* Checkbox */}
        {!reward.is_deleted && (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={`${t("common.select", "Select")} ${reward.twitch_title}`}
            className="absolute top-3 right-3 z-10 p-1 cursor-pointer"
            title={
              selected ? "Deselect (or Ctrl+Click)" : "Select (or Ctrl+Click)"
            }
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) {
                e.preventDefault();
                window.getSelection()?.removeAllRanges();
                onRangeSelect(reward.twitch_id);
              } else {
                onToggleSelect(reward.twitch_id);
              }
            }}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all backdrop-blur-sm",
                selected
                  ? "bg-primary border-primary shadow-sm shadow-primary/30"
                  : "border-white/60 bg-black/30 opacity-100",
              )}
            >
              {selected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {reward.is_paused && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs gap-1",
                reward.pause_reason === "NO_MONEY"
                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  : reward.pause_reason === "PRICE_LIMIT"
                    ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                    : "status-failed-refund",
              )}
              title={
                reward.pause_reason === "NO_MONEY"
                  ? t(
                      "rewards.card.pausedNoMoneyTip",
                      "Paused automatically: insufficient balance on Market",
                    )
                  : reward.pause_reason === "PRICE_LIMIT"
                    ? t(
                        "rewards.card.pausedPriceLimitTip",
                        "Paused automatically: market price exceeded configured limits",
                      )
                    : t("rewards.card.pausedManual", "Paused manually")
              }
            >
              <IconPause />
              {reward.pause_reason === "NO_MONEY"
                ? t("rewards.card.pausedNoMoney", "Paused (No balance)")
                : reward.pause_reason === "PRICE_LIMIT"
                  ? t("rewards.card.pausedPriceLimit", "Paused (Price limit)")
                  : t("rewards.card.pausedGeneral", "Paused")}
            </Badge>
          )}
          {reward.market_autobuy && (
            <Badge variant="outline" className="status-completed text-xs">
              {t("rewards.card.autobuy", "Auto-buy")}
            </Badge>
          )}
          {reward.is_deleted && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t("rewards.card.deleted", "Deleted")}
            </Badge>
          )}
          {isManual && (
            <Badge
              variant="outline"
              className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10"
            >
              {t("rewards.card.manualPrice", "Manual price")}
            </Badge>
          )}
          {reward.is_public === false && (
            <Badge
              variant="outline"
              className="text-xs border-border text-muted-foreground/80 bg-muted/40"
              title={t(
                "rewards.card.privateTip",
                "Hidden from public rewards showcase",
              )}
            >
              {t("rewards.card.private", "Private")}
            </Badge>
          )}
          {((reward.chat_min_messages ?? 0) > 0 ||
            (reward.chat_min_characters ?? 0) > 0) && (
            <Badge
              variant="outline"
              className="text-xs border-violet-500/30 text-violet-400 bg-violet-500/10"
              title="Has Chat Activity Requirements"
            >
              {(reward.chat_min_messages ?? 0) > 0
                ? `${reward.chat_min_messages} msgs`
                : ""}
              {(reward.chat_min_messages ?? 0) > 0 &&
              (reward.chat_min_characters ?? 0) > 0
                ? ` ${reward.chat_logical_operator ?? "AND"} `
                : ""}
              {(reward.chat_min_characters ?? 0) > 0
                ? `${reward.chat_min_characters} chars`
                : ""}
              {(reward.chat_time_window_hours ?? 0) > 0
                ? ` / ${reward.chat_time_window_hours}h`
                : ""}
            </Badge>
          )}
          {((reward.purchase_limits?.user?.length ?? 0) > 0 ||
            (reward.purchase_limits?.global?.length ?? 0) > 0) && (
            <Badge
              variant="outline"
              className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10"
              title={[
                ...(reward.purchase_limits?.user ?? []).map(
                  (u) =>
                    `User: max ${u.max_redemptions}${u.window_hours ? ` / ${u.window_hours}h` : " all-time"}`,
                ),
                ...(reward.purchase_limits?.global ?? []).map(
                  (g) =>
                    `Global: max ${g.max_redemptions}${g.window_hours ? ` / ${g.window_hours}h` : " all-time"}`,
                ),
              ].join("; ")}
            >
              {t("rewards.card.limitsRules", {
                count:
                  (reward.purchase_limits?.user?.length ?? 0) +
                  (reward.purchase_limits?.global?.length ?? 0),
              })}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 pr-6 line-clamp-2">
          {reward.twitch_title}
        </h3>

        {/* Item name / type info */}
        <div className="mb-3">
          {type === "FIXED" && reward.market_item_name ? (
            <a
              href={`https://market.csgo.com/en/?search=${encodeURIComponent(reward.market_item_name)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1 transition-colors max-w-full"
              title={`View "${reward.market_item_name}" on Market`}
            >
              <span className="truncate">{reward.market_item_name}</span>
              <IconExternalLink />
            </a>
          ) : type === "POOL" ? (
            <span className="text-xs text-muted-foreground">
              {t("rewards.card.itemsInPool", {
                count: reward.pool_items?.length ?? 0,
              })}
            </span>
          ) : type === "FILTER" && reward.filter_config ? (
            <span className="text-xs text-muted-foreground">
              {reward.filter_config.name_contains
                ? `"${reward.filter_config.name_contains}"`
                : reward.filter_config.name_prefix
                  ? `${reward.filter_config.name_prefix}…`
                  : t("rewards.card.dynamicFilter", "Dynamic filter")}
            </span>
          ) : null}
        </div>

        {/* Price info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="reward-price">
            <p className="text-xs text-muted-foreground">
              {t("rewards.card.marketPrice", "Market price")}
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formattedPrice}
            </p>
          </div>
          <div className="reward-price">
            {isManual ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("rewards.card.twitchPoints", "Twitch Points")}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {reward.manual_twitch_points != null
                    ? reward.manual_twitch_points.toLocaleString()
                    : "–"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("rewards.card.markup", "Markup")}
                </p>
                <p className="text-sm font-bold tabular-nums text-primary">
                  +{reward.twitch_price_markup_percentage}%
                  {reward.price_strategy && (
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                      {strategyLabel(reward.price_strategy)}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>
            {t("rewards.card.cd", { seconds: reward.global_cooldown_seconds })}
          </span>
          <span>·</span>
          <span>
            {t("rewards.card.maxStream", {
              count: reward.max_redemptions_per_stream,
            })}
          </span>
          <span>·</span>
          <span>
            {t("rewards.card.maxUserStream", {
              count: reward.max_redemptions_per_user_per_stream,
            })}
          </span>
          {(reward.min_market_price != null ||
            reward.max_market_price != null) && (
            <>
              <span>·</span>
              <span
                className="text-amber-400/90"
                title="Market Price Safety Limits"
              >
                {t("rewards.card.priceLimits", {
                  min:
                    reward.min_market_price != null
                      ? formatMinorCurrency(
                          reward.min_market_price,
                          reward.currency,
                        )
                      : "0",
                  max:
                    reward.max_market_price != null
                      ? formatMinorCurrency(
                          reward.max_market_price,
                          reward.currency,
                        )
                      : "∞",
                })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pool Items Editor ──────────────────────────────────────────────────────
function PoolItemsEditor({
  items,
  onChange,
}: {
  items: PoolItemConfig[];
  onChange: (items: PoolItemConfig[]) => void;
}) {
  const { t } = useTranslation();
  const chances = calcPoolChances(items);
  const [openMsgIndices, setOpenMsgIndices] = useState<Record<number, boolean>>(
    {},
  );

  const update = (idx: number, patch: Partial<PoolItemConfig>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const add = () =>
    onChange([
      ...items,
      {
        market_hash_name: "",
        weight: 1,
        permissible_market_price_deviation: 10,
      },
    ]);

  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const isMsgOpen = openMsgIndices[idx] ?? Boolean(it.custom_message);
        return (
          <div
            key={idx}
            className="relative rounded-xl border border-border bg-background/50 p-3 space-y-2.5"
          >
            {/* Header: skin name + chance badge */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="AWP | Asiimov (Field-Tested)"
                  value={it.market_hash_name}
                  onChange={(e) =>
                    update(idx, { market_hash_name: e.target.value })
                  }
                  className="text-sm h-8"
                />
              </div>
              <span className="shrink-0 text-xs font-mono text-primary tabular-nums bg-primary/10 rounded-md px-2 py-1">
                {chances[idx].toFixed(1)}%
              </span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors cursor-pointer"
                title={t("rewards.pool.removeSkin", "Remove")}
              >
                <IconClose />
              </button>
            </div>

            {/* Skin mini-preview if name given */}
            {it.market_hash_name && (
              <div className="flex items-center gap-3">
                <SkinImage
                  marketItemName={it.market_hash_name}
                  size={150}
                  objectFit="contain"
                  className="rounded-lg shrink-0"
                  style={{ width: 56, height: 42 }}
                />
                <a
                  href={`https://market.csgo.com/en/?search=${encodeURIComponent(it.market_hash_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-0.5 max-w-full min-w-0"
                  title={it.market_hash_name}
                >
                  <span className="truncate min-w-0">
                    {it.market_hash_name}
                  </span>
                  <IconExternalLink className="shrink-0" />
                </a>
              </div>
            )}

            {/* Weight + deviation */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t("rewards.pool.weight", "Weight")}
                </Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={it.weight}
                  onChange={(e) =>
                    update(idx, { weight: parseFloat(e.target.value) || 1 })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t("rewards.pool.maxDeviation", "Max deviation %")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={it.permissible_market_price_deviation}
                  onChange={(e) =>
                    update(idx, {
                      permissible_market_price_deviation:
                        parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Custom chat message collapsible section */}
            <div className="pt-1.5 border-t border-border/40">
              <button
                type="button"
                onClick={() =>
                  setOpenMsgIndices((prev) => ({ ...prev, [idx]: !isMsgOpen }))
                }
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-transform duration-150",
                    isMsgOpen && "rotate-90",
                  )}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="font-medium">
                  {t(
                    "rewards.pool.customMessageTitle",
                    "Сообщение в чат при выпадении",
                  )}
                </span>
                {it.custom_message ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/10 font-normal ml-auto"
                  >
                    {t("rewards.pool.customMessageActive", "Кастомное")}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 font-normal ml-auto">
                    ({t("rewards.pool.customMessageDefault", "по умолчанию")})
                  </span>
                )}
              </button>

              {isMsgOpen && (
                <div className="mt-2 space-y-2 rounded-lg bg-muted/20 p-2.5 border border-border/50 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground text-[11px]">
                      {t("rewards.pool.customMessageHint", "Теги для вставки:")}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["buyer", "item", "chance"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const cur = it.custom_message || "";
                            update(idx, {
                              custom_message: cur
                                ? `${cur} {${tag}}`
                                : `{${tag}}`,
                            });
                          }}
                          title={`Click to add {${tag}}`}
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/25 bg-primary/5 hover:bg-primary/15 text-primary cursor-pointer active:scale-95"
                        >
                          <span>{`{${tag}}`}</span>
                          <span className="opacity-50">+</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    rows={2}
                    placeholder={t(
                      "rewards.pool.customMessagePlaceholder",
                      "@{buyer}, твой дроп: {item} (шанс: {chance})! Заказ уже создаётся на маркете, ожидай трейд.",
                    )}
                    value={it.custom_message ?? ""}
                    onChange={(e) =>
                      update(idx, {
                        custom_message: e.target.value ? e.target.value : null,
                      })
                    }
                    className="text-xs h-auto min-h-[56px] resize-y"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
      >
        <IconPlus /> {t("rewards.pool.addSkin", "Add skin to pool")}
      </button>
    </div>
  );
}

// ── Filter Preview Block ───────────────────────────────────────────────────
function FilterPreviewBlock({
  channelId,
  filterConfig,
  priceStrategy,
  markupPct,
}: {
  channelId: string;
  filterConfig: FilterConfig;
  priceStrategy: PriceStrategy | null;
  markupPct: number;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<PreviewFilterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    if (!filterConfig.min_price && !filterConfig.max_price) return;
    setIsLoading(true);
    setError(null);
    try {
      const body: PreviewFilterBody = {
        filter_config: filterConfig,
        price_strategy: priceStrategy ?? null,
        twitch_price_markup_percentage: markupPct || null,
      };
      const res = await rewardsApi.previewFilter(channelId, body);
      setPreview(res.data);
    } catch {
      setError("Failed to load preview. Check filter parameters.");
    } finally {
      setIsLoading(false);
    }
  }, [channelId, filterConfig, priceStrategy, markupPct]);

  // Debounce auto-run on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      run();
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [run]);

  const fmt = (n: number, currency: string) => n.toFixed(2) + " " + currency;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {t("rewards.filterPreview.title", "Filter Preview")}
        </p>
        <button
          type="button"
          onClick={run}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <IconRefresh /> {t("rewards.filterPreview.refresh", "Refresh")}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 flex-1 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {preview && !isLoading && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {preview.total_matching_items}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("rewards.filterPreview.matchingSkins", "matching skins")}
            </span>
            {preview.estimated_twitch_points > 0 && (
              <Badge
                variant="outline"
                className="ml-auto text-xs status-completed"
              >
                ~{preview.estimated_twitch_points.toLocaleString()} pts
              </Badge>
            )}
          </div>

          {/* Price stats */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              {
                label: t("rewards.filterPreview.min", "Min"),
                val: preview.min_price,
              },
              {
                label: t("rewards.filterPreview.avg", "Avg"),
                val: preview.average_price,
              },
              {
                label: t("rewards.filterPreview.median", "Median"),
                val: preview.median_price,
              },
              {
                label: t("rewards.filterPreview.max", "Max"),
                val: preview.max_price,
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="rounded-lg bg-background/60 border border-border px-2 py-2 text-center"
              >
                <p className="text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold tabular-nums">
                  {fmt(val, preview.currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Calculated price */}
          {preview.calculated_market_price > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t(
                  "rewards.filterPreview.calculatedPrice",
                  "Calculated market price",
                )}
              </span>
              <span className="font-bold text-primary tabular-nums">
                {fmt(preview.calculated_market_price, preview.currency)}
              </span>
            </div>
          )}

          {/* Sample skins */}
          {preview.sample_items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("rewards.filterPreview.sampleSkins", {
                    count: preview.sample_items.length,
                  })}
                </p>
                <span className="text-[10px] text-muted-foreground/60">
                  {t(
                    "rewards.filterPreview.clickToView",
                    "Click to view on Market",
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-0.5">
                {preview.sample_items.map((item) => (
                  <a
                    key={item.market_hash_name}
                    href={`https://market.csgo.com/en/?search=${encodeURIComponent(item.market_hash_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.market_hash_name}
                    onClick={(e) => e.stopPropagation()}
                    className="group relative flex flex-col justify-between rounded-lg border border-border bg-background/80 hover:border-primary/50 hover:bg-primary/5 transition-all p-2 overflow-hidden text-left"
                  >
                    <div className="relative w-full h-16 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden mb-1.5">
                      <SkinImage
                        marketItemName={item.market_hash_name}
                        size={150}
                        objectFit="contain"
                        className="w-full h-full group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="space-y-1 w-full">
                      <p
                        className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight min-h-[26px]"
                        title={item.market_hash_name}
                      >
                        {item.market_hash_name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="font-mono font-semibold text-primary">
                          {fmt(item.price, preview.currency)}
                        </span>
                        {item.volume != null && item.volume > 0 && (
                          <span
                            className="text-[10px] text-muted-foreground/70"
                            title={`Volume: ${item.volume}`}
                          >
                            {item.volume}{" "}
                            {t("rewards.filterPreview.pcs", "pcs.")}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!preview && !isLoading && !error && (
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          {t(
            "rewards.filterPreview.setPriceTip",
            "Set min/max price to preview matching skins",
          )}
        </p>
      )}
    </div>
  );
}

// ── Step 1: Type & Skin Config ─────────────────────────────────────────────
function StepTypeAndSkins({
  form,
  onChange,
}: {
  form: Partial<CreateRewardBody>;
  onChange: (patch: Partial<CreateRewardBody>) => void;
}) {
  const { t } = useTranslation();
  const type = form.reward_type ?? "FIXED";

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="space-y-2">
        <Label>{t("rewards.steps.typeTitle", "Reward Type")}</Label>
        <div className="grid grid-cols-3 gap-3">
          {(["FIXED", "POOL", "FILTER"] as RewardType[]).map((tType) => (
            <button
              key={tType}
              type="button"
              onClick={() => onChange({ reward_type: tType })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all text-sm font-medium",
                type === tType
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground",
              )}
            >
              {tType === "FIXED" ? (
                <IconImage />
              ) : tType === "POOL" ? (
                <IconPool />
              ) : (
                <IconFilter />
              )}
              <span className="text-xs">
                {tType === "FIXED"
                  ? t("rewards.pool.fixedSkin", "Fixed Skin")
                  : tType === "POOL"
                    ? t("rewards.pool.skinPool", "Skin Pool")
                    : t("rewards.pool.filter", "Filter")}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {type === "FIXED"
            ? t(
                "rewards.steps.fixedDesc",
                "One specific skin. A fixed market item will be purchased when redeemed.",
              )
            : type === "POOL"
              ? t(
                  "rewards.steps.poolDesc",
                  "A weighted pool of skins. A random skin is picked from the pool on each redemption.",
                )
              : t(
                  "rewards.steps.filterDesc",
                  "A dynamic filter matching skins by price range and name. Any matching skin can be purchased.",
                )}
        </p>
      </div>

      {/* FIXED: item name */}
      {type === "FIXED" && (
        <div className="space-y-2">
          <Label htmlFor="market_item_name">
            {t("rewards.steps.marketItemName", "Market Item Name")}
          </Label>
          <Input
            id="market_item_name"
            placeholder="AWP | Asiimov (Field-Tested)"
            value={form.market_item_name ?? ""}
            onChange={(e) => onChange({ market_item_name: e.target.value })}
          />
          {form.market_item_name && (
            <SkinImage
              marketItemName={form.market_item_name}
              size={300}
              objectFit="contain"
              className="w-full rounded-xl mt-2"
              style={{ height: 140 }}
            />
          )}
        </div>
      )}

      {/* POOL: items editor */}
      {type === "POOL" && (
        <div className="space-y-2">
          <Label>{t("rewards.steps.poolItems", "Pool Items")}</Label>
          <PoolItemsEditor
            items={form.pool_items ?? []}
            onChange={(items) => onChange({ pool_items: items })}
          />
        </div>
      )}

      {/* FILTER: filter config */}
      {type === "FILTER" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter_min">
                {t(
                  "rewards.steps.minPriceCurrency",
                  "Min Price (in currency units)",
                )}
              </Label>
              <Input
                id="filter_min"
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={form.filter_config?.min_price ?? ""}
                onChange={(e) =>
                  onChange({
                    filter_config: {
                      ...(form.filter_config ?? { min_price: 0, max_price: 0 }),
                      min_price: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter_max">
                {t(
                  "rewards.steps.maxPriceCurrency",
                  "Max Price (in currency units)",
                )}
              </Label>
              <Input
                id="filter_max"
                type="number"
                min={0}
                step={0.01}
                placeholder="100"
                value={form.filter_config?.max_price ?? ""}
                onChange={(e) =>
                  onChange({
                    filter_config: {
                      ...(form.filter_config ?? { min_price: 0, max_price: 0 }),
                      max_price: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter_contains">
              {t("rewards.steps.nameContains", "Name Contains (optional)")}
            </Label>
            <Input
              id="filter_contains"
              placeholder="Asiimov"
              value={form.filter_config?.name_contains ?? ""}
              onChange={(e) =>
                onChange({
                  filter_config: {
                    ...(form.filter_config ?? { min_price: 0, max_price: 0 }),
                    name_contains: e.target.value || null,
                  },
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter_prefix">
                {t("rewards.steps.namePrefix", "Name Prefix (optional)")}
              </Label>
              <Input
                id="filter_prefix"
                placeholder="AWP |"
                value={form.filter_config?.name_prefix ?? ""}
                onChange={(e) =>
                  onChange({
                    filter_config: {
                      ...(form.filter_config ?? { min_price: 0, max_price: 0 }),
                      name_prefix: e.target.value || null,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter_volume">
                {t("rewards.steps.minVolume", "Min Volume (optional)")}
              </Label>
              <Input
                id="filter_volume"
                type="number"
                min={0}
                placeholder="0"
                value={form.filter_config?.min_volume ?? ""}
                onChange={(e) =>
                  onChange({
                    filter_config: {
                      ...(form.filter_config ?? { min_price: 0, max_price: 0 }),
                      min_volume: parseInt(e.target.value) || null,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-step Reward Wizard ───────────────────────────────────────────────
function RewardWizard({
  initial,
  channelId,
  onSubmit,
  loading,
  isEdit,
  draftKey,
  currency,
}: {
  initial?: Partial<CreateRewardBody>;
  channelId: string;
  onSubmit: (data: CreateRewardBody) => void;
  loading: boolean;
  isEdit: boolean;
  draftKey: string;
  currency?: string;
}) {
  const { t } = useTranslation();
  const c = useCopy();
  const balance = useQuery({
    queryKey: ["balance", channelId],
    queryFn: () => broadcastersApi.getBalance(channelId).then((r) => r.data),
    enabled: !currency,
    staleTime: 60_000,
  });
  const activeCurrency = currency || balance.data?.currency;
  const [step, setStep] = useState(isEdit ? 1 : 0);
  const [errors, setErrors] = useState<string[]>([]);
  const [restored, setRestored] = useState(() => {
    try {
      return !!sessionStorage.getItem(draftKey);
    } catch {
      return false;
    }
  });
  const stages = [
    c("Choose items", "Выбор предметов"),
    c("Configure behavior", "Настройка поведения"),
    c("Review & save", "Проверка и сохранение"),
  ];
  const defaults: Partial<CreateRewardBody> = {
    reward_type: "FIXED",
    pricing_mode: "AUTO",
    price_strategy: "AVERAGE",
    twitch_price_markup_percentage: 50,
    permissible_market_price_deviation: 10,
    global_cooldown_seconds: 60,
    max_redemptions_per_stream: 0,
    max_redemptions_per_user_per_stream: 0,
    market_autobuy: true,
    is_paused: false,
    min_market_price: null,
    max_market_price: null,
    chat_min_messages: null,
    chat_min_characters: null,
    chat_time_window_hours: null,
    chat_logical_operator: "AND",
    refund_if_chat_req_failed: true,
    purchase_limits: null,
    is_public: true,
    ...initial,
  };
  const [changes, setChanges] = useState<Partial<CreateRewardBody>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || "{}");
    } catch {
      return {};
    }
  });
  const form = { ...defaults, ...changes };
  const [resetOpen, setResetOpen] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors.length) errorRef.current?.focus();
  }, [errors]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (Object.keys(changes).length) event.preventDefault();
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [changes]);
  const patch = (change: Partial<CreateRewardBody>) => {
    const next = { ...changes, ...change };
    setChanges(next);
    setErrors([]);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      /* Form remains usable. */
    }
  };
  const check = (stage: "items" | "all") => {
    const found = rewardErrors(form, stage);
    setErrors(found);
    return found.length === 0;
  };
  const errorCopy: Record<string, string> = {
    item: c("Choose a market item.", "Выберите предмет маркета."),
    pool: c(
      "Add pool items with names, positive weights and deviations from 0–100%.",
      "Укажите предметы пула, положительные веса и отклонения 0–100%.",
    ),
    filter: c(
      "Set a valid price range: minimum must not exceed maximum.",
      "Укажите диапазон цен: минимум не должен превышать максимум.",
    ),
    title: c(
      "Enter a reward title (1–45 characters).",
      "Укажите название (1–45 символов).",
    ),
    description: c(
      "Keep the description within 200 characters.",
      "Описание должно содержать не более 200 символов.",
    ),
    points: c(
      "Channel Points must be a positive whole number.",
      "Баллы должны быть положительным целым числом.",
    ),
    pricing: c(
      "Check the markup, deviation and price safety range.",
      "Проверьте наценку, отклонение и диапазон защиты цен.",
    ),
    limits: c(
      "Limits must be whole numbers; custom limits and windows must be greater than zero.",
      "Лимиты должны быть целыми; пользовательские лимиты и окна должны быть больше нуля.",
    ),
  };

  const handleSubmit = () => {
    if (!check("all") || loading) return;
    const hasUserLimits = (form.purchase_limits?.user?.length ?? 0) > 0;
    const hasGlobalLimits = (form.purchase_limits?.global?.length ?? 0) > 0;
    let purchaseLimitsPayload: RewardPurchaseLimitsConfig | null = null;
    if (isEdit) {
      purchaseLimitsPayload = {
        global: hasGlobalLimits ? (form.purchase_limits?.global ?? []) : [],
        user: hasUserLimits ? (form.purchase_limits?.user ?? []) : [],
      };
    } else if (hasUserLimits || hasGlobalLimits) {
      purchaseLimitsPayload = {
        ...(hasGlobalLimits ? { global: form.purchase_limits?.global } : {}),
        ...(hasUserLimits ? { user: form.purchase_limits?.user } : {}),
      };
    } else {
      purchaseLimitsPayload = null;
    }

    const body: CreateRewardBody = {
      reward_type: form.reward_type ?? "FIXED",
      pricing_mode: form.pricing_mode ?? "AUTO",
      price_strategy: form.price_strategy ?? null,
      manual_twitch_points: form.manual_twitch_points ?? null,
      market_item_name:
        form.reward_type === "FIXED" ? (form.market_item_name ?? null) : null,
      pool_items:
        form.reward_type === "POOL" ? (form.pool_items ?? null) : null,
      filter_config:
        form.reward_type === "FILTER" ? (form.filter_config ?? null) : null,
      twitch_title: form.twitch_title ?? "",
      twitch_description: form.twitch_description ?? "",
      min_market_price: form.min_market_price ?? null,
      max_market_price: form.max_market_price ?? null,
      permissible_market_price_deviation:
        form.permissible_market_price_deviation ?? 10,
      twitch_price_markup_percentage: form.twitch_price_markup_percentage ?? 50,
      global_cooldown_seconds: form.global_cooldown_seconds ?? 60,
      max_redemptions_per_stream: form.max_redemptions_per_stream ?? 0,
      max_redemptions_per_user_per_stream:
        form.max_redemptions_per_user_per_stream ?? 0,
      market_autobuy: form.market_autobuy ?? true,
      is_paused: form.is_paused ?? false,
      chat_min_messages:
        form.chat_min_messages != null && form.chat_min_messages > 0
          ? form.chat_min_messages
          : 0,
      chat_min_characters:
        form.chat_min_characters != null && form.chat_min_characters > 0
          ? form.chat_min_characters
          : 0,
      chat_time_window_hours:
        form.chat_time_window_hours != null && form.chat_time_window_hours > 0
          ? form.chat_time_window_hours
          : 0,
      chat_logical_operator: form.chat_logical_operator ?? "AND",
      refund_if_chat_req_failed: form.refund_if_chat_req_failed ?? true,
      purchase_limits: purchaseLimitsPayload,
      is_public: form.is_public ?? true,
    };
    if (isEdit) {
      const keys = new Set(Object.keys(changes));
      if (keys.has("reward_type"))
        ["market_item_name", "pool_items", "filter_config"].forEach((key) =>
          keys.add(key),
        );
      onSubmit(
        Object.fromEntries(
          Object.entries(body).filter(([key]) => keys.has(key)),
        ) as CreateRewardBody,
      );
    } else onSubmit(body);
  };

  return (
    <div className="reward-builder">
      <ConfirmAction
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setChanges({});
          setDraftRevision((value) => value + 1);
          setErrors([]);
          setStep(isEdit ? 1 : 0);
          setRestored(false);
          try {
            sessionStorage.removeItem(draftKey);
          } catch {
            /* optional storage */
          }
          setResetOpen(false);
        }}
        title={c("Discard this draft?", "Удалить черновик?")}
        description={c(
          "Your unsaved reward changes will be removed. The saved reward will not change.",
          "Несохранённые изменения будут удалены. Сохранённая награда не изменится.",
        )}
        label={c("Discard draft", "Удалить черновик")}
        destructive
      />
      <div className="builder-workspace">
        <nav
          className="wizard-progress"
          aria-label={c("Reward setup", "Настройка награды")}
        >
          {stages.map((title, index) => (
            <button
              key={title}
              type="button"
              aria-current={step === index ? "step" : undefined}
              onClick={() => {
                if (index < step || check(index === 1 ? "items" : "all"))
                  setStep(index);
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{title}</span>
            </button>
          ))}
        </nav>
        <div className="flex justify-between items-center gap-3 text-xs text-muted-foreground py-3">
          <span>
            {restored
              ? c(
                  "Draft restored in this browser tab",
                  "Черновик восстановлен в этой вкладке",
                )
              : c(
                  "Changes stay in this tab until saved",
                  "Изменения остаются в этой вкладке до сохранения",
                )}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)}>
            {c("Reset draft", "Сбросить черновик")}
          </Button>
        </div>
        {errors.length > 0 && (
          <div
            role="alert"
            ref={errorRef}
            tabIndex={-1}
            className="builder-errors"
          >
            <strong>{c("Before continuing", "Перед продолжением")}</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{errorCopy[error]}</li>
              ))}
            </ul>
          </div>
        )}
        <fieldset disabled={loading} className="space-y-6 min-w-0">
          {step === 0 && (
            <>
              <div className="wizard-heading">
                <h3>
                  {c("What will viewers receive?", "Что получит зритель?")}
                </h3>
                <p>
                  {c(
                    "Choose an exact item, a weighted drop pool, or a market filter.",
                    "Выберите предмет, пул с весами или фильтр маркета.",
                  )}
                </p>
              </div>
              <StepTypeAndSkins form={form} onChange={patch} />
            </>
          )}
          {step === 1 && (
            <BehaviorEditor
              key={draftRevision}
              form={form}
              onChange={patch}
              isEdit={isEdit}
              currency={activeCurrency}
              errors={errors}
              preview={
                form.reward_type === "FILTER" && form.filter_config ? (
                  <FilterPreviewBlock
                    channelId={channelId}
                    filterConfig={form.filter_config}
                    priceStrategy={
                      form.pricing_mode === "AUTO"
                        ? (form.price_strategy ?? "AVERAGE")
                        : null
                    }
                    markupPct={
                      form.pricing_mode === "AUTO"
                        ? (form.twitch_price_markup_percentage ?? 50)
                        : 0
                    }
                  />
                ) : undefined
              }
            />
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="wizard-heading">
                <h3>
                  {c("Ready for your channel?", "Всё готово для канала?")}
                </h3>
                <p>
                  {isEdit
                    ? c(
                        "Saving updates this reward on Twitch and changes future redemption behavior.",
                        "Сохранение обновит награду Twitch и поведение будущих активаций.",
                      )
                    : c(
                        "Creating this reward publishes it to Twitch with the availability shown below.",
                        "Создание опубликует награду в Twitch с указанной ниже доступностью.",
                      )}
                </p>
              </div>
              <RewardSummary value={form} currency={activeCurrency} />
            </div>
          )}
        </fieldset>
        <div className="builder-footer">
          <Button
            variant="outline"
            disabled={step === 0 || loading}
            onClick={() => setStep(step - 1)}
          >
            {c("Back", "Назад")}
          </Button>
          {step < 2 ? (
            <Button
              disabled={loading}
              onClick={() => {
                if (check(step === 0 ? "items" : "all")) setStep(step + 1);
              }}
            >
              {step === 0
                ? c("Configure reward", "Настроить награду")
                : c("Review reward", "Проверить награду")}
            </Button>
          ) : (
            <Button disabled={loading} onClick={handleSubmit}>
              {loading
                ? t("rewards.saving")
                : isEdit
                  ? t("rewards.saveChanges")
                  : t("rewards.createReward")}
            </Button>
          )}
        </div>
      </div>
      {step !== 2 && (
        <aside className="builder-preview">
          <RewardSummary value={form} currency={activeCurrency} />
        </aside>
      )}
    </div>
  );
}

// ── Edit Dialog (Full-page) ────────────────────────────────────────────────
function RewardEditDialog({
  reward,
  channelId,
  open,
  onClose,
}: {
  reward: RewardResponse | null;
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: UpdateRewardBody) =>
      rewardsApi.update(channelId, reward!.twitch_id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: () => rewardsApi.updatePrice(channelId, reward!.twitch_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => rewardsApi.delete(channelId, reward!.twitch_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      onClose();
    },
  });

  const [detailTab, setDetailTab] = useState("overview");
  const c = useCopy();
  const userId = useAppStore((state) => state.currentUser?.twitch_id);
  const draftKey = `reward-draft:v2:${userId}:${channelId}:${reward?.twitch_id}`;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showIconDownloader, setShowIconDownloader] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  const { broadcasters } = useAppStore();
  const currentBroadcaster = broadcasters.find(
    (b) => b.channel_id === channelId,
  );
  const channelLogin = currentBroadcaster?.channel_login || channelId;
  const shortUrl = reward
    ? getShortRewardUrl(channelLogin, reward.twitch_id)
    : "";

  if (!reward) return null;

  const type = reward.reward_type ?? "FIXED";
  const iconDownloadSkin =
    type === "FIXED"
      ? (reward.market_item_name ?? null)
      : type === "POOL" && reward.pool_items?.length
        ? (mostExpensivePoolItem(reward.pool_items)?.market_hash_name ?? null)
        : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) =>
          !o &&
          !updateMutation.isPending &&
          !deleteMutation.isPending &&
          !updatePriceMutation.isPending &&
          onClose()
        }
      >
        <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg">
                  {reward.twitch_title}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-mono",
                    type === "FIXED"
                      ? "border-slate-500/30 text-slate-400"
                      : type === "POOL"
                        ? "border-violet-500/30 text-violet-400"
                        : "border-cyan-500/30 text-cyan-400",
                  )}
                >
                  {type}
                </Badge>
                {reward.pricing_mode === "MANUAL" && (
                  <Badge
                    variant="outline"
                    className="text-xs border-blue-500/30 text-blue-400"
                  >
                    {t("rewards.card.manualPrice", "Manual price")}
                  </Badge>
                )}
              </div>
              {reward.is_paused && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs gap-1",
                    reward.pause_reason === "NO_MONEY"
                      ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      : reward.pause_reason === "PRICE_LIMIT"
                        ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                        : "status-failed-refund",
                  )}
                >
                  <IconPause />
                  {reward.pause_reason === "NO_MONEY"
                    ? t("rewards.card.pausedNoMoney", "Paused (No balance)")
                    : reward.pause_reason === "PRICE_LIMIT"
                      ? t(
                          "rewards.card.pausedPriceLimit",
                          "Paused (Price limit)",
                        )
                      : t("rewards.card.pausedGeneral", "Paused")}
                </Badge>
              )}
            </div>
            <DialogDescription className="flex items-center gap-1.5 flex-wrap mt-1">
              {type === "FIXED" && reward.market_item_name ? (
                <a
                  href={`https://market.csgo.com/en/?search=${encodeURIComponent(reward.market_item_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-medium max-w-full min-w-0"
                  title={reward.market_item_name}
                >
                  <span className="truncate min-w-0">
                    {reward.market_item_name}
                  </span>
                  <IconExternalLink className="shrink-0" />
                </a>
              ) : type === "POOL" ? (
                <span>
                  {t("rewards.card.itemsInPool", {
                    count: reward.pool_items?.length ?? 0,
                  })}
                </span>
              ) : type === "FILTER" && reward.filter_config ? (
                <span>
                  Filter: {reward.filter_config.min_price.toFixed(2)} –{" "}
                  {reward.filter_config.max_price.toFixed(2)} {reward.currency}
                </span>
              ) : null}
              <span>·</span>
              <span>
                {formatMinorCurrency(
                  reward.current_market_price,
                  reward.currency,
                )}
              </span>
              {reward.price_strategy && (
                <>
                  <span>·</span>
                  <span className="text-muted-foreground">
                    {strategyLabel(reward.price_strategy)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Action bar */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 mt-2",
              detailTab === "edit" && "max-sm:hidden",
            )}
          >
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => updatePriceMutation.mutate()}
              disabled={
                updateMutation.isPending ||
                updatePriceMutation.isPending ||
                deleteMutation.isPending ||
                detailTab === "edit"
              }
            >
              <IconRefresh />
              {t("rewards.updatePrice", "Update Price")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() =>
                updateMutation.mutate({ is_paused: !reward.is_paused })
              }
              disabled={
                updateMutation.isPending ||
                updatePriceMutation.isPending ||
                deleteMutation.isPending ||
                detailTab === "edit"
              }
            >
              {reward.is_paused ? <IconPlay /> : <IconPause />}
              {reward.is_paused
                ? t("rewards.unpauseReward", "Unpause")
                : t("rewards.pauseReward", "Pause")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
              onClick={() => {
                setConfirmDelete(true);
              }}
              disabled={
                updateMutation.isPending ||
                updatePriceMutation.isPending ||
                deleteMutation.isPending ||
                detailTab === "edit"
              }
            >
              <IconTrash />
              {t("rewards.deleteReward", "Delete")}
            </Button>
            {iconDownloadSkin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setShowIconDownloader(true)}
              >
                <IconDownload />
                {t("rewards.downloadIcon", "Download Icon")}
              </Button>
            )}
            {shortUrl && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-medium"
                onClick={() => {
                  navigator.clipboard.writeText(shortUrl);
                  setShortCopied(true);
                  setTimeout(() => setShortCopied(false), 2000);
                }}
                title={shortUrl}
              >
                {shortCopied ? (
                  <IconCheck className="text-emerald-400" />
                ) : (
                  <IconLink />
                )}
                <span>
                  {shortCopied
                    ? t("rewards.shortLinkCopied", "Link Copied!")
                    : t("rewards.copyShortLink", "Short Link")}
                </span>
              </Button>
            )}
          </div>

          <Separator className="my-2" />

          <ConfirmAction
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={() => {
              if (!deleteMutation.isPending) deleteMutation.mutate();
            }}
            pending={deleteMutation.isPending}
            destructive
            title={t("rewards.deleteConfirmSingle", {
              title: reward.twitch_title,
            })}
            description={t("ops.deleteRewardDesc")}
            label={t("common.delete")}
          />
          <Tabs
            value={detailTab}
            onValueChange={(value) => setDetailTab(String(value))}
            className="w-full min-w-0"
          >
            <TabsList className="reward-detail-tabs w-full justify-start">
              <TabsTrigger value="overview">
                {t("rewards.tabs.overview", "Overview")}
              </TabsTrigger>
              <TabsTrigger value="edit">
                {t("rewards.tabs.edit", "Edit Reward")}
              </TabsTrigger>
              <TabsTrigger value="redemptions">
                {t("rewards.tabs.redemptions", "Recent Redemptions")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-5 min-w-0">
              <div className="reward-overview-layout">
                <RewardSummary value={reward} currency={reward.currency} />
                <section>
                  <h3 className="section-title">
                    {c("Recent activity", "Последние активации")}
                  </h3>
                  <RedemptionList
                    channelId={channelId}
                    rewardId={reward.twitch_id}
                    pageSize={5}
                    compact
                  />
                </section>
              </div>
              <EffectiveReward
                reward={reward}
                preview={
                  reward.filter_config ? (
                    <FilterPreviewBlock
                      channelId={channelId}
                      filterConfig={reward.filter_config}
                      priceStrategy={reward.price_strategy ?? null}
                      markupPct={reward.twitch_price_markup_percentage}
                    />
                  ) : undefined
                }
              />
            </TabsContent>

            <TabsContent value="edit" className="mt-4 min-w-0">
              <RewardWizard
                initial={{
                  reward_type: reward.reward_type,
                  pricing_mode: reward.pricing_mode,
                  price_strategy: reward.price_strategy ?? undefined,
                  manual_twitch_points:
                    reward.manual_twitch_points ?? undefined,
                  market_item_name: reward.market_item_name ?? undefined,
                  pool_items: reward.pool_items ?? undefined,
                  filter_config: reward.filter_config ?? undefined,
                  twitch_title: reward.twitch_title,
                  twitch_description: reward.twitch_description,
                  min_market_price: reward.min_market_price ?? undefined,
                  max_market_price: reward.max_market_price ?? undefined,
                  permissible_market_price_deviation:
                    reward.permissible_market_price_deviation,
                  twitch_price_markup_percentage:
                    reward.twitch_price_markup_percentage,
                  global_cooldown_seconds: reward.global_cooldown_seconds,
                  max_redemptions_per_stream: reward.max_redemptions_per_stream,
                  max_redemptions_per_user_per_stream:
                    reward.max_redemptions_per_user_per_stream,
                  market_autobuy: reward.market_autobuy,
                  is_paused: reward.is_paused,
                  chat_min_messages:
                    reward.chat_min_messages && reward.chat_min_messages > 0
                      ? reward.chat_min_messages
                      : undefined,
                  chat_min_characters:
                    reward.chat_min_characters && reward.chat_min_characters > 0
                      ? reward.chat_min_characters
                      : undefined,
                  chat_time_window_hours:
                    reward.chat_time_window_hours &&
                    reward.chat_time_window_hours > 0
                      ? reward.chat_time_window_hours
                      : undefined,
                  chat_logical_operator:
                    reward.chat_logical_operator ?? undefined,
                  refund_if_chat_req_failed:
                    reward.refund_if_chat_req_failed ?? true,
                  purchase_limits: reward.purchase_limits ?? undefined,
                  is_public: reward.is_public ?? true,
                }}
                channelId={channelId}
                onSubmit={(data) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { is_paused: _, ...updateData } = data;
                  updateMutation.mutate(updateData as UpdateRewardBody, {
                    onSuccess: () => {
                      try {
                        sessionStorage.removeItem(draftKey);
                      } catch {
                        /* optional storage */
                      }
                      setDetailTab("overview");
                    },
                  });
                }}
                loading={updateMutation.isPending}
                draftKey={draftKey}
                currency={reward.currency}
                isEdit={true}
              />
            </TabsContent>

            <TabsContent value="redemptions" className="mt-4">
              <RedemptionList
                channelId={channelId}
                rewardId={reward.twitch_id}
                compact
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {iconDownloadSkin && (
        <SkinIconDownloader
          marketItemName={iconDownloadSkin}
          open={showIconDownloader}
          onClose={() => setShowIconDownloader(false)}
        />
      )}
    </>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────
function rewardSaveError(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Unable to save reward";
}

function CreateRewardModal({
  channelId,
  open,
  onClose,
}: {
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const userId = useAppStore((state) => state.currentUser?.twitch_id);
  const draftKey = `reward-draft:v2:${userId}:${channelId}:new`;
  const createMutation = useMutation({
    mutationFn: (body: CreateRewardBody) => rewardsApi.create(channelId, body),
    onSuccess: () => {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* optional storage */
      }
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !createMutation.isPending && onClose()}
    >
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {t("rewards.wizard.createTitle", "Create New Reward")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "rewards.wizard.createDesc",
              "Choose the type of skin reward and configure pricing for your channel.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <RewardWizard
            channelId={channelId}
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
            draftKey={draftKey}
            isEdit={false}
          />
          {createMutation.error && (
            <p className="text-sm text-destructive mt-3">
              {rewardSaveError(createMutation.error)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Action Bar ────────────────────────────────────────────────────────
function BulkActionBar({
  count,
  allFilteredSelected,
  hasSelectable = true,
  onSelectAll,
  onPause,
  onUnpause,
  onDelete,
  onClear,
  loading,
}: {
  count: number;
  allFilteredSelected: boolean;
  hasSelectable?: boolean;
  onSelectAll: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onDelete: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 px-4 rounded-xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-[95vw] overflow-x-auto">
      <div className="flex items-center gap-2 pr-1">
        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
          {count}{" "}
          <span className="text-muted-foreground font-normal">
            {t("rewards.bulk.selected", "selected")}
          </span>
        </span>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8 bg-background/60 hover:bg-background shrink-0"
        onClick={onSelectAll}
        disabled={allFilteredSelected || !hasSelectable || loading}
        title="Select all matching rewards"
      >
        <IconCheckAll />
        <span>
          {allFilteredSelected
            ? t("rewards.bulk.allSelected", "All selected")
            : t("rewards.bulk.selectAll", "Select all")}
        </span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8 bg-background/60 hover:bg-background shrink-0"
        onClick={onPause}
        disabled={loading}
      >
        <IconPause />
        <span>{t("rewards.bulk.pauseAll", "Pause all")}</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8 bg-background/60 hover:bg-background shrink-0"
        onClick={onUnpause}
        disabled={loading}
      >
        <IconPlay />
        <span>{t("rewards.bulk.unpauseAll", "Unpause all")}</span>
      </Button>

      <Button
        size="sm"
        variant="destructive"
        className="gap-1.5 text-xs h-8 shrink-0"
        onClick={onDelete}
        disabled={loading}
      >
        <IconTrash />
        <span>{t("rewards.bulk.deleteAll", "Delete all")}</span>
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground shrink-0"
        onClick={onClear}
        title="Clear selection (Esc)"
      >
        <IconClose />
        <span>{t("rewards.bulk.clear", "Clear")}</span>
        <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted/60 text-muted-foreground rounded border border-border">
          Esc
        </kbd>
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RewardsPage() {
  const { t } = useTranslation();
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterPaused, setFilterPaused] = useState<"all" | "paused" | "active">(
    "all",
  );
  const [filterPauseReason, setFilterPauseReason] = useState<
    "all" | PauseReason
  >("all");
  const [filterType, setFilterType] = useState<"all" | RewardType>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  const [editingReward, setEditingReward] = useState<RewardResponse | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState(false);

  const {
    data: rewards = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["rewards", channelId, showDeleted],
    queryFn: () =>
      rewardsApi
        .list(channelId, { is_deleted: showDeleted ? null : false })
        .then((r) => r.data),
    enabled: !!channelId,
  });

  const batchMutation = useMutation({
    mutationFn: (action: "pause" | "unpause" | "delete") =>
      rewardsApi.batch(channelId, {
        action,
        reward_ids: Array.from(selectedIds),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      setConfirmBatch(false);
      setSelectedIds(new Set());
      lastSelectedIdRef.current = null;
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rewards.filter((r) => {
      if (filterPaused === "paused") {
        if (!r.is_paused) return false;
        if (filterPauseReason !== "all") {
          if (filterPauseReason === "MANUAL") {
            if (r.pause_reason && r.pause_reason !== "MANUAL") return false;
          } else if (r.pause_reason !== filterPauseReason) {
            return false;
          }
        }
      } else if (filterPaused === "active") {
        if (r.is_paused) return false;
      }
      if (filterType !== "all" && (r.reward_type ?? "FIXED") !== filterType)
        return false;
      if (!q) return true;
      return (
        r.twitch_title.toLowerCase().includes(q) ||
        (r.market_item_name ?? "").toLowerCase().includes(q) ||
        r.twitch_description.toLowerCase().includes(q)
      );
    });
  }, [rewards, search, filterPaused, filterPauseReason, filterType]);

  const handleToggleSelect = useCallback(
    (id: string) => {
      const r = rewards.find((item) => item.twitch_id === id);
      if (r?.is_deleted) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastSelectedIdRef.current = id;
    },
    [rewards],
  );

  const handleRangeSelect = useCallback(
    (targetId: string) => {
      const targetReward = filtered.find((r) => r.twitch_id === targetId);
      if (!targetReward || targetReward.is_deleted) return;

      const targetIndex = filtered.findIndex((r) => r.twitch_id === targetId);
      if (targetIndex === -1) return;

      const anchorId = lastSelectedIdRef.current;
      let anchorIndex = anchorId
        ? filtered.findIndex((r) => r.twitch_id === anchorId)
        : -1;

      if (anchorIndex === -1) {
        const visibleSelectedIndices = filtered
          .map((r, idx) =>
            !r.is_deleted && selectedIds.has(r.twitch_id) ? idx : -1,
          )
          .filter((idx) => idx !== -1);

        if (visibleSelectedIndices.length > 0) {
          anchorIndex = visibleSelectedIndices.reduce((prev, curr) =>
            Math.abs(curr - targetIndex) < Math.abs(prev - targetIndex)
              ? curr
              : prev,
          );
        } else {
          anchorIndex = targetIndex;
        }
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);

      const rangeIds = filtered
        .slice(start, end + 1)
        .filter((r) => !r.is_deleted)
        .map((r) => r.twitch_id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const rid of rangeIds) {
          next.add(rid);
        }
        return next;
      });

      lastSelectedIdRef.current = targetId;
    },
    [filtered, selectedIds],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered
        .filter((r) => !r.is_deleted)
        .forEach((r) => next.add(r.twitch_id));
      return next;
    });
  }, [filtered]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // Clean up selectedIds if any selected reward became deleted
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let hasDeleted = false;
      const next = new Set<string>();
      for (const id of prev) {
        const item = rewards.find((r) => r.twitch_id === id);
        if (item?.is_deleted) {
          hasDeleted = true;
        } else {
          next.add(id);
        }
      }
      return hasDeleted ? next : prev;
    });
  }, [rewards]);

  const selectableFiltered = useMemo(
    () => filtered.filter((r) => !r.is_deleted),
    [filtered],
  );

  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((r) => selectedIds.has(r.twitch_id));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingReward || showCreate) return;

      if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleClearSelection();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable;
        if (!isInput && selectableFiltered.length > 0) {
          e.preventDefault();
          handleSelectAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editingReward,
    showCreate,
    selectedIds.size,
    selectableFiltered.length,
    handleClearSelection,
    handleSelectAll,
  ]);

  if (!channelId) {
    return (
      <div className="page-shell flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">
          {t(
            "rewards.selectChannelFirst",
            "Select a broadcaster channel first.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 pb-28">
      <PageHeader
        eyebrow={t("ops.configuration")}
        title={t("rewards.title")}
        description={t("ops.rewardDesc")}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <IconPlus />
            {t("rewards.newReward")}
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">
        {t("rewards.countRewards", { count: filtered.length })}
      </p>
      {/* Filters */}
      <div className="reward-toolbar flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <IconSearch />
          </span>
          <Input
            className="pl-9"
            aria-label={t("rewards.searchPlaceholder")}
            placeholder={t(
              "rewards.searchPlaceholder",
              "Search by title, skin, description…",
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="reward-filter-group">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              aria-pressed={filterPaused === f}
              onClick={() => {
                setFilterPaused(f);
                if (f !== "paused") setFilterPauseReason("all");
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                filterPaused === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all"
                ? t("rewards.status.all", "all")
                : f === "active"
                  ? t("rewards.status.active", "active")
                  : t("rewards.status.paused", "paused")}
            </button>
          ))}
        </div>

        {/* Pause reason filter (visible when paused is selected) */}
        {filterPaused === "paused" && (
          <div className="reward-filter-group">
            {(
              [
                {
                  key: "all",
                  label: t("rewards.pauseReasonFilter.all", "All reasons"),
                },
                {
                  key: "MANUAL",
                  label: t("rewards.pauseReasonFilter.manual", "Manual"),
                },
                {
                  key: "NO_MONEY",
                  label: t("rewards.pauseReasonFilter.noMoney", "No balance"),
                },
                {
                  key: "PRICE_LIMIT",
                  label: t(
                    "rewards.pauseReasonFilter.priceLimit",
                    "Price limit",
                  ),
                },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                aria-pressed={filterPauseReason === key}
                onClick={() => setFilterPauseReason(key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  filterPauseReason === key
                    ? "bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Type filter */}
        <div className="reward-filter-group">
          {(["all", "FIXED", "POOL", "FILTER"] as const).map((f) => (
            <button
              key={f}
              aria-pressed={filterType === f}
              onClick={() => setFilterType(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filterType === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all"
                ? t("rewards.types.all", "All types")
                : f === "FIXED"
                  ? t("rewards.types.fixed", "Fixed")
                  : f === "POOL"
                    ? t("rewards.types.pool", "Pool")
                    : t("rewards.types.filter", "Filter")}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded accent-primary"
          />
          {t("rewards.showDeleted", "Show deleted")}
        </label>
      </div>

      {/* Grid */}
      {isError ? (
        <QueryError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="reward-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : rewards.length === 0 && !showDeleted ? (
        <EmptyState
          title={t("ops.rewardEmpty")}
          description={t("ops.rewardEmptyDesc")}
          action={
            <Button onClick={() => setShowCreate(true)}>
              {t("rewards.newReward")}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-3">
          <p className="text-muted-foreground">
            {t("rewards.noRewards", "No rewards found")}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setFilterPaused("all");
              setFilterType("all");
            }}
          >
            {t("rewards.clearFilters", "Clear filters")}
          </Button>
        </div>
      ) : (
        <div className="reward-grid">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.twitch_id}
              reward={reward}
              selected={selectedIds.has(reward.twitch_id)}
              onToggleSelect={handleToggleSelect}
              onRangeSelect={handleRangeSelect}
              onClick={() => {
                lastSelectedIdRef.current = reward.twitch_id;
                setEditingReward(reward);
              }}
            />
          ))}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          allFilteredSelected={allFilteredSelected}
          hasSelectable={selectableFiltered.length > 0}
          onSelectAll={handleSelectAll}
          onPause={() => batchMutation.mutate("pause")}
          onUnpause={() => batchMutation.mutate("unpause")}
          onDelete={() => {
            setConfirmBatch(true);
          }}
          onClear={handleClearSelection}
          loading={batchMutation.isPending}
        />
      )}

      <ConfirmAction
        open={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        onConfirm={() => {
          if (!batchMutation.isPending) batchMutation.mutate("delete");
        }}
        pending={batchMutation.isPending}
        destructive
        title={t("rewards.deleteConfirmBatch", { count: selectedIds.size })}
        description={t("ops.deleteRewardDesc")}
        label={t("common.delete")}
        context={rewards
          .filter((r) => selectedIds.has(r.twitch_id))
          .map((r) => r.twitch_title)
          .join("\n")}
      />
      {/* Modals */}
      <RewardEditDialog
        key={editingReward?.twitch_id ?? "none"}
        reward={
          rewards.find((r) => r.twitch_id === editingReward?.twitch_id) ??
          editingReward
        }
        channelId={channelId}
        open={!!editingReward}
        onClose={() => setEditingReward(null)}
      />
      <CreateRewardModal
        channelId={channelId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
