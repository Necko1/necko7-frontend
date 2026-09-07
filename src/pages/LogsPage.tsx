import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { logsApi } from "@/lib/apiClient";
import type {
  ChannelLogLevel,
  ChannelLogCategory,
  ChannelLogResponse,
  ListChannelLogsQuery,
} from "@/types/api";
import { cn } from "@/lib/utils";
import { format, subHours, subDays, parseISO, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// ── Level & Category Definitions ──────────────────────────────────────────
const LEVELS: { value: ChannelLogLevel | ""; label: string; color: string; badgeClass: string }[] = [
  { value: "", label: "ALL", color: "text-foreground", badgeClass: "border-border text-foreground" },
  { value: "ERROR", label: "ERROR", color: "text-rose-400", badgeClass: "border-rose-500/30 text-rose-400 bg-rose-500/10" },
  { value: "WARN", label: "WARN", color: "text-amber-400", badgeClass: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  { value: "INFO", label: "INFO", color: "text-sky-400", badgeClass: "border-sky-500/30 text-sky-400 bg-sky-500/10" },
  { value: "DEBUG", label: "DEBUG", color: "text-zinc-400", badgeClass: "border-zinc-500/30 text-zinc-400 bg-zinc-500/10" },
];

const CATEGORIES: { value: ChannelLogCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "REDEMPTION", label: "Redemption" },
  { value: "REWARD", label: "Reward" },
  { value: "MARKET", label: "Market" },
  { value: "BOT", label: "Bot" },
  { value: "AUTH", label: "Auth" },
  { value: "SYSTEM", label: "System" },
];

const TIME_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "All", hours: null },
] as const;

const PAGE_SIZES = [25, 50, 100, 200];

// ── Icons ──────────────────────────────────────────────────────────────────
const IconRefresh = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("transition-transform", spinning && "animate-spin")}
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
function formatLogTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "yyyy-MM-dd HH:mm:ss.SSS");
  } catch {
    return dateStr;
  }
}

function getLevelBadgeStyle(level: ChannelLogLevel) {
  switch (level) {
    case "ERROR":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "WARN":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "INFO":
      return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    case "DEBUG":
      return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    default:
      return "text-muted-foreground bg-muted/20 border-border";
  }
}

function getCategoryBadgeStyle(category: ChannelLogCategory) {
  switch (category) {
    case "MARKET":
      return "text-teal-400 bg-teal-500/10 border-teal-500/20";
    case "REDEMPTION":
      return "text-violet-400 bg-violet-500/10 border-violet-500/20";
    case "REWARD":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "BOT":
      return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "AUTH":
      return "text-pink-400 bg-pink-500/10 border-pink-500/20";
    case "SYSTEM":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    default:
      return "text-muted-foreground bg-muted/20 border-border";
  }
}

// ── Console Log Item Component ─────────────────────────────────────────────
interface ConsoleLogItemProps {
  log: ChannelLogResponse;
  isExpanded: boolean;
  onToggle: () => void;
}

