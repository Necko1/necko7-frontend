import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { chatApi } from "@/lib/apiClient";
import type { ChatMessage, RedemptionResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import SkinImage from "@/components/common/SkinImage";
import { formatMinorCurrency } from "@/lib/currency";

const PAGE_SIZE = 50;
const REDEMPTION_PAGE_SIZE = 9;

// ── Time window options ────────────────────────────────────────────────────────
const TIME_WINDOWS: { label: string; value: number | null }[] = [
  { label: "All time", value: null },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ORDER_CREATED: "Order Created",
  COMPLETED: "Completed",
  FAILED_REFUND: "Refunded",
  FAILED_PENALTY: "Penalized",
  Pending: "Pending",
  OrderCreated: "Order Created",
  Completed: "Completed",
  FailedRefund: "Refunded",
  FailedPenalty: "Penalized",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "status-pending",
  ORDER_CREATED: "status-order-created",
  COMPLETED: "status-completed",
  FAILED_REFUND: "status-failed-refund",
  FAILED_PENALTY: "status-failed-penalty",
  Pending: "status-pending",
  OrderCreated: "status-order-created",
  Completed: "status-completed",
  FailedRefund: "status-failed-refund",
  FailedPenalty: "status-failed-penalty",
};

// ── Icons ────────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-all",
        copied
          ? "border-green-500/40 text-green-500 bg-green-500/10"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
      )}
    >
      <IconCopy />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors space-y-1.5">
      <p className="text-sm text-foreground leading-snug break-words">{msg.message_text}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{format(new Date(msg.sent_at), "dd MMM yyyy HH:mm:ss")}</span>
        <span>·</span>
        <span>{msg.char_count} chars</span>
      </div>
    </div>
  );
}

