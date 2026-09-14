import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { viewerApi, publicApi, authApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ViewerHistory, {
  ViewerLimits,
} from "@/components/profiles/ViewerHistory";
export default function ChannelProfilePage() {
  const c = useCopy();
  const { identifier = "" } = useParams();
  const user = useAppStore((s) => s.currentUser);
  const info = useQuery({
    queryKey: ["public-broadcaster", identifier],
    queryFn: () => publicApi.getBroadcasterInfo(identifier).then((r) => r.data),
    enabled: !!identifier,
  });
  const id = info.data?.channel_id;
  const query = useQuery({
    queryKey: ["viewer-channel-profile", id, user?.twitch_id],
    queryFn: () => viewerApi.getChannelProfile(id!).then((r) => r.data),
    enabled: !!id && !!user,
  });
  if (info.isError || query.isError)
    return (
      <div className="page-shell">
        <QueryError
          onRetry={() => {
            info.refetch();
            query.refetch();
          }}
        />
      </div>
    );
  const profile = query.data;
  return (
    <div className="page-shell space-y-7">
      <PageHeader
        eyebrow={c(
          "Your activity · one channel",
          "Ваша активность · один канал",
        )}
        title={info.data?.display_name || identifier}
        description={c(
          `Your rewards and eligibility as @${user?.login || "viewer"} on this channel.`,
          `Ваши награды и доступность для @${user?.login || "зрителя"} на этом канале.`,
        )}
        actions={
          <div className="flex gap-4 text-sm">
            <Link to={`/c/${identifier}`}>
              {c("Reward catalog", "Каталог наград")} →
            </Link>
            <Link to="/me">{c("All channels", "Все каналы")}</Link>
          </div>
        }
      />
      {!user ? (
        <Button
          onClick={() => {
            window.location.href = authApi.loginUrl();
          }}
        >
          {c(
            "Sign in to view your activity",
            "Войдите, чтобы увидеть свою активность",
          )}
        </Button>
      ) : !profile ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="channel-profile-intro">
            <div>
              <h2 className="section-title">
                {c("On this channel", "На этом канале")}
              </h2>
              <p>
                {profile.redemption_stats.total_redemptions}{" "}
                {c("rewards redeemed", "активаций наград")} ·{" "}
                {profile.redemption_stats.completed}{" "}
                {c("completed", "завершено")} ·{" "}
                {profile.redemption_stats.pending} {c("pending", "в обработке")}
              </p>
              <p className="text-muted-foreground">
                {profile.chat_stats.total_messages.toLocaleString()}{" "}
                {c("messages", "сообщений")} · {c("Chat rank", "Место в чате")}{" "}
                {profile.chat_stats.leaderboard_rank
                  ? `#${profile.chat_stats.leaderboard_rank}`
                  : "—"}
              </p>
            </div>
            <div>
              <strong className="metric-value">
                {profile.redemption_stats.total_points_spent.toLocaleString()}
              </strong>
              <p className="text-xs text-muted-foreground">
                {c("Channel Points spent here", "Баллы, потраченные здесь")}
              </p>
            </div>
          </div>
          <div className="profile-channel-layout">
            <ViewerHistory key={id} channelId={id} />
            <aside className="space-y-7">
              <ViewerLimits limits={profile.limits} channelLogin={identifier} />
              <details className="builder-advanced">
                <summary>
                  {c("Channel activity details", "Подробности активности")}
                </summary>
                <dl className="preview-facts">
                  <div>
                    <dt>{c("First chat activity", "Первое сообщение")}</dt>
                    <dd>
                      {profile.chat_stats.first_seen_at
                        ? new Date(
                            profile.chat_stats.first_seen_at,
                          ).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{c("Last chat activity", "Последнее сообщение")}</dt>
                    <dd>
                      {profile.chat_stats.last_seen_at
                        ? new Date(
                            profile.chat_stats.last_seen_at,
                          ).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{c("Characters", "Символы")}</dt>
                    <dd>
                      {profile.chat_stats.total_characters.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>{c("Failed redemptions", "Ошибки активаций")}</dt>
                    <dd>{profile.redemption_stats.failed}</dd>
                  </div>
                </dl>
              </details>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
