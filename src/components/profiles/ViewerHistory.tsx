import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { viewerApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import { formatMinorCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { QueryError, EmptyState } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import type { ViewerRewardLimitStatus } from "@/types/api";
import { useAppStore } from "@/store/useAppStore";

export function ViewerLimits({
  limits,
  channelLogin,
}: {
  limits: ViewerRewardLimitStatus[];
  channelLogin: string;
}) {
  const c = useCopy();
  const sorted = [...limits].sort(
    (a, b) => Number(b.is_limit_reached) - Number(a.is_limit_reached),
  );
  return (
    <section className="space-y-4">
      <h2 className="section-title">
        {c("Reward availability", "Доступность наград")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {c(
          "Your rolling and lifetime limits. Twitch cooldowns, stream limits, chat requirements and paused rewards may also restrict a redemption.",
          "Ваши лимиты за период и за всё время. Кулдауны Twitch, лимиты стрима, требования чата и паузы также могут ограничивать активацию.",
        )}
      </p>
      {sorted.length ? (
        <ul className="limit-list">
          {sorted.map((rule, i) => (
            <li
              key={`${rule.twitch_reward_id}-${i}`}
              data-reached={rule.is_limit_reached}
            >
              <div>
                <Link to={`/c/${channelLogin}`}>{rule.reward_title}</Link>
                <small>
                  {rule.window_hours
                    ? c(
                        `Rolling ${rule.window_hours} hours`,
                        `Скользящее окно ${rule.window_hours} ч`,
                      )
                    : c("Lifetime", "За всё время")}
                </small>
              </div>
              <strong>
                {rule.remaining_redemptions} {c("left", "осталось")}
              </strong>
              <meter
                min={0}
                max={Math.max(1, rule.max_redemptions)}
                value={Math.min(rule.used_redemptions, rule.max_redemptions)}
                aria-label={`${rule.reward_title}: ${rule.used_redemptions} / ${rule.max_redemptions}`}
              />
              <small>
                {rule.used_redemptions} / {rule.max_redemptions}{" "}
                {c("used", "использовано")}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">
          {c(
            "No custom per-viewer purchase limits configured.",
            "Пользовательские лимиты покупок не настроены.",
          )}
        </p>
      )}
    </section>
  );
}

export default function ViewerHistory({ channelId }: { channelId?: string }) {
  const c = useCopy();
  const { t } = useTranslation();
  const userId = useAppStore((s) => s.currentUser?.twitch_id);
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["personal-history", userId, channelId, page],
    queryFn: () =>
      channelId
        ? viewerApi
            .getChannelRedemptions(channelId, { offset: page * 15, limit: 15 })
            .then((r) => r.data)
        : viewerApi
            .getGlobalRedemptions({ offset: page * 15, limit: 15 })
            .then((r) => r.data),
    enabled: !!userId,
  });
  const labels: Record<string, string> = {
    PENDING: "pending",
    ORDER_CREATED: "orderCreated",
    MANUAL_HOLD: "manualHold",
    COMPLETED: "completed",
    FAILED_REFUND: "refunded",
    FAILED_PENALTY: "penalized",
  };
  return (
    <section className="space-y-4">
      <div className="section-heading">
        <h2>
          {channelId
            ? c("Your rewards on this channel", "Ваши награды на канале")
            : c(
                "Reward history across channels",
                "История наград на всех каналах",
              )}
        </h2>
        <span className="text-xs text-muted-foreground">
          {c("Newest first", "Сначала новые")}
        </span>
      </div>
      {query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-48" />
      ) : !query.data.length ? (
        <EmptyState title={c("No rewards here yet", "Здесь пока нет наград")} />
      ) : (
        <div className="viewer-history">
          {query.data.map((r) => {
            const status = r.status
              .replace(/([a-z])([A-Z])/g, "$1_$2")
              .toUpperCase();
            return (
              <details
                key={r.twitch_redemption_id}
                className="viewer-history-row"
              >
                <summary>
                  <span className="history-status" data-status={status}>
                    {t(`redemptions.statuses.${labels[status]}`, status)}
                  </span>
                  <span>
                    <strong>{r.reward_title}</strong>
                    <small>
                      {"channel_login" in r && (
                        <Link
                          to={`/c/${r.channel_login}/profile`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{String(r.channel_login)} ·{" "}
                        </Link>
                      )}
                      {r.market_item_name ||
                        c("Item not recorded", "Предмет не зафиксирован")}
                    </small>
                  </span>
                  <span>
                    {r.twitch_points_cost.toLocaleString()} {c("pts", "баллов")}
                    <small>{new Date(r.created_at).toLocaleDateString()}</small>
                  </span>
                </summary>
                <div className="viewer-history-detail">
                  <p>
                    {r.fail_description ||
                      (status === "MANUAL_HOLD"
                        ? c(
                            "The channel team needs to review this redemption.",
                            "Команда канала должна проверить эту активацию.",
                          )
                        : status === "ORDER_CREATED"
                          ? c(
                              "The order is being monitored for delivery.",
                              "Бот отслеживает доставку заказа.",
                            )
                          : c(
                              "Latest recorded outcome shown above.",
                              "Последний зафиксированный результат указан выше.",
                            ))}
                  </p>
                  <dl className="preview-facts">
                    <div>
                      <dt>
                        {c("Market amount recorded", "Сумма покупки в записи")}
                      </dt>
                      <dd>
                        {r.market_paid_price == null
                          ? "—"
                          : formatMinorCurrency(
                              r.market_paid_price,
                              r.currency,
                            )}
                      </dd>
                    </div>
                    <div>
                      <dt>{c("Last update", "Последнее обновление")}</dt>
                      <dd>{new Date(r.updated_at).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>
                        {c(
                          "Reference for the channel team",
                          "Номер для команды канала",
                        )}
                      </dt>
                      <dd className="font-mono text-xs">
                        {r.twitch_redemption_id}
                      </dd>
                    </div>
                  </dl>
                </div>
              </details>
            );
          })}
        </div>
      )}
      <div className="history-toolbar">
        <Button
          variant="outline"
          disabled={page === 0 || query.isFetching}
          onClick={() => setPage(page - 1)}
        >
          {c("Newer", "Новее")}
        </Button>
        <span>
          {c("Page", "Страница")} {page + 1}
        </span>
        <Button
          variant="outline"
          disabled={query.isFetching || (query.data?.length || 0) < 15}
          onClick={() => setPage(page + 1)}
        >
          {c("Older", "Раньше")}
        </Button>
      </div>
    </section>
  );
}
