import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { rewardsApi } from "@/lib/apiClient";
import type {
  RewardResponse,
  CreateRewardBody,
  UpdateRewardBody,
  RewardType,
  PricingMode,
  PriceStrategy,
  PauseReason,
  FilterConfig,
  PoolItemConfig,
  PreviewFilterBody,
  PreviewFilterResponse,
  ChatLogicalOperator,
} from "@/types/api";
import { formatMinorCurrency, minorToMajor, majorToMinor } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconExternalLink = ({ className }: { className?: string } = {}) => (
  <svg className={cn("shrink-0", className)} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconFilter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const IconPool = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconCheckAll = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 7 17l-5-5" />
    <path d="m22 10-7.5 7.5L13 16" />
  </svg>
);

// ── Image helpers ──────────────────────────────────────────────────────────
// Direct CDN URL — for <img> display only (no CORS header, browser shows fine)
function getSkinImageUrl(marketItemName: string, size: 150 | 300 = 300): string {
  return `https://cdn2.csgo.com/item/${encodeURIComponent(marketItemName)}/${size}.png`;
}

// Proxied URL — for canvas pixel access (proxy adds Access-Control-Allow-Origin: *)
function getSkinImageUrlProxied(marketItemName: string, size: 150 | 300 = 300): string {
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
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const url = getSkinImageUrl(marketItemName, size);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-background/80 to-muted/40 flex items-center justify-center",
        className
      )}
      style={style}
    >
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-inherit" />
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
          <IconImage />
          <span className="text-[10px]">No preview</span>
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
      ctx.drawImage(src, offsetX, offsetY, cropSide, cropSide, 0, 0, targetSize, targetSize);
      return dst;
    },
    []
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
      setError("Failed to load skin image. The item name may not match the market exactly.");
      setIsLoading(false);
    };
  }, [open, marketItemName, buildCroppedCanvas]);

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Download Twitch Panel Icon</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Center-cropped to a perfect square. Download in the sizes accepted by Twitch reward panels.
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
                <span className="text-[10px] text-muted-foreground">Loading…</span>
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
            <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white/80 font-mono">112×112</div>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center max-w-xs leading-relaxed">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2">{marketItemName}</p>

          <div className="flex items-center gap-2 w-full">
            {SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => download(sz)}
                disabled={!isReady}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 rounded-xl border border-border py-3 px-2 transition-all",
                  "hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed",
                  "text-foreground font-medium"
                )}
              >
                <IconDownload />
                <span className="text-xs tabular-nums">{sz}×{sz}</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Images are cropped client-side in your browser. Nothing is uploaded.
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

