import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { chatApi } from "@/lib/apiClient";
import type { LeaderboardUserItem } from "@/types/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// ── Time window options ──────────────────────────────────────────────────────
const TIME_WINDOWS: { label: string; value: number | null }[] = [
  { label: "All time", value: null },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

const PAGE_SIZE = 50;

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

const IconChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconMessageSquare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconText = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

// ── Medal badge ───────────────────────────────────────────────────────────────
function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-yellow-500/20 text-yellow-400 text-xs font-bold ring-1 ring-yellow-500/40">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-slate-400/20 text-slate-300 text-xs font-bold ring-1 ring-slate-400/40">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-amber-700/20 text-amber-600 text-xs font-bold ring-1 ring-amber-700/40">
        3
      </span>
    );
  return (
    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground text-xs font-medium">
      {rank}
    </span>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function UserInitials({ login }: { login: string }) {
  const letter = (login || "?").charAt(0).toUpperCase();
  const hue = [...login].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ background: `hsl(${hue}, 55%, 42%)` }}
    >
      {letter}
    </div>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LeaderboardRow({
  item,
  rank,
  primaryField,
  secondaryField,
  primaryLabel,
  secondaryLabel,
}: {
  item: LeaderboardUserItem;
  rank: number;
  primaryField: "message_count" | "char_count";
  secondaryField: "message_count" | "char_count";
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const topClass =
    rank === 1
      ? "bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/15"
      : rank === 2
      ? "bg-slate-400/5 hover:bg-slate-400/10 border-slate-400/15"
      : rank === 3
      ? "bg-amber-700/5 hover:bg-amber-700/10 border-amber-700/15"
      : "hover:bg-muted/30 border-transparent";

  return (
    <Link
      to={`/chat/users/${item.chatter_user_id}`}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group text-left",
        topClass
      )}
    >
      <MedalBadge rank={rank} />
      <UserInitials login={item.chatter_user_login} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          @{item.chatter_user_login}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-muted-foreground/70">{secondaryLabel}:</span>{" "}
          {item[secondaryField].toLocaleString()}
          {" · "}
          <span className="text-muted-foreground/70">Last:</span>{" "}
          {format(new Date(item.last_seen_at), "dd MMM HH:mm")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary tabular-nums">
          {item[primaryField].toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">{primaryLabel}</p>
      </div>
      <IconChevronRight />
    </Link>
  );
}

// ── Leaderboard column ────────────────────────────────────────────────────────
function LeaderboardColumn({
  channelId,
  sortBy,
  title,
  primaryField,
  secondaryField,
  primaryLabel,
  secondaryLabel,
  timeWindowHours,
  search,
  isFetching,
}: {
  channelId: string;
  sortBy: "messages" | "characters";
  title: string;
  primaryField: "message_count" | "char_count";
  secondaryField: "message_count" | "char_count";
  primaryLabel: string;
  secondaryLabel: string;
  timeWindowHours: number | null;
  search: string;
  isFetching: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<LeaderboardUserItem[]>([]);
  const initialLoadDone = useRef(false);

  const { data, isLoading, isFetching: colFetching } = useQuery({
    queryKey: ["leaderboard", channelId, sortBy, timeWindowHours, search, offset],
    queryFn: () =>
      chatApi
        .getLeaderboard(channelId, {
          sort_by: sortBy,
          time_window_hours: timeWindowHours,
          search: search || null,
          offset,
          limit: PAGE_SIZE,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Accumulate items across pages
  const prevQueryKeyRef = useRef<string>("");
  const queryKey = `${channelId}:${sortBy}:${timeWindowHours}:${search}`;

  if (queryKey !== prevQueryKeyRef.current) {
    prevQueryKeyRef.current = queryKey;
    setOffset(0);
    setAllItems([]);
    initialLoadDone.current = false;
  }

  if (data && !colFetching) {
    if (!initialLoadDone.current || offset > 0) {
      const newIds = new Set(allItems.map((i) => i.chatter_user_id));
      const toAdd = data.items.filter((i) => !newIds.has(i.chatter_user_id));
      if (toAdd.length > 0 || !initialLoadDone.current) {
        setAllItems((prev) => (offset === 0 ? data.items : [...prev, ...toAdd]));
        initialLoadDone.current = true;
      }
    }
  }

  const hasMore = data ? allItems.length < data.total : false;

  const loadMore = () => {
    if (!colFetching) setOffset((o) => o + PAGE_SIZE);
  };

  const displayItems = allItems.length > 0 ? allItems : data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {sortBy === "messages" ? <IconMessageSquare /> : <IconText />}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {data && (
            <p className="text-xs text-muted-foreground">{data.total.toLocaleString()} chatters</p>
          )}
        </div>
        {(isFetching || colFetching) && (
          <div className="ml-auto w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))
          : displayItems.map((item, i) => (
              <LeaderboardRow
                key={item.chatter_user_id}
                item={item}
                rank={i + 1}
                primaryField={primaryField}
                secondaryField={secondaryField}
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
              />
            ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={colFetching}
          className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
        >
          {colFetching ? "Loading…" : `Load more (${data!.total - displayItems.length} remaining)`}
        </button>
      )}

      {displayItems.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <IconMessageSquare />
          <p className="mt-2 text-sm">No chatters found</p>
          {search && <p className="text-xs mt-1">Try adjusting your search</p>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";

  const [timeWindow, setTimeWindow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const [isFetchingGlobal] = useState(false);

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chat Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top chatters ranked by activity in your channel
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="h-9 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center gap-2 text-xs"
        >
          <IconRefresh spinning={false} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Search chatter…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Time window */}
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

      {/* Two-column leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeaderboardColumn
          channelId={channelId}
          sortBy="messages"
          title="Top by Messages"
          primaryField="message_count"
          secondaryField="char_count"
          primaryLabel="messages"
          secondaryLabel="chars"
          timeWindowHours={timeWindow}
          search={debouncedSearch}
          isFetching={isFetchingGlobal}
        />
        <LeaderboardColumn
          channelId={channelId}
          sortBy="characters"
          title="Top by Characters"
          primaryField="char_count"
          secondaryField="message_count"
          primaryLabel="characters"
          secondaryLabel="msgs"
          timeWindowHours={timeWindow}
          search={debouncedSearch}
          isFetching={isFetchingGlobal}
        />
      </div>
    </div>
  );
}
