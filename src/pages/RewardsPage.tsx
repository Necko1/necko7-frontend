import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { rewardsApi } from "@/lib/apiClient";
import type { RewardResponse, CreateRewardBody, UpdateRewardBody } from "@/types/api";
import { formatMinorCurrency } from "@/lib/currency";
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
const IconExternalLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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

// Direct CDN URL — for <img> display only (no CORS header, browser shows fine)
function getSkinImageUrl(marketItemName: string, size: 150 | 300 = 150): string {
  return `https://cdn2.csgo.com/item/${encodeURIComponent(marketItemName)}/${size}.png`;
}

// Proxied URL — for canvas pixel access (proxy adds Access-Control-Allow-Origin: *)
// Uses the same backend as the rest of the API (config.API_BASE_URL).
function getSkinImageUrlProxied(marketItemName: string, size: 150 | 300 = 300): string {
  const cdnUrl = getSkinImageUrl(marketItemName, size);
  const base = config.API_BASE_URL.replace(/\/$/, "");
  return `${base}/api/v1/proxy/image?url=${encodeURIComponent(cdnUrl)}`;
}

// ── SkinImage: renders skin with center-crop to square ─────────────────────
function SkinImage({
  marketItemName,
  size = 150,
  className,
  style,
}: {
  marketItemName: string;
  size?: 150 | 300;
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
          /* 150x113 → crop to square by clipping height-based center */
          display: status === "error" ? "none" : "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
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
      // Render from the 300x225 original (stored in canvasRef as 300x225)
      // Centre-crop to 225x225, then scale to targetSize
      const srcW = src.width;   // 300
      const srcH = src.height;  // 225
      const cropSide = Math.min(srcW, srcH); // 225
      const offsetX = (srcW - cropSide) / 2;
      const offsetY = (srcH - cropSide) / 2;
      ctx.drawImage(src, offsetX, offsetY, cropSide, cropSide, 0, 0, targetSize, targetSize);
      return dst;
    },
    []
  );

  // Load the 300-size image into an offscreen canvas when dialog opens
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
    // Must load via proxy: cdn2.csgo.com has no CORS headers,
    // which would taint the canvas and block toDataURL().
    img.src = getSkinImageUrlProxied(marketItemName, 300);
    img.onload = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      // Generate 112px preview
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

        {/* Hidden canvas for pixel processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="flex flex-col items-center gap-5 mt-2">
          {/* Preview */}
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

          {/* Item name */}
          <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2">{marketItemName}</p>

          {/* Download buttons */}
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