function ConsoleLogItem({ log, isExpanded, onToggle }: ConsoleLogItemProps) {
  const [copied, setCopied] = useState(false);

  const copyDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = {
      id: log.id,
      timestamp: log.created_at,
      level: log.level,
      category: log.category,
      event_type: log.event_type,
      message: log.message,
      solution_hint: log.solution_hint,
      details: log.details,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasDetails = log.details && Object.keys(log.details).length > 0;
  const hasSolution = !!log.solution_hint;

  return (
    <div
      className={cn(
        "group border-b border-white/[0.04] transition-colors",
        isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
      )}
    >
      {/* Main Single-Line Console Row */}
      <div
        onClick={onToggle}
        className="flex items-baseline gap-3 px-3 py-2 text-xs font-mono cursor-pointer select-text overflow-x-auto"
      >
        {/* Timestamp */}
        <span className="text-muted-foreground/60 shrink-0 tabular-nums select-none">
          {formatLogTimestamp(log.created_at)}
        </span>

        {/* Level Tag */}
        <span
          className={cn(
            "px-1.5 py-0.2 rounded text-[11px] font-semibold tracking-wide border shrink-0 select-none",
            getLevelBadgeStyle(log.level)
          )}
        >
          {log.level.padEnd(5, " ")}
        </span>

        {/* Category Tag */}
        <span
          className={cn(
            "px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider border shrink-0 select-none",
            getCategoryBadgeStyle(log.category)
          )}
        >
          [{log.category}]
        </span>

        {/* Event Type (optional inline indicator if present) */}
        <span className="text-muted-foreground/80 shrink-0 select-none">
          {log.event_type}
        </span>

        {/* Message */}
        <span className="text-foreground flex-1 min-w-[200px] break-words">
          {log.message}
        </span>

        {/* Expand indicator / hint on hover */}
        {(hasDetails || hasSolution) && (
          <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none">
            {isExpanded ? "collapse" : "details"}
          </span>
        )}
      </div>

      {/* Expanded Console Details (Indented, No tree symbols/chevrons) */}
      {isExpanded && (
        <div className="pl-10 pr-4 pb-3 pt-1 text-xs font-mono space-y-2 select-text border-t border-white/[0.02]">
          {/* event_type line */}
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground/70 w-32 shrink-0">event_type:</span>
            <span className="text-primary font-medium">{log.event_type}</span>
          </div>

          {/* solution_hint line if present */}
          {hasSolution && (
            <div className="flex items-baseline gap-2 text-amber-300">
              <span className="text-amber-400/80 w-32 shrink-0 font-semibold">solution_hint:</span>
              <span className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-200 break-words flex-1">
                {log.solution_hint}
              </span>
            </div>
          )}

          {/* details formatted as pretty JSON */}
          {hasDetails && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground/70 w-32 shrink-0">details:</span>
                <button
                  type="button"
                  onClick={copyDetails}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-card hover:bg-muted/40 transition-colors"
                >
                  {copied ? <IconCheck /> : <IconCopy />}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-black/40 border border-border/40 text-foreground/90 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Log metadata & ID */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 pt-1">
            <span>Log ID: #{log.id} · Broadcaster ID: {log.broadcaster_id}</span>
            <button
              type="button"
              onClick={copyDetails}
              className="hover:text-foreground transition-colors underline"
            >
              Copy full record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main LogsPage ──────────────────────────────────────────────────────────
export default function LogsPage() {
  const { selectedBroadcasterId, broadcasters } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const qc = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state from query parameters or defaults
  const initialLevel = (searchParams.get("level") as ChannelLogLevel) || "";
  const [levelFilter, setLevelFilter] = useState<ChannelLogLevel | "">(initialLevel);
  const [categoryFilter, setCategoryFilter] = useState<ChannelLogCategory | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [presetHours, setPresetHours] = useState<number | null>(24);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0); // 0-indexed page

  // Expanded log IDs set
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Keep levelFilter in sync if URL query changes (e.g. from Dashboard widget click)
  useEffect(() => {
    const qLevel = searchParams.get("level") as ChannelLogLevel | null;
    if (qLevel && (qLevel === "ERROR" || qLevel === "WARN" || qLevel === "INFO" || qLevel === "DEBUG")) {
      setLevelFilter(qLevel);
    }
  }, [searchParams]);

  // Compute ISO time boundaries
  const { fromIso, toIso } = useMemo(() => {
    if (isCustomDate) {
      const f = customFrom ? new Date(customFrom).toISOString() : null;
      const t = customTo ? new Date(customTo).toISOString() : null;
      return { fromIso: f, toIso: t };
    }
    if (presetHours !== null) {
      const now = new Date();
      const f = subHours(now, presetHours).toISOString();
      return { fromIso: f, toIso: null };
    }
    return { fromIso: null, toIso: null };
  }, [isCustomDate, presetHours, customFrom, customTo]);

  // Query logs list
  const queryParams: ListChannelLogsQuery = useMemo(() => {
    return {
      level: levelFilter || null,
      category: categoryFilter || null,
      search: activeSearch.trim() || null,
      from: fromIso,
      to: toIso,
      offset: page * pageSize,
      limit: pageSize,
    };
  }, [levelFilter, categoryFilter, activeSearch, fromIso, toIso, page, pageSize]);

  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["channel-logs", channelId, queryParams],
    queryFn: () => logsApi.list(channelId, queryParams).then((r) => r.data),
    enabled: !!channelId,
    staleTime: 10_000,
  });

  // Query 24h summary
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["logs-summary", channelId],
    queryFn: () => logsApi.summary(channelId).then((r) => r.data),
    enabled: !!channelId,
    staleTime: 15_000,
  });

  const handleRefresh = () => {
    refetchLogs();
    refetchSummary();
  };

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(0);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!logsData?.items) return;
    setExpandedIds(new Set(logsData.items.map((item) => item.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const totalLogs = logsData?.total ?? 0;
  const totalPages = Math.ceil(totalLogs / pageSize);
  const startRecord = totalLogs > 0 ? page * pageSize + 1 : 0;
  const endRecord = Math.min((page + 1) * pageSize, totalLogs);

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  const hasActiveFilters =
    !!levelFilter ||
    !!categoryFilter ||
    !!activeSearch ||
    isCustomDate ||
    presetHours !== 24;

  const resetFilters = () => {
    setLevelFilter("");
    setCategoryFilter("");
    setSearchInput("");
    setActiveSearch("");
    setPresetHours(24);
    setIsCustomDate(false);
    setCustomFrom("");
    setCustomTo("");
    setPage(0);
    setSearchParams({});
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channel Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System events, audit records, and automated bot diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={logsFetching}
            className="gap-2"
          >
            <IconRefresh spinning={logsFetching} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 24h Summary Bar (Interactive Counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Errors */}
        <div
          onClick={() => {
            setLevelFilter("ERROR");
            setPage(0);
          }}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            levelFilter === "ERROR"
              ? "border-rose-500 bg-rose-500/15 shadow-sm shadow-rose-500/10"
              : (summary?.errors_last_24h ?? 0) > 0
              ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
              : "border-border bg-card hover:border-border/80"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-rose-400">Errors (24h)</span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Click to filter</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className={cn("text-2xl font-bold tabular-nums", (summary?.errors_last_24h ?? 0) > 0 ? "text-rose-400" : "text-foreground")}>
              {summary?.errors_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Warnings */}
        <div
          onClick={() => {
            setLevelFilter("WARN");
            setPage(0);
          }}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            levelFilter === "WARN"
              ? "border-amber-500 bg-amber-500/15 shadow-sm shadow-amber-500/10"
              : (summary?.warnings_last_24h ?? 0) > 0
              ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
              : "border-border bg-card hover:border-border/80"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-amber-400">Warnings (24h)</span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Click to filter</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className={cn("text-2xl font-bold tabular-nums", (summary?.warnings_last_24h ?? 0) > 0 ? "text-amber-400" : "text-foreground")}>
              {summary?.warnings_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Info */}
        <div
          onClick={() => {
            setLevelFilter("INFO");
            setPage(0);
          }}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            levelFilter === "INFO"
              ? "border-sky-500 bg-sky-500/15 shadow-sm shadow-sky-500/10"
              : "border-border bg-card hover:border-sky-500/40"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sky-400">Info (24h)</span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Click to filter</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {summary?.info_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Total */}
        <div
          onClick={() => {
            setLevelFilter("");
            setPage(0);
          }}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            levelFilter === ""
              ? "border-primary/60 bg-card shadow-sm shadow-primary/10"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-foreground">Total (24h)</span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Reset level</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {summary?.total_last_24h ?? 0}
            </p>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        {/* Row 1: Level Pills + Category + Quick Presets + Custom Date Button */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1 flex-wrap">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => {
                  setLevelFilter(lvl.value);
                  setPage(0);
                  if (lvl.value) setSearchParams({ level: lvl.value });
                  else setSearchParams({});
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold font-mono transition-all select-none",
                  levelFilter === lvl.value
                    ? cn("bg-primary text-primary-foreground shadow-sm", lvl.value && lvl.color && "bg-white/10")
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ChannelLogCategory | "");
                setPage(0);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-muted/20 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-card text-foreground">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Presets & Custom Range Toggle */}
          <div className="flex items-center gap-2">
            {!isCustomDate ? (
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setPresetHours(p.hours);
                      setPage(0);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all select-none",
                      presetHours === p.hours
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : null}

            <Button
              variant={isCustomDate ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setIsCustomDate(!isCustomDate);
                setPage(0);
              }}
              className="gap-1.5 text-xs h-9"
            >
              <IconCalendar />
              {isCustomDate ? "Presets" : "Custom Dates"}
            </Button>
          </div>
        </div>

        {/* Row 2: Custom Dates input (if opened) */}
        {isCustomDate && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">From:</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setPage(0);
                }}
                className="h-8 px-2.5 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">To:</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setPage(0);
                }}
                className="h-8 px-2.5 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>
            {(customFrom || customTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setPage(0);
                }}
                className="text-xs h-8 px-2 text-muted-foreground"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}

        {/* Row 3: Search input + Page size + Clear filters */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Substring Search Form */}
          <form onSubmit={handleApplySearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Search message or event type…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-muted/20 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs">
              Search
            </Button>
            {activeSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="h-9 px-2 text-xs text-muted-foreground gap-1"
              >
                <IconX />
                Clear
              </Button>
            )}
          </form>

          {/* Page size & Expand Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Expand all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Collapse all
              </Button>
            </div>

            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span className="text-xs text-muted-foreground">Rows:</span>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-0.5">
                {PAGE_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPageSize(s);
                      setPage(0);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-all select-none",
                      pageSize === s
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-rose-400 gap-1 border-l border-border pl-3 rounded-none"
              >
                <IconX />
                Reset filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Console Stream Container */}
      <div className="rounded-2xl border border-border/80 bg-[#14100c] shadow-2xl overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/[0.06] text-xs font-mono select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-muted-foreground/80 font-medium ml-2">
              terminal://channel-logs
            </span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground/60 text-[11px]">
            {logsLoading ? (
              <span>Reading stream…</span>
            ) : (
              <span>
                {totalLogs.toLocaleString()} total record{totalLogs !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Log Stream Body */}
        <div className="min-h-[400px]">
          {logsLoading ? (
            <div className="p-4 space-y-3 font-mono text-xs">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <Skeleton className="h-4 w-40 bg-white/[0.05]" />
                  <Skeleton className="h-4 w-16 bg-white/[0.05]" />
                  <Skeleton className="h-4 w-20 bg-white/[0.05]" />
                  <Skeleton className="h-4 w-64 bg-white/[0.05]" />
                </div>
              ))}
            </div>
          ) : !logsData?.items || logsData.items.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-3 font-mono text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">No logs recorded for this criteria</p>
              <p className="max-w-md">
                Try loosening your filters, selecting a wider time range, or waiting for new bot activity.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                  Reset all filters
                </Button>
              )}
            </div>
          ) : (
            <div>
              {logsData.items.map((log) => (
                <ConsoleLogItem
                  key={log.id}
                  log={log}
                  isExpanded={expandedIds.has(log.id)}
                  onToggle={() => toggleExpand(log.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalLogs > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground tabular-nums">{startRecord}</span>–
            <span className="font-semibold text-foreground tabular-nums">{endRecord}</span> of{" "}
            <span className="font-semibold text-foreground tabular-nums">{totalLogs.toLocaleString()}</span> logs
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || logsLoading}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>

            <span className="px-3 py-1 font-mono text-xs tabular-nums text-foreground">
              Page {page + 1} / {Math.max(1, totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || logsLoading}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