function mostExpensivePoolItem(items: PoolItemConfig[]): PoolItemConfig | undefined {
  return items.reduce<PoolItemConfig | undefined>((best, it) => {
    const price = it.current_market_price ?? 0;
    return best === undefined || price > (best.current_market_price ?? 0) ? it : best;
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
  const formattedPrice = formatMinorCurrency(reward.current_market_price, reward.currency);
  const type = reward.reward_type ?? "FIXED";
  const isManual = reward.pricing_mode === "MANUAL";

  // Determine preview skin name for POOL
  const poolPreviewSkin = type === "POOL" && reward.pool_items?.length
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
      onClick={handleCardClick}
      className={cn(
        "relative rounded-2xl border bg-card cursor-pointer transition-all duration-200 group overflow-hidden select-none",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        selected && !reward.is_deleted && "border-primary/80 bg-primary/10 shadow-lg shadow-primary/15 ring-2 ring-primary/50",
        reward.is_paused && !selected && "opacity-60",
        reward.is_deleted && "opacity-40 pointer-events-none"
      )}
    >
      {/* Skin / type banner */}
      {type === "FIXED" && reward.market_item_name ? (
        <SkinImage
          marketItemName={reward.market_item_name}
          size={300}
          objectFit="contain"
          className="w-full rounded-t-2xl aspect-[4/3]"
        />
      ) : type === "POOL" && poolPreviewSkin ? (
        <div className="relative">
          <SkinImage
            marketItemName={poolPreviewSkin}
            size={300}
            objectFit="contain"
            className="w-full rounded-t-2xl aspect-[4/3]"
          />
          <div className="absolute top-2 left-2 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1 flex items-center gap-1.5 text-[10px] text-white/90 font-medium">
            <IconPool />
            Pool · {reward.pool_items?.length ?? 0} skins
          </div>
        </div>
      ) : type === "FILTER" ? (
        <div className="w-full aspect-[4/3] rounded-t-2xl bg-gradient-to-br from-violet-500/10 via-primary/5 to-cyan-500/10 flex flex-col items-center justify-center gap-2 border-b border-border">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <IconFilter />
          </div>
          {reward.filter_config && (
            <span className="text-xs text-muted-foreground font-mono">
              {reward.filter_config.min_price.toFixed(0)} – {reward.filter_config.max_price.toFixed(0)} {reward.currency}
            </span>
          )}
        </div>
      ) : (
        <div className="w-full aspect-[4/3] rounded-t-2xl bg-muted/30 flex items-center justify-center text-muted-foreground/30">
          <IconImage />
        </div>
      )}

      <div className="p-4">
        {/* Checkbox */}
        {!reward.is_deleted && (
          <div
            className="absolute top-3 right-3 z-10 p-1 cursor-pointer"
            title={selected ? "Deselect (or Ctrl+Click)" : "Select (or Ctrl+Click)"}
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
                  : "border-white/60 bg-black/30 opacity-0 group-hover:opacity-100"
              )}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
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
                  : "status-failed-refund"
              )}
              title={
                reward.pause_reason === "NO_MONEY"
                  ? "Paused automatically: insufficient balance on Market"
                  : reward.pause_reason === "PRICE_LIMIT"
                  ? "Paused automatically: market price exceeded configured limits"
                  : "Paused manually"
              }
            >
              <IconPause />
              {reward.pause_reason === "NO_MONEY"
                ? "Paused (No balance)"
                : reward.pause_reason === "PRICE_LIMIT"
                ? "Paused (Price limit)"
                : "Paused"}
            </Badge>
          )}
          {reward.market_autobuy && (
            <Badge variant="outline" className="status-completed text-xs">
              Auto-buy
            </Badge>
          )}
          {reward.is_deleted && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Deleted
            </Badge>
          )}
          {isManual && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
              Manual price
            </Badge>
          )}
          {(reward.chat_min_messages != null || reward.chat_min_characters != null) && (
            <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400 bg-violet-500/10 gap-1" title="Has Chat Activity Requirements">
              <span>💬</span>
              {reward.chat_min_messages != null ? `${reward.chat_min_messages} msgs` : ""}
              {reward.chat_min_messages != null && reward.chat_min_characters != null ? ` ${reward.chat_logical_operator ?? "AND"} ` : ""}
              {reward.chat_min_characters != null ? `${reward.chat_min_characters} chars` : ""}
              {reward.chat_time_window_hours != null ? ` / ${reward.chat_time_window_hours}h` : ""}
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
              {reward.pool_items?.length ?? 0} item{(reward.pool_items?.length ?? 0) !== 1 ? "s" : ""} in pool
            </span>
          ) : type === "FILTER" && reward.filter_config ? (
            <span className="text-xs text-muted-foreground">
              {reward.filter_config.name_contains
                ? `"${reward.filter_config.name_contains}"`
                : reward.filter_config.name_prefix
                ? `${reward.filter_config.name_prefix}…`
                : "Dynamic filter"}
            </span>
          ) : null}
        </div>

        {/* Price info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {isManual ? "Twitch Points" : "Market price"}
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{formattedPrice}</p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            {isManual ? (
              <>
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="text-sm font-bold text-blue-400">Manual</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Markup</p>
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
          <span>CD: {reward.global_cooldown_seconds}s</span>
          <span>·</span>
          <span>Max/stream: {reward.max_redemptions_per_stream}</span>
          <span>·</span>
          <span>Max/user/stream: {reward.max_redemptions_per_user_per_stream}</span>
          {(reward.min_market_price != null || reward.max_market_price != null) && (
            <>
              <span>·</span>
              <span className="text-amber-400/90" title="Market Price Safety Limits">
                Limits: {reward.min_market_price != null ? formatMinorCurrency(reward.min_market_price, reward.currency) : "0"} – {reward.max_market_price != null ? formatMinorCurrency(reward.max_market_price, reward.currency) : "∞"}
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
  const chances = calcPoolChances(items);

  const update = (idx: number, patch: Partial<PoolItemConfig>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const add = () =>
    onChange([
      ...items,
      { market_hash_name: "", weight: 1, permissible_market_price_deviation: 10 },
    ]);

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div
          key={idx}
          className="relative rounded-xl border border-border bg-background/50 p-3 space-y-2"
        >
          {/* Header: skin name + chance badge */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="AWP | Asiimov (Field-Tested)"
                value={it.market_hash_name}
                onChange={(e) => update(idx, { market_hash_name: e.target.value })}
                className="text-sm h-8"
              />
            </div>
            <span className="shrink-0 text-xs font-mono text-primary tabular-nums bg-primary/10 rounded-md px-2 py-1">
              {chances[idx].toFixed(1)}%
            </span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors"
              title="Remove"
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
                <span className="truncate min-w-0">{it.market_hash_name}</span>
                <IconExternalLink className="shrink-0" />
              </a>
            </div>
          )}

          {/* Weight + deviation */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Weight</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={it.weight}
                onChange={(e) => update(idx, { weight: parseFloat(e.target.value) || 1 })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max deviation %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={it.permissible_market_price_deviation}
                onChange={(e) => update(idx, { permissible_market_price_deviation: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
      >
        <IconPlus /> Add skin to pool
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

  const fmt = (n: number, currency: string) =>
    n.toFixed(2) + " " + currency;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Filter Preview</p>
        <button
          type="button"
          onClick={run}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <IconRefresh /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 flex-1 rounded-lg" />)}
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
            <span className="text-sm text-muted-foreground">matching skins</span>
            {preview.estimated_twitch_points > 0 && (
              <Badge variant="outline" className="ml-auto text-xs status-completed">
                ~{preview.estimated_twitch_points.toLocaleString()} pts
              </Badge>
            )}
          </div>

          {/* Price stats */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { label: "Min", val: preview.min_price },
              { label: "Avg", val: preview.average_price },
              { label: "Median", val: preview.median_price },
              { label: "Max", val: preview.max_price },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg bg-background/60 border border-border px-2 py-2 text-center">
                <p className="text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold tabular-nums">{fmt(val, preview.currency)}</p>
              </div>
            ))}
          </div>

          {/* Calculated price */}
          {preview.calculated_market_price > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Calculated market price</span>
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
                  Sample skins ({preview.sample_items.length})
                </p>
                <span className="text-[10px] text-muted-foreground/60">
                  Click to view on Market
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
                            {item.volume} шт.
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
          Set min/max price to preview matching skins
        </p>
      )}
    </div>
  );
}

