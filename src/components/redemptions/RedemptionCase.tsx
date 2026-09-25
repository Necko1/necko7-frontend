import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { logsApi, rewardsApi, redemptionsApi } from "@/lib/apiClient";
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
  const audit = useQuery({
    queryKey: ["fulfillment-audit", channelId, r.twitch_redemption_id],
    queryFn: () => redemptionsApi.audit(channelId, r.twitch_redemption_id).then(res => res.data),
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
  const auditTitles: Record<string, string> = {
    reward_redeemed: c("Viewer redeemed the reward", "Зритель активировал награду"),
    inventory_created: c("Inventory item created", "Предмет добавлен в инвентарь"),
    automatic_order_initiated: c("Automatic delivery started", "Автоматическая доставка начата"),
    viewer_order_requested: c("Viewer requested delivery", "Зритель запросил доставку"),
    operator_order_requested: c("Operator requested delivery", "Оператор запросил доставку"),
    retry_attempt_created: c("New attempt created for the same item", "Создана новая попытка для того же предмета"),
    market_order_created: c("Market order created", "Заказ на маркете создан"),
    steam_trade_created: c("Steam trade sent", "Обмен Steam отправлен"),
    buyer_accepted_trade: c("Buyer accepted; awaiting final Market confirmation", "Покупатель принял обмен; ожидается итог маркета"),
    market_stage_2_delivered: c("Market confirmed delivery", "Маркет подтвердил доставку"),
    seller_not_sent: c("Seller did not send the trade", "Продавец не отправил обмен"),
    buyer_not_accepted: c("Buyer did not accept the trade", "Покупатель не принял обмен"),
    seller_cancelled: c("Seller cancelled the trade", "Продавец отменил обмен"),
    buyer_reverted: c("Buyer reverted the accepted trade", "Покупатель отменил принятый обмен"),
    seller_reverted: c("Seller reverted the accepted trade", "Продавец отменил принятый обмен"),
    terminal_unclassified: c("Trade ended; operator review needed", "Обмен завершён; нужна проверка оператора"),
    market_order_rejected: c("Market rejected the order", "Маркет отклонил заказ"),
    market_reconciliation_required: c("Checking an uncertain Market result", "Проверяется неопределённый итог маркета"),
    viewer_refund_requested: c("Viewer requested Channel Points refund", "Зритель запросил возврат баллов"),
    operator_refund_requested: c("Operator requested Channel Points refund", "Оператор запросил возврат баллов"),
    twitch_refund_succeeded: c("Channel Points returned", "Баллы канала возвращены"),
    twitch_refund_uncertain: c("Twitch refund result needs verification", "Результат возврата Twitch требует проверки"),
    twitch_fulfillment_pending: c("Twitch completion pending recovery", "Завершение в Twitch ожидает повтора"),
    twitch_fulfillment_succeeded: c("Twitch reward fulfilled", "Награда Twitch завершена"),
  };
  const stateCopy: Record<string, string> = {
    PENDING: c(
      "The redemption is waiting for processing. No completed purchase is recorded.",
      "Активация ожидает обработки. Завершённая покупка не зафиксирована.",
    ),
    ORDER_CREATED: c(
      "A market order was created. Delivery is still being monitored.",
      "Заказ на маркете создан. Бот отслеживает доставку.",
    ),
    ORDER_PENDING: c("The Market order is being created or processed.", "Заказ на маркете создаётся или обрабатывается."),
    WAITING_VIEWER: c("The item is in inventory and awaits the viewer's delivery request.", "Предмет в инвентаре и ожидает запроса зрителя на доставку."),
    WAITING_OPERATOR: c("The item is in inventory and awaits operator review.", "Предмет в инвентаре и ожидает проверки оператора."),
    TRADE_LINK_REQUIRED: c("A valid Steam trade link is needed before delivery can begin.", "Для начала доставки нужна действительная ссылка обмена Steam."),
    TRADE_WAITING: c("The Steam trade was sent and is awaiting acceptance.", "Обмен Steam отправлен и ожидает принятия."),
    TRADE_ACCEPTED: c("The trade was accepted. Market has not confirmed the final result yet.", "Обмен принят. Маркет ещё не подтвердил итог."),
    RETRY_AVAILABLE: c("The last delivery attempt ended. Check the inventory action policy before retrying.", "Последняя попытка доставки завершилась. Проверьте доступные действия в инвентаре."),
    OPERATOR_REVIEW: c("The trade ended, but its cause needs operator review.", "Обмен завершился, но его причину должен проверить оператор."),
    INSUFFICIENT_FUNDS: c("Market rejected the attempt because the channel account lacks balance. The item remains in inventory.", "Маркет отклонил попытку из-за недостатка средств у канала. Предмет остаётся в инвентаре."),
    RECONCILIATION_REQUIRED: c("The Market outcome is being checked before another action is safe.", "Итог маркета проверяется перед следующим действием."),
    DELIVERED: c("Market confirmed final delivery.", "Маркет подтвердил окончательную доставку."),
    REFUNDING: c("The Channel Points refund result is being confirmed.", "Результат возврата баллов канала подтверждается."),
    REFUNDED: c("Channel Points were returned and inventory fulfillment was closed.", "Баллы канала возвращены, доставка закрыта."),
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
      <p className="text-sm text-muted-foreground">{stateCopy[r.inventory_lifecycle_status || status] || stateCopy[status]}</p>
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
            {c("Durable events recorded since the fulfillment audit was introduced. Earlier events are not reconstructed.",
              "Постоянные события с момента введения журнала. Более ранние этапы не восстанавливаются задним числом.")}
          </p>
          <ol className="case-timeline">
            {audit.isLoading ? (
              <li>
                <Skeleton className="h-12" />
              </li>
            ) : audit.isError ? (
              <li>
                <QueryError onRetry={() => audit.refetch()} />
              </li>
            ) : !audit.data?.length ? (
              <li><p>{c("No audit events recorded yet", "События пока не записаны")}</p></li>
            ) : (
              audit.data.map((event) => (
                <li key={event.event_key}>
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                  <p>
                    {auditTitles[event.event_type] || c("Lifecycle event", "Событие доставки")}
                    {event.actor_user_id && (event.actor_kind === "viewer" || event.actor_kind === "operator") &&
                      <small> · {event.actor_kind === "viewer" ? c("viewer", "зритель") : c("operator", "оператор")}: {event.actor_user_id}</small>}
                  </p>
                </li>
              ))
            )}
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