// ── Redemption Card ───────────────────────────────────────────────────────────
function RedemptionCard({ redemption }: { redemption: RedemptionResponse }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/30 transition-all group">
      {/* Skin image */}
      <div className="aspect-square bg-muted/20 relative overflow-hidden">
        <SkinImage
          marketItemName={redemption.market_item_name}
          size={150}
          className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
          fallbackClassName="w-full h-full flex items-center justify-center bg-muted/20"
        />
        <div className="absolute top-2 right-2">
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 font-medium border rounded-md",
              STATUS_CLASSES[redemption.status] || "status-pending"
            )}
          >
            {STATUS_LABELS[redemption.status] || redemption.status}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
            {redemption.market_item_name ?? "Twitch Reward"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            <IconCalendar />
            {" "}{format(new Date(redemption.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-primary tabular-nums">
            {redemption.twitch_points_cost.toLocaleString()} pts
          </span>
          {redemption.market_paid_price != null && (
            <span className="text-muted-foreground tabular-nums">
              {formatMinorCurrency(redemption.market_paid_price, redemption.currency)}
            </span>
          )}
        </div>

        {/* Trade link */}
        {redemption.user_trade_link && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-auto">
            <CopyButton text={redemption.user_trade_link} />
            <a
              href={redemption.user_trade_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <IconExternalLink />
              Trade link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";

  const [timeWindow, setTimeWindow] = useState<number | null>(null);

  // Messages state
  const [msgOffset, setMsgOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const msgPrevKeyRef = useRef("");

  // Redemptions state
  const [redOffset, setRedOffset] = useState(0);
  const [allRedemptions, setAllRedemptions] = useState<RedemptionResponse[]>([]);
  const redPrevKeyRef = useRef("");

  if (!channelId || !userId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["userSummary", channelId, userId],
    queryFn: () => chatApi.getUserSummary(channelId, userId).then((r) => r.data),
    enabled: !!channelId && !!userId,
    staleTime: 60_000,
  });

  const { data: periodStats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats", channelId, userId, timeWindow],
    queryFn: () =>
      chatApi
        .getUserStats(channelId, userId, { time_window_hours: timeWindow })
        .then((r) => r.data),
    enabled: !!channelId && !!userId,
    staleTime: 30_000,
  });

  const msgQueryKey = `${channelId}:${userId}:${timeWindow}`;
  if (msgQueryKey !== msgPrevKeyRef.current) {
    msgPrevKeyRef.current = msgQueryKey;
    setMsgOffset(0);
    setAllMessages([]);
  }

  const { data: messagesData, isFetching: msgsFetching } = useQuery({
    queryKey: ["userMessages", channelId, userId, timeWindow, msgOffset],
    queryFn: () =>
      chatApi
        .getUserMessages(channelId, userId, {
          time_window_hours: timeWindow,
          offset: msgOffset,
          limit: PAGE_SIZE,
        })
        .then((r) => r.data),
    enabled: !!channelId && !!userId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Accumulate messages
  if (messagesData && !msgsFetching) {
    const newIds = new Set(allMessages.map((m) => m.id));
    const toAdd = messagesData.items.filter((m) => !newIds.has(m.id));
    if (toAdd.length > 0 || (msgOffset === 0 && allMessages.length === 0)) {
      setAllMessages((prev) => (msgOffset === 0 ? messagesData.items : [...prev, ...toAdd]));
    }
  }

  const redQueryKey = `${channelId}:${userId}:reds`;
  if (redQueryKey !== redPrevKeyRef.current) {
    redPrevKeyRef.current = redQueryKey;
    setRedOffset(0);
    setAllRedemptions([]);
  }

  const { data: redemptionsData, isFetching: redsFetching } = useQuery({
    queryKey: ["userRedemptions", channelId, userId, redOffset],
    queryFn: () =>
      chatApi
        .getUserRedemptions(channelId, userId, {
          offset: redOffset,
          limit: REDEMPTION_PAGE_SIZE,
        })
        .then((r) => r.data),
    enabled: !!channelId && !!userId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Accumulate redemptions
  if (redemptionsData && !redsFetching) {
    const newIds = new Set(allRedemptions.map((r) => r.twitch_redemption_id));
    const toAdd = redemptionsData.items.filter((r) => !newIds.has(r.twitch_redemption_id));
    if (toAdd.length > 0 || (redOffset === 0 && allRedemptions.length === 0)) {
      setAllRedemptions((prev) =>
        redOffset === 0 ? redemptionsData.items : [...prev, ...toAdd]
      );
    }
  }

  const msgHasMore = messagesData ? allMessages.length < messagesData.total : false;
  const redHasMore = redemptionsData ? allRedemptions.length < redemptionsData.total : false;

  const avgCharsPerMsg =
    periodStats && periodStats.message_count > 0
      ? Math.round(periodStats.char_count / periodStats.message_count)
      : 0;

  const displayMessages = allMessages.length > 0 ? allMessages : messagesData?.items ?? [];
  const displayRedemptions = allRedemptions.length > 0 ? allRedemptions : redemptionsData?.items ?? [];

  const userLogin = summary?.chatter_user_login ?? userId;

  return (
    <div className="p-8 space-y-6">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate("/chat")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconArrowLeft />
        Back to Leaderboard
      </button>

      {/* Profile header */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
        {summaryLoading ? (
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{
              background: `hsl(${[...userLogin].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 55%, 42%)`,
            }}
          >
            {userLogin.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          {summaryLoading ? (
            <>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">@{userLogin}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono text-foreground/60">{userId}</span>
                {summary?.first_seen_at && (
                  <span className="flex items-center gap-1">
                    <IconCalendar />
                    First seen {format(new Date(summary.first_seen_at), "dd MMM yyyy")}
                  </span>
                )}
                {summary?.last_seen_at && (
                  <span>
                    Last active{" "}
                    {formatDistanceToNow(new Date(summary.last_seen_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {/* Lifetime totals */}
        {summary && (
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {summary.total_messages.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">total msgs</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {summary.total_chars.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">total chars</p>
            </div>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">Period:</span>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={String(tw.value)}
              type="button"
              onClick={() => setTimeWindow(tw.value)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                timeWindow === tw.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Messages"
          value={statsLoading ? "—" : (periodStats?.message_count ?? 0)}
          sub={timeWindow ? `Last ${TIME_WINDOWS.find((t) => t.value === timeWindow)?.label}` : "All time"}
        />
        <StatCard
          label="Characters"
          value={statsLoading ? "—" : (periodStats?.char_count ?? 0)}
          sub={timeWindow ? `Last ${TIME_WINDOWS.find((t) => t.value === timeWindow)?.label}` : "All time"}
        />
        <StatCard
          label="Avg chars / msg"
          value={statsLoading ? "—" : avgCharsPerMsg}
          sub="in selected period"
        />
      </div>

      {/* Two-column content: messages | redemptions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Message history */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Message History
              {messagesData && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  ({messagesData.total.toLocaleString()} total)
                </span>
              )}
            </h2>
            {msgsFetching && (
              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          <div className="space-y-2">
            {statsLoading && allMessages.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))
              : displayMessages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
          </div>

          {msgHasMore && (
            <button
              type="button"
              onClick={() => setMsgOffset((o) => o + PAGE_SIZE)}
              disabled={msgsFetching}
              className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
            >
              {msgsFetching
                ? "Loading…"
                : `Load more (${messagesData!.total - displayMessages.length} remaining)`}
            </button>
          )}

          {!statsLoading && displayMessages.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No messages in this period.
            </div>
          )}
        </div>

        {/* Right: Redemptions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Redemptions
              {redemptionsData && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  ({redemptionsData.total.toLocaleString()} total)
                </span>
              )}
            </h2>
            {redsFetching && (
              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {redsFetching && allRedemptions.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))
              : displayRedemptions.map((r) => (
                  <RedemptionCard key={r.twitch_redemption_id} redemption={r} />
                ))}
          </div>

          {redHasMore && (
            <button
              type="button"
              onClick={() => setRedOffset((o) => o + REDEMPTION_PAGE_SIZE)}
              disabled={redsFetching}
              className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
            >
              {redsFetching
                ? "Loading…"
                : `Load more (${redemptionsData!.total - displayRedemptions.length} remaining)`}
            </button>
          )}

          {!redsFetching && displayRedemptions.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No redemptions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
