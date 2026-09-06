import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chatApi } from "@/lib/apiClient";
import type { ChatTopUserItem } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ChatTimelineChart from "./ChatTimelineChart";

const TIME_WINDOWS: { label: string; value: number | null }[] = [
  { label: "24 hours", value: 24 },
  { label: "7 days", value: 168 },
  { label: "30 days", value: 720 },
  { label: "All time", value: null },
];

const BUCKETS: { label: string; value: number | null }[] = [
  { label: "1h step", value: 1 },
  { label: "6h step", value: 6 },
  { label: "24h step", value: 24 },
];

// ── Icons ──────────────────────────────────────────────────────────────────
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── Chatter avatar initials ─────────────────────────────────────────────────
function ChatterAvatar({ login }: { login: string }) {
  const letter = (login || "?").charAt(0).toUpperCase();
  const hue = [...login].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
      style={{ background: `hsl(${hue}, 55%, 42%)` }}
    >
      {letter}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function ChatKpiCard({
  title,
  value,
  subtitle,
  icon,
  accentClass,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentClass?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 space-y-3 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        accentClass
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span className="text-muted-foreground/80">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

interface ChatDashboardWidgetProps {
  channelId: string;
  showTopChatters?: boolean;
  title?: string;
}

export default function ChatDashboardWidget({
  channelId,
  showTopChatters = false,
  title = "Chat Analytics & Activity",
}: ChatDashboardWidgetProps) {
  const [timeWindow, setTimeWindow] = useState<number | null>(168); // default 7 days
  const [bucketHours, setBucketHours] = useState<number | null>(6);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["chatDashboard", channelId, timeWindow, bucketHours],
    queryFn: () =>
      chatApi
        .getDashboard(channelId, {
          time_window_hours: timeWindow,
          bucket_hours: bucketHours,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    staleTime: 30_000,
  });

  const summary = data?.summary;
  const timeline = data?.timeline ?? [];
  const topChatters = data?.top_chatters ?? [];

  return (
    <div className="space-y-5">
      {/* Widget Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
            {isFetching && (
              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Channel viewer messages, character volume and active chatter trends
          </p>
        </div>

        {/* Time window & bucket controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time window selector */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={String(tw.value)}
                type="button"
                onClick={() => setTimeWindow(tw.value)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  timeWindow === tw.value
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tw.label}
              </button>
            ))}
          </div>

          {/* Bucket selector (only relevant if timeline is shown) */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {BUCKETS.map((b) => (
              <button
                key={String(b.value)}
                type="button"
                onClick={() => setBucketHours(b.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                  bucketHours === b.value
                    ? "bg-secondary text-secondary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ChatKpiCard
          title="Total Messages"
          value={summary ? summary.total_messages.toLocaleString() : "–"}
          subtitle="Sent in selected period"
          icon={<IconMessage />}
          loading={isLoading}
          accentClass="border-cyan-500/15"
        />
        <ChatKpiCard
          title="Total Characters"
          value={summary ? summary.total_characters.toLocaleString() : "–"}
          subtitle="Total message volume"
          icon={<IconText />}
          loading={isLoading}
          accentClass="border-violet-500/15"
        />
        <ChatKpiCard
          title="Unique Chatters"
          value={summary ? summary.unique_chatters.toLocaleString() : "–"}
          subtitle="Active viewers in chat"
          icon={<IconUsers />}
          loading={isLoading}
          accentClass="border-emerald-500/15"
        />
        <ChatKpiCard
          title="Avg Characters / Message"
          value={
            summary
              ? summary.avg_characters_per_message.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : "–"
          }
          subtitle="Average message length"
          icon={<IconSparkles />}
          loading={isLoading}
          accentClass="border-amber-500/15"
        />
      </div>

      {/* Activity Timeline Chart */}
      <ChatTimelineChart timeline={timeline} isLoading={isLoading} />

      {/* Top Chatters block (if enabled) */}
      {showTopChatters && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top Chatters</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Most active viewers during this period
              </p>
            </div>
            <Link
              to="/leaderboard"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Full Leaderboard
              <IconChevronRight />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : topChatters.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No chatter activity found in this period
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topChatters.slice(0, 6).map((item: ChatTopUserItem, rank: number) => (
                <Link
                  key={item.chatter_user_id}
                  to={`/chat/users/${item.chatter_user_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/30 hover:border-primary/40 transition-all group"
                >
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground group-hover:text-primary">
                    #{rank + 1}
                  </span>
                  <ChatterAvatar login={item.chatter_user_login} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      @{item.chatter_user_login}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.char_count.toLocaleString()} chars
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-primary tabular-nums">
                      {item.message_count.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-muted-foreground">msgs</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