// ── Pool Items Detail (edit dialog) ──────────────────────────────────────
function PoolItemsDetail({
  items,
  currency,
}: {
  items: PoolItemConfig[];
  currency: string;
}) {
  const chances = calcPoolChances(items);

  return (
    <div className="space-y-2 min-w-0">
      <p className="text-sm font-medium text-foreground mb-3">Pool Items ({items.length})</p>
      <div className="grid gap-2 min-w-0">
        {items.map((item, idx) => {
          const price = item.current_market_price;
          const devAmt = price != null
            ? (price * item.permissible_market_price_deviation) / 100 / 100
            : null;
          const priceFmt = price != null
            ? formatMinorCurrency(price, currency)
            : "–";

          return (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 min-w-0"
            >
              <SkinImage
                marketItemName={item.market_hash_name}
                size={150}
                objectFit="contain"
                className="rounded-lg shrink-0"
                style={{ width: 56, height: 42 }}
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <a
                  href={`https://market.csgo.com/en/?search=${encodeURIComponent(item.market_hash_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-primary hover:underline inline-flex items-center gap-1 max-w-full min-w-0"
                  title={item.market_hash_name}
                >
                  <span className="truncate min-w-0">{item.market_hash_name}</span>
                  <IconExternalLink className="shrink-0" />
                </a>
                <p className="text-xs text-muted-foreground tabular-nums truncate">
                  {priceFmt}
                  {devAmt != null && (
                    <span className="text-muted-foreground/60 ml-1">
                      (±{devAmt.toFixed(2)} {currency})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums text-primary">{chances[idx].toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">weight {item.weight}</p>
              </div>
            </div>
          );
        })}
      </div>
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
  const type = form.reward_type ?? "FIXED";

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="space-y-2">
        <Label>Reward Type</Label>
        <div className="grid grid-cols-3 gap-3">
          {(["FIXED", "POOL", "FILTER"] as RewardType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ reward_type: t })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all text-sm font-medium",
                type === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "FIXED" ? <IconImage /> : t === "POOL" ? <IconPool /> : <IconFilter />}
              <span className="text-xs">
                {t === "FIXED" ? "Fixed Skin" : t === "POOL" ? "Skin Pool" : "Filter"}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {type === "FIXED"
            ? "One specific skin. A fixed market item will be purchased when redeemed."
            : type === "POOL"
            ? "A weighted pool of skins. A random skin is picked from the pool on each redemption."
            : "A dynamic filter matching skins by price range and name. Any matching skin can be purchased."}
        </p>
      </div>

      {/* FIXED: item name */}
      {type === "FIXED" && (
        <div className="space-y-2">
          <Label htmlFor="market_item_name">Market Item Name</Label>
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
          <Label>Pool Items</Label>
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
              <Label htmlFor="filter_min">Min Price (in currency units)</Label>
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
              <Label htmlFor="filter_max">Max Price (in currency units)</Label>
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
            <Label htmlFor="filter_contains">Name Contains (optional)</Label>
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
              <Label htmlFor="filter_prefix">Name Prefix (optional)</Label>
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
              <Label htmlFor="filter_volume">Min Volume (optional)</Label>
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

// ── Step 2: Pricing ────────────────────────────────────────────────────────
function StepPricing({
  form,
  channelId,
  onChange,
}: {
  form: Partial<CreateRewardBody>;
  channelId: string;
  onChange: (patch: Partial<CreateRewardBody>) => void;
}) {
  const mode = form.pricing_mode ?? "AUTO";
  const type = form.reward_type ?? "FIXED";
  const showStrategy = mode === "AUTO" && (type === "POOL" || type === "FILTER");

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="space-y-2">
        <Label>Pricing Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["AUTO", "MANUAL"] as PricingMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ pricing_mode: m })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all text-sm font-medium",
                mode === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-lg">{m === "AUTO" ? "📈" : "🔒"}</span>
              <span className="text-xs">{m === "AUTO" ? "Auto (Market)" : "Manual (Fixed)"}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {mode === "AUTO"
            ? "Twitch Channel Points cost is calculated automatically based on current market price + markup."
            : "Twitch Channel Points cost is fixed and won't change with market fluctuations."}
        </p>
      </div>

      {mode === "AUTO" && (
        <>
          {/* Price strategy for POOL/FILTER */}
          {showStrategy && (
            <div className="space-y-2">
              <Label>Price Strategy</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["AVERAGE", "MEDIAN", "MAX"] as PriceStrategy[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ price_strategy: s })}
                    className={cn(
                      "rounded-xl border-2 py-2 px-3 text-xs font-medium transition-all",
                      form.price_strategy === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s === "AVERAGE" ? "Average" : s === "MEDIAN" ? "Median" : "Maximum"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Strategy used to aggregate prices across pool items or filter results.
              </p>
            </div>
          )}

          {/* Markup % */}
          <div className="space-y-2">
            <Label htmlFor="markup_pct">Twitch Price Markup %</Label>
            <Input
              id="markup_pct"
              type="number"
              min={0}
              max={4900}
              value={form.twitch_price_markup_percentage ?? 50}
              onChange={(e) => onChange({ twitch_price_markup_percentage: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Percentage added on top of the market price to calculate Twitch Points cost.
            </p>
          </div>

          {/* Deviation (only for FIXED) */}
          {type === "FIXED" && (
            <div className="space-y-2">
              <Label htmlFor="deviation">Max Price Deviation %</Label>
              <Input
                id="deviation"
                type="number"
                min={0}
                max={100}
                value={form.permissible_market_price_deviation ?? 10}
                onChange={(e) => onChange({ permissible_market_price_deviation: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Max allowed deviation from the stored market price before the purchase is rejected.
              </p>
            </div>
          )}

          {/* Live filter preview for FILTER type */}
          {type === "FILTER" && form.filter_config && (
            <FilterPreviewBlock
              channelId={channelId}
              filterConfig={form.filter_config}
              priceStrategy={form.price_strategy ?? null}
              markupPct={form.twitch_price_markup_percentage ?? 50}
            />
          )}
        </>
      )}

      {mode === "MANUAL" && (
        <div className="space-y-2">
          <Label htmlFor="manual_points">Fixed Twitch Channel Points</Label>
          <Input
            id="manual_points"
            type="number"
            min={1}
            placeholder="10000"
            value={form.manual_twitch_points ?? ""}
            onChange={(e) => onChange({ manual_twitch_points: parseInt(e.target.value) || null })}
          />
          <p className="text-xs text-muted-foreground">
            Channel Points cost viewers pay to redeem. This is fixed and won't follow market prices.
          </p>
          {/* For FILTER in MANUAL mode, still show preview without points estimate */}
          {type === "FILTER" && form.filter_config && (
            <FilterPreviewBlock
              channelId={channelId}
              filterConfig={form.filter_config}
              priceStrategy={null}
              markupPct={0}
            />
          )}
        </div>
      )}

      {/* Market Price Safety Limits (Auto-pause) */}
      <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
        <div className="space-y-1">
          <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <span>🛡️</span> Market Price Safety Limits (Auto-pause)
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Automatically pause this reward if market price drops below or rises above these limits.
            Protects your Market balance against sudden price surges.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="min_market_price" className="text-xs">Min Market Price</Label>
            <Input
              id="min_market_price"
              type="number"
              min={0}
              step={0.01}
              placeholder="No minimum"
              value={
                form.min_market_price != null
                  ? minorToMajor(form.min_market_price)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") {
                  onChange({ min_market_price: null });
                } else {
                  const num = parseFloat(val);
                  onChange({ min_market_price: isNaN(num) ? null : majorToMinor(num) });
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">Auto-pauses if price drops below</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_market_price" className="text-xs">Max Market Price</Label>
            <Input
              id="max_market_price"
              type="number"
              min={0}
              step={0.01}
              placeholder="No maximum"
              value={
                form.max_market_price != null
                  ? minorToMajor(form.max_market_price)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") {
                  onChange({ max_market_price: null });
                } else {
                  const num = parseFloat(val);
                  onChange({ max_market_price: isNaN(num) ? null : majorToMinor(num) });
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">Auto-pauses if price rises above</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Twitch Settings & Limits ──────────────────────────────────────
function StepTwitchSettings({
  form,
  onChange,
  isEdit,
}: {
  form: Partial<CreateRewardBody>;
  onChange: (patch: Partial<CreateRewardBody>) => void;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="twitch_title">Twitch Reward Title</Label>
        <Input
          id="twitch_title"
          placeholder="Get AWP Asiimov"
          required
          value={form.twitch_title ?? ""}
          onChange={(e) => onChange({ twitch_title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitch_description">Description</Label>
        <Textarea
          id="twitch_description"
          placeholder="Redeem to get this skin delivered to your Steam account."
          rows={2}
          value={form.twitch_description ?? ""}
          onChange={(e) => onChange({ twitch_description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="global_cooldown_seconds">Cooldown (s)</Label>
          <Input
            id="global_cooldown_seconds"
            type="number"
            min={0}
            value={form.global_cooldown_seconds ?? 60}
            onChange={(e) => onChange({ global_cooldown_seconds: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_per_stream">Max / Stream</Label>
          <Input
            id="max_per_stream"
            type="number"
            min={0}
            value={form.max_redemptions_per_stream ?? 0}
            onChange={(e) => onChange({ max_redemptions_per_stream: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_per_user">Max / User</Label>
          <Input
            id="max_per_user"
            type="number"
            min={0}
            value={form.max_redemptions_per_user_per_stream ?? 0}
            onChange={(e) => onChange({ max_redemptions_per_user_per_stream: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.market_autobuy ?? true}
            onChange={(e) => onChange({ market_autobuy: e.target.checked })}
            className="rounded accent-primary"
          />
          <span className="text-sm">Auto-buy from market</span>
        </label>
        {!isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_paused ?? false}
              onChange={(e) => onChange({ is_paused: e.target.checked })}
              className="rounded accent-primary"
            />
            <span className="text-sm">Create as paused</span>
          </label>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Chat Requirements ──────────────────────────────────────────────
function StepChatRequirements({
  form,
  onChange,
}: {
  form: Partial<CreateRewardBody>;
  onChange: (patch: Partial<CreateRewardBody>) => void;
}) {
  const hasRequirements = !!(form.chat_min_messages || form.chat_min_characters);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs flex items-start gap-2.5">
        <span className="text-base leading-none">💬</span>
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Twitch Chat Activity Requirements</p>
          <p className="text-muted-foreground leading-relaxed">
            Limit redemptions to active stream viewers. Leave message and character counts empty or 0 if you don&apos;t want to enforce any chat requirements for this reward.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chat_min_messages">Minimum Messages</Label>
          <Input
            id="chat_min_messages"
            type="number"
            min={0}
            placeholder="e.g. 50 (optional)"
            value={form.chat_min_messages ?? ""}
            onChange={(e) => {
              const val = e.target.value.trim();
              onChange({ chat_min_messages: val === "" ? null : Math.max(0, parseInt(val) || 0) });
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Minimum number of chat messages sent by the viewer.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat_min_characters">Minimum Characters</Label>
          <Input
            id="chat_min_characters"
            type="number"
            min={0}
            placeholder="e.g. 500 (optional)"
            value={form.chat_min_characters ?? ""}
            onChange={(e) => {
              const val = e.target.value.trim();
              onChange({ chat_min_characters: val === "" ? null : Math.max(0, parseInt(val) || 0) });
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Minimum total length of chat messages in characters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chat_time_window_hours">Time Window (hours)</Label>
          <Input
            id="chat_time_window_hours"
            type="number"
            min={1}
            placeholder="e.g. 24 (leave empty for all-time)"
            value={form.chat_time_window_hours ?? ""}
            onChange={(e) => {
              const val = e.target.value.trim();
              onChange({ chat_time_window_hours: val === "" ? null : Math.max(1, parseInt(val) || 0) });
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Count chat activity within the last N hours. Empty = all-time activity.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Requirement Logic</Label>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onChange({ chat_logical_operator: "AND" })}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all select-none text-center",
                (form.chat_logical_operator ?? "AND") === "AND"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              )}
            >
              AND (Both)
            </button>
            <button
              type="button"
              onClick={() => onChange({ chat_logical_operator: "OR" })}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all select-none text-center",
                form.chat_logical_operator === "OR"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              )}
            >
              OR (Either)
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(form.chat_logical_operator ?? "AND") === "AND"
              ? "Viewer must meet BOTH messages and characters requirements."
              : "Viewer can meet EITHER messages OR characters requirement."}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.refund_if_chat_req_failed ?? true}
            onChange={(e) => onChange({ refund_if_chat_req_failed: e.target.checked })}
            className="mt-0.5 rounded accent-primary"
          />
          <div className="text-xs space-y-0.5">
            <span className="font-medium text-foreground block">
              Auto-refund Channel Points if requirement fails
            </span>
            <span className="text-muted-foreground block leading-normal">
              If enabled, points are immediately returned to the viewer if their chat activity doesn&apos;t meet the requirement.
            </span>
          </div>
        </label>
      </div>

      {hasRequirements && (
        <div className="rounded-lg bg-muted/40 border border-border/80 px-3.5 py-2.5 text-xs flex items-center gap-2">
          <span className="text-primary font-bold">Rule Preview:</span>
          <span className="text-foreground">
            Viewer needs{" "}
            {form.chat_min_messages ? <strong>{form.chat_min_messages} messages</strong> : null}
            {form.chat_min_messages && form.chat_min_characters ? ` ${form.chat_logical_operator ?? "AND"} ` : null}
            {form.chat_min_characters ? <strong>{form.chat_min_characters} characters</strong> : null}
            {form.chat_time_window_hours ? ` in the last ${form.chat_time_window_hours} hours` : " of all-time activity"}
            .
          </span>
        </div>
      )}
    </div>
  );
}

// ── Multi-step Reward Wizard ───────────────────────────────────────────────
const STEPS = ["Type & Skin", "Pricing", "Twitch Settings", "Chat Requirements"] as const;
type StepIndex = 0 | 1 | 2 | 3;

function RewardWizard({
  initial,
  channelId,
  onSubmit,
  loading,
  isEdit,
}: {
  initial?: Partial<CreateRewardBody>;
  channelId: string;
  onSubmit: (data: CreateRewardBody) => void;
  loading: boolean;
  isEdit: boolean;
}) {
  const [step, setStep] = useState<StepIndex>(0);
  const [form, setForm] = useState<Partial<CreateRewardBody>>({
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
    ...initial,
  });

  const patch = (p: Partial<CreateRewardBody>) =>
    setForm((f) => ({ ...f, ...p }));

  const canNext = (): boolean => {
    if (step === 0) {
      if (form.reward_type === "FIXED") return !!(form.market_item_name?.trim());
      if (form.reward_type === "POOL") return (form.pool_items?.length ?? 0) > 0 && form.pool_items!.every((it) => it.market_hash_name.trim());
      if (form.reward_type === "FILTER") return !!(form.filter_config?.max_price && form.filter_config.max_price > 0);
    }
    if (step === 1) {
      if (form.pricing_mode === "MANUAL") return !!(form.manual_twitch_points && form.manual_twitch_points > 0);
      return true;
    }
    if (step === 2) {
      return !!(form.twitch_title?.trim());
    }
    return true;
  };

  const handleSubmit = () => {
    const body: CreateRewardBody = {
      reward_type: form.reward_type ?? "FIXED",
      pricing_mode: form.pricing_mode ?? "AUTO",
      price_strategy: form.price_strategy ?? null,
      manual_twitch_points: form.manual_twitch_points ?? null,
      market_item_name: form.market_item_name ?? null,
      pool_items: form.pool_items ?? null,
      filter_config: form.filter_config ?? null,
      twitch_title: form.twitch_title ?? "",
      twitch_description: form.twitch_description ?? "",
      min_market_price: form.min_market_price ?? null,
      max_market_price: form.max_market_price ?? null,
      permissible_market_price_deviation: form.permissible_market_price_deviation ?? 10,
      twitch_price_markup_percentage: form.twitch_price_markup_percentage ?? 50,
      global_cooldown_seconds: form.global_cooldown_seconds ?? 60,
      max_redemptions_per_stream: form.max_redemptions_per_stream ?? 0,
      max_redemptions_per_user_per_stream: form.max_redemptions_per_user_per_stream ?? 0,
      market_autobuy: form.market_autobuy ?? true,
      is_paused: form.is_paused ?? false,
      chat_min_messages: form.chat_min_messages ? Number(form.chat_min_messages) : null,
      chat_min_characters: form.chat_min_characters ? Number(form.chat_min_characters) : null,
      chat_time_window_hours: form.chat_time_window_hours ? Number(form.chat_time_window_hours) : null,
      chat_logical_operator:
        (form.chat_min_messages || form.chat_min_characters)
          ? (form.chat_logical_operator ?? "AND")
          : null,
      refund_if_chat_req_failed: form.refund_if_chat_req_failed ?? true,
    };
    onSubmit(body);
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, idx) => {
          const isClickable = isEdit || idx <= step;
          return (
            <div key={idx} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => isClickable && setStep(idx as StepIndex)}
                className={cn(
                  "flex items-center gap-2 shrink-0 text-xs font-medium transition-colors select-none",
                  idx === step
                    ? "text-primary font-semibold"
                    : isClickable
                    ? "text-foreground cursor-pointer hover:text-primary"
                    : "text-muted-foreground/50 cursor-not-allowed"
                )}
                title={isEdit ? `Go to step: ${label}` : undefined}
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    idx === step
                      ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : isEdit
                      ? "border-primary/50 bg-primary/10 text-primary cursor-pointer hover:border-primary hover:bg-primary/25"
                      : idx < step
                      ? "border-primary bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "border-border bg-transparent text-muted-foreground/50"
                  )}
                >
                  {isEdit ? idx + 1 : idx < step ? "✓" : idx + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2 transition-colors",
                    isEdit || idx < step ? "bg-primary/40" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Step content */}
      <div>
        {step === 0 && <StepTypeAndSkins form={form} onChange={patch} />}
        {step === 1 && <StepPricing form={form} channelId={channelId} onChange={patch} />}
        {step === 2 && <StepTwitchSettings form={form} onChange={patch} isEdit={isEdit} />}
        {step === 3 && <StepChatRequirements form={form} onChange={patch} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStep((s) => (s > 0 ? (s - 1) as StepIndex : s))}
          disabled={step === 0}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          {isEdit ? (
            <>
              {step < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => (s < 3 ? (s + 1) as StepIndex : s))}
                  disabled={!canNext()}
                >
                  Next →
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={loading || !canNext()}
              >
                {loading ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : step < 3 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => (s < 3 ? (s + 1) as StepIndex : s))}
              disabled={!canNext()}
            >
              Next →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canNext()}
            >
              {loading ? "Saving…" : "Create Reward"}
            </Button>
          )}
        </div>
      </div>
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

  const [showIconDownloader, setShowIconDownloader] = useState(false);

  if (!reward) return null;

  const type = reward.reward_type ?? "FIXED";
  const iconDownloadSkin =
    type === "FIXED"
      ? reward.market_item_name ?? null
      : type === "POOL" && reward.pool_items?.length
      ? mostExpensivePoolItem(reward.pool_items)?.market_hash_name ?? null
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg">{reward.twitch_title}</DialogTitle>
                <Badge variant="outline" className={cn(
                  "text-xs font-mono",
                  type === "FIXED" ? "border-slate-500/30 text-slate-400" :
                  type === "POOL" ? "border-violet-500/30 text-violet-400" :
                  "border-cyan-500/30 text-cyan-400"
                )}>
                  {type}
                </Badge>
                {reward.pricing_mode === "MANUAL" && (
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                    Manual price
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
                      : "status-failed-refund"
                  )}
                >
                  <IconPause />
                  {reward.pause_reason === "NO_MONEY"
                    ? "Paused (No balance)"
                    : reward.pause_reason === "PRICE_LIMIT"
                    ? "Paused (Price limit)"
                    : "Paused"}
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
                  <span className="truncate min-w-0">{reward.market_item_name}</span>
                  <IconExternalLink className="shrink-0" />
                </a>
              ) : type === "POOL" ? (
                <span>{reward.pool_items?.length ?? 0} skins in pool</span>
              ) : type === "FILTER" && reward.filter_config ? (
                <span>Filter: {reward.filter_config.min_price.toFixed(2)} – {reward.filter_config.max_price.toFixed(2)} {reward.currency}</span>
              ) : null}
              <span>·</span>
              <span>{formatMinorCurrency(reward.current_market_price, reward.currency)}</span>
              {reward.price_strategy && (
                <>
                  <span>·</span>
                  <span className="text-muted-foreground">{strategyLabel(reward.price_strategy)}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => updatePriceMutation.mutate()}
              disabled={updatePriceMutation.isPending}
            >
              <IconRefresh />
              Update Price
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() =>
                updateMutation.mutate({ is_paused: !reward.is_paused })
              }
              disabled={updateMutation.isPending}
            >
              {reward.is_paused ? <IconPlay /> : <IconPause />}
              {reward.is_paused ? "Unpause" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
              onClick={() => {
                if (confirm(`Delete "${reward.twitch_title}"?`)) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              <IconTrash />
              Delete
            </Button>
            {iconDownloadSkin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setShowIconDownloader(true)}
              >
                <IconDownload />
                Download Icon
              </Button>
            )}
          </div>

          <Separator className="my-2" />

          <Tabs defaultValue="overview" className="w-full min-w-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="edit">Edit Reward</TabsTrigger>
              <TabsTrigger value="redemptions">Recent Redemptions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-5 min-w-0">
              {/* Chat Activity Requirements card */}
              {(reward.chat_min_messages != null || reward.chat_min_characters != null) && (
                <div className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <p className="text-xs font-semibold text-violet-300">Chat Activity Requirements</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Min Messages</p>
                      <p className="font-medium text-foreground">{reward.chat_min_messages ?? "None"}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Min Characters</p>
                      <p className="font-medium text-foreground">{reward.chat_min_characters ?? "None"}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Logic Operator</p>
                      <p className="font-medium text-foreground">{reward.chat_logical_operator ?? "AND"}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Time Window</p>
                      <p className="font-medium text-foreground">{reward.chat_time_window_hours ? `${reward.chat_time_window_hours}h` : "All time"}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-refund points if requirement fails: <strong className="text-foreground">{reward.refund_if_chat_req_failed !== false ? "Yes" : "No"}</strong>
                  </p>
                </div>
              )}

              {/* PRICE_LIMIT warning alert if reward is auto-paused by price limit */}
              {reward.is_paused && reward.pause_reason === "PRICE_LIMIT" && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5 text-xs text-orange-200 flex items-start gap-2.5">
                  <span className="text-base leading-none">⚠️</span>
                  <div className="space-y-1">
                    <p className="font-semibold text-orange-300">Auto-paused by Market Price Limit</p>
                    <p className="text-orange-200/90 leading-relaxed">
                      Current market price is <strong>{formatMinorCurrency(reward.current_market_price, reward.currency)}</strong>, which is outside your configured safety limits
                      {reward.min_market_price != null && ` (Min: ${formatMinorCurrency(reward.min_market_price, reward.currency)})`}
                      {reward.max_market_price != null && ` (Max: ${formatMinorCurrency(reward.max_market_price, reward.currency)})`}.
                    </p>
                  </div>
                </div>
              )}

              {/* POOL: pool items detail */}
              {type === "POOL" && reward.pool_items?.length ? (
                <PoolItemsDetail items={reward.pool_items} currency={reward.currency} />
              ) : null}

              {/* FILTER: filter config summary + live preview */}
              {type === "FILTER" && reward.filter_config ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Filter Configuration</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Min Price", val: `${reward.filter_config.min_price.toFixed(2)} ${reward.currency}` },
                      { label: "Max Price", val: `${reward.filter_config.max_price.toFixed(2)} ${reward.currency}` },
                      { label: "Name Contains", val: reward.filter_config.name_contains ?? "–" },
                      { label: "Name Prefix", val: reward.filter_config.name_prefix ?? "–" },
                      { label: "Min Volume", val: reward.filter_config.min_volume?.toString() ?? "–" },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-lg bg-background/60 border border-border px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">{label}</p>
                        <p className="font-medium text-foreground">{val}</p>
                      </div>
                    ))}
                  </div>
                  <FilterPreviewBlock
                    channelId={channelId}
                    filterConfig={reward.filter_config}
                    priceStrategy={reward.price_strategy ?? null}
                    markupPct={reward.twitch_price_markup_percentage}
                  />
                </div>
              ) : null}

              {/* FIXED: skin info */}
              {type === "FIXED" && reward.market_item_name ? (
                <div className="flex gap-4">
                  <SkinImage
                    marketItemName={reward.market_item_name}
                    size={300}
                    objectFit="contain"
                    className="rounded-xl shrink-0"
                    style={{ width: 140, height: 105 }}
                  />
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="font-medium">{reward.market_item_name}</p>
                    <p className="text-muted-foreground text-xs">
                      Market price: {formatMinorCurrency(reward.current_market_price, reward.currency)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Max deviation: {reward.permissible_market_price_deviation}%
                    </p>
                    <a
                      href={`https://market.csgo.com/en/?search=${encodeURIComponent(reward.market_item_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View on Market <IconExternalLink />
                    </a>
                  </div>
                </div>
              ) : null}

              {/* General info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { label: "Cooldown", val: `${reward.global_cooldown_seconds}s` },
                  { label: "Max / Stream", val: String(reward.max_redemptions_per_stream) },
                  { label: "Max / User", val: String(reward.max_redemptions_per_user_per_stream) },
                  { label: "Auto-buy", val: reward.market_autobuy ? "Yes" : "No" },
                  { label: "Pricing", val: reward.pricing_mode === "MANUAL" ? "Manual" : "Auto" },
                  { label: "Markup", val: `+${reward.twitch_price_markup_percentage}%` },
                  { label: "Min Price Limit", val: reward.min_market_price != null ? formatMinorCurrency(reward.min_market_price, reward.currency) : "None" },
                  { label: "Max Price Limit", val: reward.max_market_price != null ? formatMinorCurrency(reward.max_market_price, reward.currency) : "None" },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg bg-background/60 border border-border px-3 py-2">
                    <p className="text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-foreground">{val}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-4">
              <RewardWizard
                initial={{
                  reward_type: reward.reward_type,
                  pricing_mode: reward.pricing_mode,
                  price_strategy: reward.price_strategy ?? undefined,
                  market_item_name: reward.market_item_name ?? undefined,
                  pool_items: reward.pool_items ?? undefined,
                  filter_config: reward.filter_config ?? undefined,
                  twitch_title: reward.twitch_title,
                  twitch_description: reward.twitch_description,
                  min_market_price: reward.min_market_price ?? undefined,
                  max_market_price: reward.max_market_price ?? undefined,
                  permissible_market_price_deviation: reward.permissible_market_price_deviation,
                  twitch_price_markup_percentage: reward.twitch_price_markup_percentage,
                  global_cooldown_seconds: reward.global_cooldown_seconds,
                  max_redemptions_per_stream: reward.max_redemptions_per_stream,
                  max_redemptions_per_user_per_stream: reward.max_redemptions_per_user_per_stream,
                  market_autobuy: reward.market_autobuy,
                  is_paused: reward.is_paused,
                  chat_min_messages: reward.chat_min_messages ?? undefined,
                  chat_min_characters: reward.chat_min_characters ?? undefined,
                  chat_time_window_hours: reward.chat_time_window_hours ?? undefined,
                  chat_logical_operator: reward.chat_logical_operator ?? undefined,
                  refund_if_chat_req_failed: reward.refund_if_chat_req_failed ?? true,
                }}
                channelId={channelId}
                onSubmit={(data) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { is_paused: _, ...updateData } = data;
                  updateMutation.mutate(updateData as UpdateRewardBody);
                }}
                loading={updateMutation.isPending}
                isEdit={true}
              />
            </TabsContent>

            <TabsContent value="redemptions" className="mt-4">
              <RedemptionList channelId={channelId} rewardId={reward.twitch_id} compact />
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
function CreateRewardModal({
  channelId,
  open,
  onClose,
}: {
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (body: CreateRewardBody) => rewardsApi.create(channelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Reward</DialogTitle>
          <DialogDescription>
            Choose the type of skin reward and configure pricing for your channel.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <RewardWizard
            channelId={channelId}
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
            isEdit={false}
          />
          {createMutation.error && (
            <p className="text-sm text-destructive mt-3">
              {(createMutation.error as Error).message}
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
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 px-4 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-[95vw] overflow-x-auto">
      <div className="flex items-center gap-2 pr-1">
        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
          {count} <span className="text-muted-foreground font-normal">selected</span>
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
        <span>{allFilteredSelected ? "All selected" : "Select all"}</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8 bg-background/60 hover:bg-background shrink-0"
        onClick={onPause}
        disabled={loading}
      >
        <IconPause />
        <span>Pause all</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8 bg-background/60 hover:bg-background shrink-0"
        onClick={onUnpause}
        disabled={loading}
      >
        <IconPlay />
        <span>Unpause all</span>
      </Button>

      <Button
        size="sm"
        variant="destructive"
        className="gap-1.5 text-xs h-8 shrink-0"
        onClick={onDelete}
        disabled={loading}
      >
        <IconTrash />
        <span>Delete all</span>
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
        <span>Clear</span>
        <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted/60 text-muted-foreground rounded border border-border">
          Esc
        </kbd>
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RewardsPage() {
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterPaused, setFilterPaused] = useState<"all" | "paused" | "active">("all");
  const [filterPauseReason, setFilterPauseReason] = useState<"all" | PauseReason>("all");
  const [filterType, setFilterType] = useState<"all" | RewardType>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  const [editingReward, setEditingReward] = useState<RewardResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: rewards = [], isLoading } = useQuery({
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
      if (filterType !== "all" && (r.reward_type ?? "FIXED") !== filterType) return false;
      if (!q) return true;
      return (
        r.twitch_title.toLowerCase().includes(q) ||
        (r.market_item_name ?? "").toLowerCase().includes(q) ||
        r.twitch_description.toLowerCase().includes(q)
      );
    });
  }, [rewards, search, filterPaused, filterPauseReason, filterType]);

  const handleToggleSelect = useCallback((id: string) => {
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
  }, [rewards]);

  const handleRangeSelect = useCallback(
    (targetId: string) => {
      const targetReward = filtered.find((r) => r.twitch_id === targetId);
      if (!targetReward || targetReward.is_deleted) return;

      const targetIndex = filtered.findIndex((r) => r.twitch_id === targetId);
      if (targetIndex === -1) return;

      const anchorId = lastSelectedIdRef.current;
      let anchorIndex = anchorId ? filtered.findIndex((r) => r.twitch_id === anchorId) : -1;

      if (anchorIndex === -1) {
        const visibleSelectedIndices = filtered
          .map((r, idx) => (!r.is_deleted && selectedIds.has(r.twitch_id) ? idx : -1))
          .filter((idx) => idx !== -1);

        if (visibleSelectedIndices.length > 0) {
          anchorIndex = visibleSelectedIndices.reduce((prev, curr) =>
            Math.abs(curr - targetIndex) < Math.abs(prev - targetIndex) ? curr : prev
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
    [filtered, selectedIds]
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
    [filtered]
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
  }, [editingReward, showCreate, selectedIds.size, selectableFiltered.length, handleClearSelection, handleSelectAll]);

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} reward{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <IconPlus />
          New Reward
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <IconSearch />
          </span>
          <Input
            className="pl-9"
            placeholder="Search by title, skin, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilterPaused(f);
                if (f !== "paused") setFilterPauseReason("all");
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                filterPaused === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Pause reason filter (visible when paused is selected) */}
        {filterPaused === "paused" && (
          <div className="flex items-center gap-1 rounded-xl border border-orange-500/30 bg-card p-1">
            {([
              { key: "all", label: "All reasons" },
              { key: "MANUAL", label: "Manual" },
              { key: "NO_MONEY", label: "No balance" },
              { key: "PRICE_LIMIT", label: "Price limit" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterPauseReason(key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  filterPauseReason === key
                    ? "bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Type filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "FIXED", "POOL", "FILTER"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filterType === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All types" : f.charAt(0) + f.slice(1).toLowerCase()}
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
          Show deleted
        </label>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-3">
          <p className="text-muted-foreground">No rewards found</p>
          <Button variant="outline" onClick={() => { setSearch(""); setFilterPaused("all"); setFilterType("all"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
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
            if (confirm(`Delete ${selectedIds.size} rewards?`)) batchMutation.mutate("delete");
          }}
          onClear={handleClearSelection}
          loading={batchMutation.isPending}
        />
      )}

      {/* Modals */}
      <RewardEditDialog
        reward={editingReward}
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
