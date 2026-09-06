import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { chatApi } from "@/lib/apiClient";
import type { ChatMessage } from "@/types/api";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const TIME_WINDOWS: { label: string; value: number | null }[] = [
  { label: "All time", value: null },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

const PAGE_SIZE = 50;

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconRefresh = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={cn("transition-transform", spinning && "animate-spin")}
  >
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconMessageSquare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// ── Date grouping helper ───────────────────────────────────────────────────
function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMMM yyyy");
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return format(date, "yyyy-MM-dd");
}

// ── Stream Chat Message Row ────────────────────────────────────────────────
function ChannelMessageRow({ msg }: { msg: ChatMessage }) {
  const date = new Date(msg.sent_at);
  const timeStr = !isNaN(date.getTime()) ? format(date, "HH:mm:ss") : "–";
  const hue = [...msg.chatter_user_login].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="group flex items-start gap-3 py-1.5 px-3 rounded-lg hover:bg-muted/40 transition-colors text-sm leading-relaxed"
      title={`${msg.char_count} characters · sent at ${timeStr}`}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground/60 tabular-nums shrink-0 pt-0.5 select-none font-mono">
        {timeStr}
      </span>

      {/* Chatter username */}
      <Link
        to={`/chat/users/${msg.chatter_user_id}`}
        className="font-semibold text-xs shrink-0 pt-0.5 hover:underline transition-colors"
        style={{ color: `hsl(${hue}, 70%, 62%)` }}
      >
        @{msg.chatter_user_login}:
      </Link>

      {/* Message content */}
      <p className="text-foreground break-words flex-1 min-w-0 font-normal">
        {msg.message_text}
      </p>

      {/* Tooltip badge for character count on hover */}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground/60 tabular-nums shrink-0 pt-0.5 select-none font-mono">
        {msg.char_count} chars
      </span>
    </div>
  );
}

export default function ChatMessagesPage() {
  const { selectedBroadcasterId, getSelectedBroadcaster } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const broadcaster = getSelectedBroadcaster();

  const [timeWindow, setTimeWindow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [chatterFilter, setChatterFilter] = useState("");
  const [debouncedChatter, setDebouncedChatter] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // Debounced chatter filter
  const handleChatterChange = (val: string) => {
    setChatterFilter(val);
    if (chatterTimerRef.current) clearTimeout(chatterTimerRef.current);
    chatterTimerRef.current = setTimeout(() => setDebouncedChatter(val.trim()), 400);
  };

  // Reset when filters change
  useEffect(() => {
    setOffset(0);
    setAllMessages([]);
  }, [channelId, timeWindow, debouncedSearch, debouncedChatter, refreshKey]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "channelMessages",
      channelId,
      timeWindow,
      debouncedSearch,
      debouncedChatter,
      offset,
      refreshKey,
    ],
    queryFn: () =>
      chatApi
        .getChannelMessages(channelId, {
          time_window_hours: timeWindow,
          search: debouncedSearch || null,
          chatter_login: debouncedChatter || null,
          offset,
          limit: PAGE_SIZE,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });

  // Accumulate messages
  useEffect(() => {
    if (!data) return;
    setAllMessages((prev) => {
      if (offset === 0) {
        return data.items;
      }
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = data.items.filter((m) => !existingIds.has(m.id));
      return [...prev, ...fresh];
    });
  }, [data, offset]);

  const displayMessages = allMessages.length > 0 ? allMessages : data?.items ?? [];
  const hasMore = data ? allMessages.length < data.total : false;

  const loadMore = () => {
    if (!isFetching) setOffset((o) => o + PAGE_SIZE);
  };

  // Group messages chronologically by date
  const groupedMessages = useMemo(() => {
    const msgs = allMessages.length > 0 ? allMessages : data?.items ?? [];
    const groups: { dateKey: string; label: string; messages: ChatMessage[] }[] = [];
    const map = new Map<string, { label: string; messages: ChatMessage[] }>();

    for (const msg of msgs) {
      const key = getDateKey(msg.sent_at);
      if (!map.has(key)) {
        const item = { label: formatDateDivider(msg.sent_at), messages: [] };
        map.set(key, item);
        groups.push({ dateKey: key, ...item });
      }
      map.get(key)!.messages.push(msg);
    }
    return groups;
  }, [allMessages, data?.items]);

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Chat Stream
            </h1>
            {data && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {data.total.toLocaleString()} msgs
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {broadcaster?.channel_login ?? "–"} · Live chat history and message search
          </p>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isFetching}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          <IconRefresh spinning={isFetching} />
          Refresh
        </button>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <IconSearch />
          </span>
          <Input
            placeholder="Search message text…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-card rounded-xl text-sm"
          />
        </div>

        {/* Chatter filter */}
        <div className="relative sm:w-60">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <IconUser />
          </span>
          <Input
            placeholder="Filter by @username…"
            value={chatterFilter}
            onChange={(e) => handleChatterChange(e.target.value)}
            className="pl-9 bg-card rounded-xl text-sm"
          />
        </div>

        {/* Time window pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 self-start sm:self-auto shrink-0">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={String(tw.value)}
              type="button"
              onClick={() => setTimeWindow(tw.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                timeWindow === tw.value
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages Feed ── */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-6 shadow-sm space-y-4">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
              <IconMessageSquare />
            </div>
            <p className="text-sm font-medium text-foreground">No chat messages found</p>
            <p className="text-xs max-w-sm">
              {debouncedSearch || debouncedChatter
                ? "Try adjusting your search criteria or time window."
                : "No messages have been recorded for this channel in this time period."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group) => (
              <div key={group.dateKey} className="space-y-1">
                {/* Centered Date Header Divider */}
                <div className="relative flex items-center justify-center py-2 select-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/80" />
                  </div>
                  <div className="relative px-3 py-0.5 rounded-full bg-card border border-border text-[11px] font-semibold text-muted-foreground shadow-xs">
                    {group.label}
                  </div>
                </div>

                {/* Messages under date */}
                <div className="space-y-0.5">
                  {group.messages.map((msg) => (
                    <ChannelMessageRow key={msg.id} msg={msg} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="pt-4 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isFetching}
              className="px-6 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-50"
            >
              {isFetching
                ? "Loading…"
                : `Load older messages (${data!.total - displayMessages.length} remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
