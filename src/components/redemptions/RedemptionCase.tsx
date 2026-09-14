import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { logsApi, rewardsApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import { formatMinorCurrency } from "@/lib/currency";
import type { RedemptionResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

export default function RedemptionCase({
  redemption: r,
  channelId,
  failure,
  statusLabel,
  canAct,
  pending,
  onAction,
}: {
  redemption: RedemptionResponse;
  channelId: string;
  failure: string;
  statusLabel: string;
  canAct: boolean;
  pending: boolean;
  onAction: (action: "retry" | "refund" | "penalty") => void;
}) {
  const c = useCopy();
  const [limit, setLimit] = useState(20);
  const status = r.status.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
  const logs = useQuery({
    queryKey: ["case-events", channelId, r.twitch_redemption_id, limit],
    queryFn: () =>
      logsApi
        .list(channelId, { redemption_id: r.twitch_redemption_id, limit })
        .then((res) => res.data),
    refetchInterval: 15_000,
  });
  const rewards = useQuery({
    queryKey: ["rewards", channelId],
    queryFn: () => rewardsApi.list(channelId).then((res) => res.data),
    staleTime: 60_000,
  });
  const reward = rewards.data?.find(
    (item) => item.twitch_id === r.twitch_reward_id,
  );
  const events = [...(logs.data?.items || [])]
    .filter((event) => event.details?.redemption_id === r.twitch_redemption_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  const eventTitles: Record<string, string> = {
    STEAM_TRADE_OFFER_SENT: c(
      "Steam trade offer sent",
      "Предложение обмена Steam отправлено",
    ),
    REDEMPTION_ORDER_CREATED: c(
      "Market order created",
      "Заказ на маркете создан",
    ),
    REDEMPTION_COMPLETED: c("Delivery completed", "Доставка завершена"),
    REDEMPTION_MANUAL_HOLD: c(
      "Processing placed on hold",
      "Обработка приостановлена",
    ),
    REDEMPTION_RETRY_REQUESTED: c(
      "Purchase retry requested",
      "Запрошена повторная покупка",
    ),
    REDEMPTION_MANUALLY_RETRIED: c(
      "Manual retry recorded",
      "Записана повторная попытка",
    ),
    REDEMPTION_MANUALLY_REFUNDED: c(
      "Manual refund recorded",
      "Записан ручной возврат",
    ),
    REDEMPTION_MANUALLY_PENALIZED: c(
      "Closed without refund",
      "Закрыто без возврата",
    ),
  };
  const milestones: { title: string; at: string; count: number }[] = [];
  for (const event of events) {
    const title = eventTitles[event.event_type];
    if (!title) continue;
    const previous = milestones[milestones.length - 1];
    if (previous?.title === title) {
      previous.count++;
      previous.at = event.created_at;
    } else milestones.push({ title, at: event.created_at, count: 1 });
  }
  const stateCopy: Record<string, string> = {
    PENDING: c(
      "The redemption is waiting for processing. No completed purchase is recorded.",
      "Активация ожидает обработки. Завершённая покупка не зафиксирована.",
    ),
    ORDER_CREATED: c(
      "A market order was created. Delivery is still being monitored.",
      "Заказ на маркете создан. Бот отслеживает доставку.",
    ),
    MANUAL_HOLD: c(
      "Automatic processing stopped. Check the market history before retrying or closing this case.",
      "Автообработка остановлена. Проверьте историю маркета перед повтором или закрытием.",
    ),
    COMPLETED: c(
      "The redemption is recorded as completed.",
      "Активация отмечена как завершённая.",
    ),
    FAILED_REFUND: c(
      "The redemption is recorded as failed with a Channel Points refund.",
      "Зафиксирована ошибка с возвратом баллов канала.",
    ),
    FAILED_PENALTY: c(
      "The redemption is recorded as failed without a Channel Points refund.",
      "Зафиксирована ошибка без возврата баллов канала.",
    ),
  };
  const actions = [
    {
      key: "retry" as const,
      show: ["MANUAL_HOLD", "FAILED_PENALTY"].includes(status),
      title: c("Retry Market Order", "Повторить заказ"),
      detail: c(
        "Starts another buy attempt. Check that an order has not already succeeded.",
        "Запускает попытку покупки. Сначала убедитесь, что заказ ещё не выполнен.",
      ),
    },
    {
      key: "refund" as const,
      show: ["MANUAL_HOLD", "PENDING"].includes(status),
      title: c("Refund", "Вернуть баллы"),
      detail: c(
        "Return the viewer's Channel Points. This does not reverse a market purchase.",
        "Вернуть баллы зрителя. Это не отменяет покупку на маркете.",
      ),
    },
    {
      key: "penalty" as const,
      show: ["MANUAL_HOLD", "PENDING"].includes(status),
      title: c("Close without refund", "Закрыть без возврата"),
      detail: c(
        "Close the redemption and keep the points spent. Use only after checking the outcome.",
        "Закрыть активацию без возврата баллов. Сначала проверьте результат.",
      ),
    },
  ].filter((action) => action.show);
  return (
    <section
      className="redemption-case"
      id={`detail-${r.twitch_redemption_id}`}
      aria-label={c("Transaction case", "Дело по активации")}
    >
      <div className="case-heading">
        <div>
          <p className="eyebrow">{c("Redemption", "Активация")}</p>
          <h3>
            {reward?.twitch_title ||
              r.market_item_name ||
              c("Reward details unavailable", "Данные награды недоступны")}
          </h3>
          <Link to={`/chat/users/${r.user_id}`}>@{r.user_login} ↗</Link>
        </div>
        <strong data-status={status}>{statusLabel}</strong>
      </div>
      <p className="text-sm text-muted-foreground">{stateCopy[status]}</p>
      {canAct && actions.length > 0 && (
        <a
          className="text-xs text-primary inline-block mt-3"
          href={`#resolve-${r.twitch_redemption_id}`}
        >
          {c("Review available actions", "Перейти к доступным действиям")} ↓
        </a>
      )}
      {failure && (
        <div className="case-reason">
          <h4>{c("Recorded failure", "Зафиксированная ошибка")}</h4>
          <p>{failure}</p>
        </div>
      )}
      <div className="case-columns">
        <section>
          <h4 className="section-title">
            {c("Purchase & delivery", "Покупка и доставка")}
          </h4>
          <dl className="preview-facts">
            <div>
              <dt>{c("Item", "Предмет")}</dt>
              <dd>
                {r.market_item_name ? (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://market.csgo.com/en/?search=${encodeURIComponent(r.market_item_name)}`}
                  >
                    {r.market_item_name} ↗
                  </a>
                ) : (
                  c("No item recorded", "Предмет не зафиксирован")
                )}
              </dd>
            </div>
            <div>
              <dt>{c("Viewer spent", "Списано у зрителя")}</dt>
              <dd>
                {r.twitch_points_cost.toLocaleString()} {c("points", "баллов")}
              </dd>
            </div>
            <div>
              <dt>{c("Market amount recorded", "Сумма покупки в записи")}</dt>
              <dd>
                {r.market_paid_price == null
                  ? c("Not recorded", "Не зафиксирована")
                  : formatMinorCurrency(r.market_paid_price, r.currency)}
              </dd>
            </div>
            <div>
              <dt>{c("Retry attempts recorded", "Зафиксировано повторов")}</dt>
              <dd>{r.retry_count}</dd>
            </div>
          </dl>
          {r.user_trade_link && (
            <div className="case-trade">
              <p className="text-xs text-muted-foreground">
                {c(
                  "Trade URL provided for this redemption",
                  "Ссылка обмена для этой активации",
                )}
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <a
                  href={
                    /^https:\/\/steamcommunity\.com\//.test(r.user_trade_link)
                      ? r.user_trade_link
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {c("Open Steam trade URL", "Открыть обмен Steam")} ↗
                </a>
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(r.user_trade_link)
                      .then(() => toast.success(c("Copied", "Скопировано")))
                      .catch(() =>
                        toast.error(
                          c("Could not copy", "Не удалось скопировать"),
                        ),
                      )
                  }
                >
                  {c("Copy", "Копировать")}
                </button>
              </div>
            </div>
          )}
          <details className="builder-advanced">
            <summary>{c("Reference IDs", "Идентификаторы")}</summary>
            <dl className="preview-facts font-mono text-xs">
              <div>
                <dt>Redemption</dt>
                <dd>{r.twitch_redemption_id}</dd>
              </div>
              <div>
                <dt>Reward</dt>
                <dd>{r.twitch_reward_id}</dd>
              </div>
              <div>
                <dt>Viewer</dt>
                <dd>{r.user_id}</dd>
              </div>
            </dl>
          </details>
        </section>
        <section>
          <h4 className="section-title">
            {c("Recorded history", "История событий")}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            {c(
              "Matching retained logs, not a complete audit trail. Missing events are not evidence that an action did not happen.",
              "Сохранённые связанные логи, не полный аудит. Отсутствие события не означает, что действие не произошло.",
            )}
          </p>
          <ol className="case-timeline">
            <li>
              <time>{new Date(r.created_at).toLocaleString()}</time>
              <p>
                {c("Viewer redeemed the reward", "Зритель активировал награду")}
              </p>
            </li>
            {r.retry_count > 0 && (
              <li>
                <p>
                  {c(
                    "Retry attempts recorded",
                    "Зафиксировано повторных попыток",
                  )}
                  : <strong>{r.retry_count}</strong>
                </p>
              </li>
            )}
            {logs.isLoading ? (
              <li>
                <Skeleton className="h-12" />
              </li>
            ) : logs.isError ? (
              <li>
                <QueryError onRetry={() => logs.refetch()} />
              </li>
            ) : (
              milestones.map((event, i) => (
                <li key={i}>
                  <time>{new Date(event.at).toLocaleString()}</time>
                  <p>
                    {event.title}
                    {event.count > 1 && (
                      <small>
                        {" "}
                        · {event.count} {c("records", "записей")}
                      </small>
                    )}
                  </p>
                </li>
              ))
            )}
            <li>
              <time>{new Date(r.updated_at).toLocaleString()}</time>
              <p>
                {c("Latest recorded state", "Последнее состояние")}:{" "}
                {statusLabel}
              </p>
            </li>
          </ol>
          <details className="case-retained">
            <summary>
              {c("All retained events", "Все сохранённые события")} (
              {events.length})
            </summary>
            <p className="text-xs text-muted-foreground">
              {c(
                "Chronological technical records. Repeated transitions are preserved here.",
                "Технические записи по времени. Повторные переходы сохранены здесь.",
              )}
            </p>
            {events.map((event) => (
              <article key={event.id}>
                <time>{new Date(event.created_at).toLocaleString()}</time>
                <strong>{event.event_type}</strong>
                <p>{event.message}</p>
                {event.solution_hint && (
                  <p className="text-muted-foreground">{event.solution_hint}</p>
                )}
                <details>
                  <summary>{c("Event data", "Данные события")}</summary>
                  <pre className="configuration-json">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </details>
              </article>
            ))}
          </details>
          {(logs.data?.total || 0) > limit && (
            <Button
              variant="ghost"
              onClick={() => setLimit(Math.min(200, limit + 20))}
              disabled={limit >= 200}
            >
              {c("Load older events", "Загрузить более ранние события")}
            </Button>
          )}
        </section>
      </div>
      {canAct && actions.length > 0 && (
        <section
          className="case-resolution"
          id={`resolve-${r.twitch_redemption_id}`}
        >
          <h4 className="section-title">
            {c("Resolve this case", "Решить ситуацию")}
          </h4>
          <div>
            {actions.map((action) => (
              <article key={action.key}>
                <p>{action.detail}</p>
                <Button
                  disabled={pending}
                  variant={action.key === "penalty" ? "destructive" : "outline"}
                  onClick={() => onAction(action.key)}
                >
                  {action.title}
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
