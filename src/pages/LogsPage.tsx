import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { logsApi } from "@/lib/apiClient";
import type {
  ChannelLogLevel,
  ChannelLogCategory,
  ChannelLogResponse,
  ListChannelLogsQuery,
} from "@/types/api";
import { cn } from "@/lib/utils";
import { format, subHours, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// ── Level & Category Definitions ──────────────────────────────────────────
const LEVELS: { value: ChannelLogLevel | ""; label: string }[] = [
  { value: "", label: "ALL" },
  { value: "ERROR", label: "ERROR" },
  { value: "WARN", label: "WARN" },
  { value: "INFO", label: "INFO" },
  { value: "DEBUG", label: "DEBUG" },
];

const CATEGORIES: { value: ChannelLogCategory | ""; label: string }[] = [
  { value: "", label: "ALL" },
  { value: "REDEMPTION", label: "REDEMPTION" },
  { value: "REWARD", label: "REWARD" },
  { value: "MARKET", label: "MARKET" },
  { value: "BOT", label: "BOT" },
  { value: "AUTH", label: "AUTH" },
  { value: "SYSTEM", label: "SYSTEM" },
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
  const { t } = useTranslation();
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
        className="flex items-baseline gap-3 px-4 py-2 text-xs font-mono cursor-pointer select-text"
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

        {/* Event Type */}
        <span className="text-muted-foreground/80 shrink-0 select-none">
          {log.event_type}
        </span>

        {/* Message */}
        <span className="text-foreground flex-1 min-w-[200px] break-words">
          {log.message}
        </span>

        {/* Expand indicator on hover */}
        {(hasDetails || hasSolution) && (
          <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none">
            {isExpanded ? t("logs.collapseAll") : t("logs.expandAll")}
          </span>
        )}
      </div>

      {/* Expanded Console Details (Indented, No tree symbols/chevrons) */}
      {isExpanded && (
        <div className="pl-12 pr-4 pb-3 pt-1 text-xs font-mono space-y-2 select-text border-t border-white/[0.02]">
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
                  {copied ? t("logs.copied") : t("logs.copyJson")}
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
              {t("logs.copyJson")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main LogsPage ──────────────────────────────────────────────────────────
export default function LogsPage() {
  const { t } = useTranslation();
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const initialLevel = (searchParams.get("level") as ChannelLogLevel) || "";
  const [levelFilter, setLevelFilter] = useState<ChannelLogLevel | "">(initialLevel);
  const [categoryFilter, setCategoryFilter] = useState<ChannelLogCategory | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Time filters: presets directly update fromInput & toInput
  const [fromInput, setFromInput] = useState<string>(() =>
    format(subHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm")
  );
  const [toInput, setToInput] = useState<string>("");

  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  // Expanded log IDs set
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Auto-refresh interval (null = off, or 5000 / 10000 / 30000 ms)
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Sync URL search params if changed externally
  useEffect(() => {
    const lvl = (searchParams.get("level") as ChannelLogLevel) || "";
    if (lvl !== levelFilter) {
      setLevelFilter(lvl);
      setPage(0);
    }
  }, [searchParams]);

  // Convert from/to datetime strings to ISO string for backend query
  const fromIso = useMemo(() => {
    if (!fromInput) return null;
    const d = new Date(fromInput);
    return isValid(d) ? d.toISOString() : null;
  }, [fromInput]);

  const toIso = useMemo(() => {
    if (!toInput) return null;
    const d = new Date(toInput);
    return isValid(d) ? d.toISOString() : null;
  }, [toInput]);

  const queryPayload: ListChannelLogsQuery = useMemo(
    () => ({
      level: levelFilter || null,
      category: categoryFilter || null,
      search: activeSearch ? activeSearch.trim() : null,
      from: fromIso,
      to: toIso,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [levelFilter, categoryFilter, activeSearch, fromIso, toIso, pageSize, page]
  );

  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["channel-logs", channelId, queryPayload],
    queryFn: () => logsApi.list(channelId, queryPayload).then((r) => r.data),
    enabled: !!channelId,
    placeholderData: (previousData) => previousData,
    refetchInterval: refreshInterval ?? false,
  });

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(0);
  };

  const applyPreset = (hours: number | null) => {
    if (hours === null) {
      setFromInput("");
      setToInput("");
    } else {
      setFromInput(format(subHours(new Date(), hours), "yyyy-MM-dd'T'HH:mm"));
      setToInput("");
    }
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
        <p className="text-muted-foreground">{t("dashboard.selectChannel")}</p>
      </div>
    );
  }

  const hasActiveFilters =
    !!levelFilter ||
    !!categoryFilter ||
    !!activeSearch ||
    !!fromInput ||
    !!toInput;

  const resetFilters = () => {
    setLevelFilter("");
    setCategoryFilter("");
    setSearchInput("");
    setActiveSearch("");
    setFromInput("");
    setToInput("");
    setPage(0);
    setSearchParams({});
  };

  return (
    <div className="p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("logs.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("logs.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLogs()}
            disabled={logsFetching}
            className="gap-2"
          >
            <IconRefresh spinning={logsFetching} />
            {t("logs.refresh")}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar with 3 distinct lines */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        {/* Line 1: Levels & Categories */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              {t("logs.level")}:
            </span>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1 flex-wrap">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => {
                    setLevelFilter(lvl.value);
                    setPage(0);
                    if (lvl.value) setSearchParams({ level: lvl.value });
                    else setSearchParams({});
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all select-none",
                    levelFilter === lvl.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lvl.value ? lvl.label : t("common.all")}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-border hidden lg:block" />

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              {t("logs.category")}:
            </span>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.value);
                    setPage(0);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all select-none",
                    categoryFilter === cat.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.value ? cat.label : t("common.all")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Line 2: Date & Time (Presets directly set from/to) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            {t("logs.timestamp")}:
          </span>

          {/* Presets */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/20 p-1">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.hours)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all select-none"
              >
                {p.hours === 1 ? t("logs.preset1h") : p.hours === 6 ? t("logs.preset6h") : p.hours === 24 ? t("logs.preset24h") : p.hours === 168 ? t("logs.preset7d") : t("logs.presetAll")}
              </button>
            ))}
          </div>

          {/* From Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono">From:</span>
            <input
              type="datetime-local"
              value={fromInput}
              onChange={(e) => {
                setFromInput(e.target.value);
                setPage(0);
              }}
              className="h-8 px-2.5 rounded-lg border border-border bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </div>

          {/* To Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono">To:</span>
            <input
              type="datetime-local"
              value={toInput}
              onChange={(e) => {
                setToInput(e.target.value);
                setPage(0);
              }}
              className="h-8 px-2.5 rounded-lg border border-border bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </div>

          {(fromInput || toInput) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset(null)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <IconX />
              {t("common.clear")}
            </Button>
          )}
        </div>

        {/* Line 3: Search (wider) + Expand/Collapse + Rows per page + Reset */}
        <div className="flex flex-wrap items-center gap-3 justify-between pt-1 border-t border-border/40">
          {/* Substring Search Form (wider max-w-xl) */}
          <form onSubmit={handleApplySearch} className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder={t("logs.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-muted/20 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs px-4">
              {t("common.search")}
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
                {t("common.clear")}
              </Button>
            )}
          </form>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("logs.expandAll")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("logs.collapseAll")}
              </Button>
            </div>

            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span className="text-xs text-muted-foreground">{t("common.perPage")}</span>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-0.5">
                {PAGE_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
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
                {t("common.clear")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Console Stream Container */}
      <div className="rounded-2xl border border-border/80 bg-[#14100c] shadow-2xl overflow-hidden w-full">
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
              <span>{t("common.loading")}</span>
            ) : (
              <span>
                {totalLogs.toLocaleString()} {t("common.total")}
              </span>
            )}
          </div>
        </div>

        {/* Log Stream Body */}
        <div className="min-h-[400px] overflow-x-auto">
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
            <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-3 font-mono text-xs text-muted-foreground p-8">
              <p className="text-sm font-medium text-foreground">{t("logs.noLogsFound")}</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                  {t("common.clear")}
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
            <span className="font-semibold text-foreground tabular-nums">{startRecord}</span>–
            <span className="font-semibold text-foreground tabular-nums">{endRecord}</span> /{" "}
            <span className="font-semibold text-foreground tabular-nums">{totalLogs.toLocaleString()}</span> {t("common.total")}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || logsLoading}
              className="h-8 px-3 text-xs"
            >
              {t("common.prev")}
            </Button>

            <span className="px-3 py-1 font-mono text-xs tabular-nums text-foreground">
              {page + 1} / {Math.max(1, totalPages)}
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
