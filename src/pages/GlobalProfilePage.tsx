import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { viewerApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import ViewerHistory from "@/components/profiles/ViewerHistory";
export default function GlobalProfilePage() {
  const c = useCopy();
  const user = useAppStore((s) => s.currentUser);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["viewer-global-profile", user?.twitch_id],
    queryFn: () => viewerApi.getGlobalProfile().then((r) => r.data),
    enabled: !!user,
  });
  if (query.isError)
    return (
      <div className="page-shell">
        <QueryError onRetry={() => query.refetch()} />
      </div>
    );
  const profile = query.data;
  const channels = [...(profile?.channels || [])]
    .filter((channel) =>
      `${channel.channel_login} ${channel.display_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.redemptions_count - a.redemptions_count ||
        b.messages_count - a.messages_count,
    );
  return (
    <div className="page-shell space-y-7">
      <PageHeader
        eyebrow={c("Your account · all channels", "Ваш аккаунт · все каналы")}
        title={user?.login || c("Your profile", "Ваш профиль")}
        description={c(
          "Your communities and reward history in one place. Channel Points and eligibility belong to each channel.",
          "Ваши сообщества и история наград. Баллы и доступность наград относятся к конкретному каналу.",
        )}
        actions={
          <Link to="/channels">{c("Browse channels", "Открыть каналы")} →</Link>
        }
      />
      {!profile ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="profile-totals">
            <div>
              <strong>{profile.channels.length}</strong>
              <span>{c("Channels", "Каналы")}</span>
            </div>
            <div>
              <strong>
                {profile.redemption_stats.total_redemptions.toLocaleString()}
              </strong>
              <span>{c("Rewards redeemed", "Активации наград")}</span>
            </div>
            <div>
              <strong>
                {profile.redemption_stats.completed.toLocaleString()}
              </strong>
              <span>{c("Completed", "Завершены")}</span>
            </div>
            <div>
              <strong>{profile.total_chat_messages.toLocaleString()}</strong>
              <span>{c("Chat messages", "Сообщения чата")}</span>
            </div>
          </div>
          <div className="profile-global-layout">
            <section className="space-y-4">
              <h2 className="section-title">
                {c("Your communities", "Ваши сообщества")}
              </h2>
              <Input
                aria-label={c("Find your channel", "Найти свой канал")}
                placeholder={c("Find a channel…", "Найти канал…")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {c(
                  "Ordered by rewards redeemed, then chat activity.",
                  "Сначала по наградам, затем по активности чата.",
                )}
              </p>
              <ul className="community-list">
                {channels.map((channel) => (
                  <li key={channel.channel_id}>
                    <Link to={`/c/${channel.channel_login}/profile`}>
                      <strong>
                        {channel.display_name || channel.channel_login}
                      </strong>
                      <span>
                        {channel.redemptions_count} {c("rewards", "наград")} ·{" "}
                        {channel.messages_count.toLocaleString()}{" "}
                        {c("messages", "сообщений")}
                      </span>
                      <small>
                        {c(
                          "Your activity on this channel",
                          "Ваша активность на канале",
                        )}{" "}
                        →
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
              {!channels.length && (
                <p>{c("No matching channels", "Каналы не найдены")}</p>
              )}
              <details className="builder-advanced">
                <summary>{c("Account totals", "Итоги аккаунта")}</summary>
                <dl className="preview-facts">
                  <div>
                    <dt>{c("Pending", "В обработке")}</dt>
                    <dd>{profile.redemption_stats.pending}</dd>
                  </div>
                  <div>
                    <dt>{c("Failed", "С ошибкой")}</dt>
                    <dd>{profile.redemption_stats.failed}</dd>
                  </div>
                  <div>
                    <dt>
                      {c(
                        "Points spent across channels",
                        "Баллы, потраченные на всех каналах",
                      )}
                    </dt>
                    <dd>
                      {profile.redemption_stats.total_points_spent.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>{c("Chat characters", "Символы чата")}</dt>
                    <dd>{profile.total_chat_characters.toLocaleString()}</dd>
                  </div>
                </dl>
              </details>
            </section>
            <ViewerHistory />
          </div>
        </>
      )}
    </div>
  );
}