// ── Reward Card ────────────────────────────────────────────────────────────
function RewardCard({
  reward,
  selected,
  onSelect,
  onClick,
}: {
  reward: RewardResponse;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
}) {
  const formattedPrice = formatMinorCurrency(reward.current_market_price, reward.currency);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border bg-card cursor-pointer transition-all duration-200 group overflow-hidden",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        selected && "border-primary/60 bg-primary/5 shadow-md shadow-primary/10",
        reward.is_paused && !selected && "opacity-60",
        reward.is_deleted && "opacity-40 pointer-events-none"
      )}
    >
      {/* Skin image banner */}
      <SkinImage
        marketItemName={reward.market_item_name}
        size={150}
        className="w-full rounded-t-2xl"
        style={{ height: 90 }}
      />

      <div className="p-4">
        {/* Checkbox */}
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(reward.twitch_id, !selected);
          }}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all backdrop-blur-sm",
              selected
                ? "bg-primary border-primary"
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

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {reward.is_paused && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs gap-1",
                reward.pause_reason === "NO_MONEY"
                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  : "status-failed-refund"
              )}
              title={
                reward.pause_reason === "NO_MONEY"
                  ? "Paused automatically: insufficient balance on Market"
                  : "Paused manually"
              }
            >
              <IconPause />
              {reward.pause_reason === "NO_MONEY" ? "Paused (No balance)" : "Paused"}
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
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 pr-6 line-clamp-2">
          {reward.twitch_title}
        </h3>
        <div className="mb-3">
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
        </div>

        {/* Price info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Market price</p>
            <p className="text-sm font-bold tabular-nums text-foreground">{formattedPrice}</p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Markup</p>
            <p className="text-sm font-bold tabular-nums text-primary">+{reward.twitch_price_markup_percentage}%</p>
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>CD: {reward.global_cooldown_seconds}s</span>
          <span>·</span>
          <span>Max/stream: {reward.max_redemptions_per_stream}</span>
          <span>·</span>
          <span>Max/user/stream: {reward.max_redemptions_per_user_per_stream}</span>
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Form ───────────────────────────────────────────────────────
function RewardForm({
  initial,
  onSubmit,
  loading,
  isEdit = false,
}: {
  initial?: Partial<CreateRewardBody & UpdateRewardBody>;
  onSubmit: (data: CreateRewardBody) => void;
  loading: boolean;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState<CreateRewardBody>({
    market_item_name: initial?.market_item_name ?? "",
    twitch_title: initial?.twitch_title ?? "",
    twitch_description: initial?.twitch_description ?? "",
    permissible_market_price_deviation: initial?.permissible_market_price_deviation ?? 10,
    twitch_price_markup_percentage: initial?.twitch_price_markup_percentage ?? 50,
    global_cooldown_seconds: initial?.global_cooldown_seconds ?? 60,
    max_redemptions_per_stream: initial?.max_redemptions_per_stream ?? 0,
    max_redemptions_per_user_per_stream: initial?.max_redemptions_per_user_per_stream ?? 0,
    market_autobuy: initial?.market_autobuy ?? true,
    is_paused: initial?.is_paused ?? false,
  });

  const field = (key: keyof CreateRewardBody) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      const numKeys: (keyof CreateRewardBody)[] = [
        "permissible_market_price_deviation",
        "twitch_price_markup_percentage",
        "global_cooldown_seconds",
        "max_redemptions_per_stream",
        "max_redemptions_per_user_per_stream",
      ];
      setForm((f) => ({
        ...f,
        [key]: numKeys.includes(key) ? Number(v) : v,
      }));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="market_item_name">Market Item Name</Label>
          {isEdit && (
            <span className="text-xs text-muted-foreground">Cannot be changed after creation</span>
          )}
        </div>
        <Input
          id="market_item_name"
          placeholder="AWP | Asiimov (Field-Tested)"
          required
          disabled={isEdit}
          className={cn(isEdit && "opacity-70 bg-muted/40 cursor-not-allowed")}
          {...field("market_item_name")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitch_title">Twitch Reward Title</Label>
        <Input id="twitch_title" placeholder="Get AWP Asiimov" required {...field("twitch_title")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitch_description">Description</Label>
        <Textarea id="twitch_description" placeholder="Redeem to get this skin delivered to your Steam account." rows={2} {...field("twitch_description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="twitch_price_markup_percentage">Price Markup %</Label>
          <Input id="twitch_price_markup_percentage" type="number" min={0} max={4900} required {...field("twitch_price_markup_percentage")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="permissible_market_price_deviation">Max Deviation %</Label>
          <Input id="permissible_market_price_deviation" type="number" min={0} max={100} required {...field("permissible_market_price_deviation")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="global_cooldown_seconds">Global Cooldown (s)</Label>
          <Input id="global_cooldown_seconds" type="number" min={0} {...field("global_cooldown_seconds")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_redemptions_per_stream">Max / Stream</Label>
          <Input id="max_redemptions_per_stream" type="number" min={0} {...field("max_redemptions_per_stream")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_redemptions_per_user_per_stream">Max / User / Stream</Label>
          <Input id="max_redemptions_per_user_per_stream" type="number" min={0} {...field("max_redemptions_per_user_per_stream")} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.market_autobuy}
            onChange={(e) => setForm((f) => ({ ...f, market_autobuy: e.target.checked }))}
            className="rounded accent-primary"
          />
          <span className="text-sm">Auto-buy from market</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_paused}
            onChange={(e) => setForm((f) => ({ ...f, is_paused: e.target.checked }))}
            className="rounded accent-primary"
          />
          <span className="text-sm">Create as paused</span>
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Save Reward"}
      </Button>
    </form>
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

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-4 pr-6">
              {/* Skin thumbnail */}
              <SkinImage
                marketItemName={reward.market_item_name}
                size={150}
                className="rounded-xl flex-shrink-0 border border-border"
                style={{ width: 96, height: 72 }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <DialogTitle className="text-lg">{reward.twitch_title}</DialogTitle>
                  {reward.is_paused && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs gap-1",
                        reward.pause_reason === "NO_MONEY"
                          ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                          : "status-failed-refund"
                      )}
                    >
                      <IconPause />
                      {reward.pause_reason === "NO_MONEY" ? "Paused (No balance)" : "Paused"}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="flex items-center gap-1.5 flex-wrap mt-1">
                  <a
                    href={`https://market.csgo.com/en/?search=${encodeURIComponent(reward.market_item_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    title={`View "${reward.market_item_name}" on Market`}
                  >
                    <span>{reward.market_item_name}</span>
                    <IconExternalLink />
                  </a>
                  <span>·</span>
                  <span>{formatMinorCurrency(reward.current_market_price, reward.currency)}</span>
                </DialogDescription>
              </div>
            </div>
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
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowIconDownloader(true)}
            >
              <IconDownload />
              Download Icon
            </Button>
          </div>

          <Separator className="my-2" />

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="edit">Edit Reward</TabsTrigger>
              <TabsTrigger value="redemptions">Recent Redemptions</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4">
              <RewardForm
                initial={reward}
                isEdit={true}
                onSubmit={(data) => {
                  const { market_item_name: _, ...updateData } = data;
                  updateMutation.mutate(updateData);
                }}
                loading={updateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="redemptions" className="mt-4">
              <RedemptionList channelId={channelId} rewardId={reward.twitch_id} compact />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <SkinIconDownloader
        marketItemName={reward.market_item_name}
        open={showIconDownloader}
        onClose={() => setShowIconDownloader(false)}
      />
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Reward</DialogTitle>
          <DialogDescription>
            The reward will be created on Twitch and linked to the market item.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <RewardForm
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
          />
          {createMutation.error && (
            <p className="text-sm text-destructive mt-2">
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
  onPause,
  onUnpause,
  onDelete,
  onClear,
  loading,
}: {
  count: number;
  onPause: () => void;
  onUnpause: () => void;
  onDelete: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5">
      <span className="text-sm font-medium text-primary">{count} selected</span>
      <Separator orientation="vertical" className="h-4" />
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onPause} disabled={loading}>
        <IconPause /> Pause all
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onUnpause} disabled={loading}>
        <IconPlay /> Unpause all
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={onDelete} disabled={loading}>
        <IconTrash /> Delete all
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 text-xs ml-auto" onClick={onClear}>
        <IconClose /> Clear
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rewards.filter((r) => {
      if (filterPaused === "paused" && !r.is_paused) return false;
      if (filterPaused === "active" && r.is_paused) return false;
      if (!q) return true;
      return (
        r.twitch_title.toLowerCase().includes(q) ||
        r.market_item_name.toLowerCase().includes(q) ||
        r.twitch_description.toLowerCase().includes(q)
      );
    });
  }, [rewards, search, filterPaused]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
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

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterPaused(f)}
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onPause={() => batchMutation.mutate("pause")}
          onUnpause={() => batchMutation.mutate("unpause")}
          onDelete={() => {
            if (confirm(`Delete ${selectedIds.size} rewards?`)) batchMutation.mutate("delete");
          }}
          onClear={() => setSelectedIds(new Set())}
          loading={batchMutation.isPending}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-3">
          <p className="text-muted-foreground">No rewards found</p>
          <Button variant="outline" onClick={() => { setSearch(""); setFilterPaused("all"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.twitch_id}
              reward={reward}
              selected={selectedIds.has(reward.twitch_id)}
              onSelect={toggleSelect}
              onClick={() => setEditingReward(reward)}
            />
          ))}
        </div>
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
