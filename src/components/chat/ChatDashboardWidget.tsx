import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { chatApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import { QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import ChatTimelineChart from "./ChatTimelineChart";

export default function ChatDashboardWidget({
  channelId,
  title,
  compact = true,
  hours = 168,
}: {
  channelId: string;
  title?: string;
  showTopChatters?: boolean;
  compact?: boolean;
  hours?: number | null;
}) {
  const c = useCopy();
  const bucket = hours == null || hours >= 720 ? 24 : hours <= 24 ? 1 : 6;
  const query = useQuery({
    queryKey: ["chatDashboard", channelId, hours, bucket],
    queryFn: () =>
      chatApi
        .getDashboard(channelId, {
          time_window_hours: hours,
          bucket_hours: bucket,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    staleTime: 30_000,
  });
  if (query.isError) return <QueryError onRetry={() => query.refetch()} />;
  if (!query.data) return <Skeleton className={compact ? "h-24" : "h-64"} />;
  const { summary, timeline } = query.data;
  const peak = timeline.reduce(
    (best, point) =>
      point.message_count > (best?.message_count || 0) ? point : best,
    timeline[0],
  );
  return (
    <section className={compact ? "chat-pulse" : "chat-analysis"}>
      {compact && (
        <div>
          <h2 className="section-title">
            {title || c("Chat pulse", "Активность чата")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {c("Last 7 days", "Последние 7 дней")}
          </p>
        </div>
      )}
      <div className="analysis-summary">
        <div>
          <strong>{summary.total_messages.toLocaleString()}</strong>
          <span>{c("messages", "сообщений")}</span>
        </div>
        <div>
          <strong>{summary.unique_chatters.toLocaleString()}</strong>
          <span>{c("distinct viewers", "уникальных зрителей")}</span>
        </div>
        <div>
          <strong>
            {summary.unique_chatters
              ? (summary.total_messages / summary.unique_chatters).toFixed(1)
              : "—"}
          </strong>
          <span>{c("messages per viewer", "сообщений на зрителя")}</span>
        </div>
      </div>
      {compact ? (
        <Link to="/leaderboard">
          {c("Explore activity & viewers", "Активность и зрители")} →
        </Link>
      ) : (
        <>
          <p className="analysis-insight">
            {peak?.message_count
              ? c(
                  `Busiest recorded ${bucket}h window: ${new Date(peak.bucket_start).toLocaleString()} · ${peak.message_count.toLocaleString()} messages.`,
                  `Самое активное окно ${bucket} ч: ${new Date(peak.bucket_start).toLocaleString()} · ${peak.message_count.toLocaleString()} сообщений.`,
                )
              : c(
                  "No activity recorded in this period.",
                  "За этот период активность не зафиксирована.",
                )}
          </p>
          <ChatTimelineChart
            asOf={query.dataUpdatedAt}
            timeline={timeline}
            bucketHours={bucket}
            timeWindowHours={hours}
          />
          <details className="builder-advanced">
            <summary>
              {c("Message volume details", "Подробности объёма сообщений")}
            </summary>
            <p>
              {summary.total_characters.toLocaleString()}{" "}
              {c("characters", "символов")} ·{" "}
              {summary.avg_characters_per_message.toFixed(1)}{" "}
              {c("characters per message", "символов на сообщение")}
            </p>
          </details>
        </>
      )}
    </section>
  );
}
