import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import ConfirmAction from "@/components/common/ConfirmAction";
import SkinImage from "@/components/common/SkinImage";
import { EmptyState, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMinorCurrency } from "@/lib/currency";
import { viewerApi, usersApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import type { InventoryItem } from "@/types/api";

const labels: Record<string, [string, string]> = {
  WAITING_VIEWER: ["Ready for your action", "Ожидает вашего решения"],
  WAITING_OPERATOR: ["Operator review", "Проверка оператором"],
  TRADE_LINK_REQUIRED: ["Trade link required", "Нужна ссылка обмена"],
  ORDER_PENDING: ["Market order in progress", "Заказ на маркете"],
  TRADE_WAITING: ["Steam trade waiting", "Ожидается обмен Steam"],
  RETRY_AVAILABLE: ["Delivery attempt ended", "Попытка доставки завершилась"],
  INSUFFICIENT_FUNDS: ["Market balance insufficient", "Недостаточно средств на маркете"],
  RECONCILIATION_REQUIRED: ["Checking Market state", "Проверка состояния маркета"],
  DELIVERED: ["Delivered", "Доставлено"],
  REFUNDING: ["Returning Channel Points", "Возврат баллов"],
  REFUNDED: ["Channel Points returned", "Баллы возвращены"],
};

export default function InventoryList({ channelId, userId, operator = false }: { channelId?: string; userId?: string; operator?: boolean }) {
  const c = useCopy();
  const qc = useQueryClient();
  const limit = 30;
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{ item: InventoryItem; kind: "attempt" | "refund"; useSavedLink?: boolean } | null>(null);
  const params = { limit, offset, status: status || undefined, search: search.trim() || undefined };
  const viewerSettings = useQuery({ queryKey: ["viewer-settings"], queryFn: () => usersApi.getSettings().then(r => r.data), enabled: !operator });
  const query = useQuery({
    queryKey: ["inventory", channelId, userId, offset, status, search],
    queryFn: () => (operator && channelId && userId
      ? viewerApi.getOperatorInventory(channelId, userId, params)
      : channelId ? viewerApi.getChannelInventory(channelId, params)
      : viewerApi.getInventory(params)).then(r => r.data),
    enabled: !operator || (!!channelId && !!userId),
  });
  const mutation = useMutation({
    mutationFn: async ({ item, kind, useSavedLink }: { item: InventoryItem; kind: "attempt" | "refund"; useSavedLink?: boolean }) => {
      if (operator && channelId && userId) {
        return kind === "attempt" ? viewerApi.operatorAttempt(channelId, userId, item.id, useSavedLink) : viewerApi.operatorRefund(channelId, userId, item.id);
      }
      return kind === "attempt" ? viewerApi.requestAttempt(item.id, useSavedLink) : viewerApi.requestRefund(item.id);
    },
    onSuccess: response => {
      setAction(null);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["redemptions"] });
      const result = response.data?.status;
      if (result === "TRADE_LINK_REQUIRED") toast.message(c("Add a valid Steam trade link before starting delivery.", "Добавьте действительную ссылку обмена Steam перед доставкой."));
      else if (result === "INSUFFICIENT_FUNDS") toast.message(c("The Market account has insufficient balance. You can try again later or return your points.", "На счёте маркета недостаточно средств. Можно повторить позже или вернуть баллы."));
      else if (result === "RETRY_AVAILABLE") toast.message(c("Market could not create this order at the fixed value. You can try again later or return your points.", "Маркет не смог создать заказ по зафиксированной стоимости. Можно повторить позже или вернуть баллы."));
      else toast.success(c("Inventory updated", "Инвентарь обновлён"));
    },
    onError: () => { setAction(null); toast.error(c("Action could not be completed. Refresh to check the latest Market state.", "Действие не выполнено. Обновите страницу, чтобы проверить состояние маркета.")); void qc.invalidateQueries({ queryKey: ["inventory"] }); },
  });
  const filters = <div className="space-y-3">
    <label className="block max-w-xs space-y-1 text-xs text-muted-foreground">{c("Find item", "Поиск предмета")}<Input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder={c("Item name", "Название предмета")} /></label>
    <div role="group" aria-label={c("Status", "Статус")} className="transaction-filters">
      {[["", c("All statuses", "Все статусы")] as const, ...Object.entries(labels).map(([value, label]) => [value, c(...label)] as const)].map(([value, label]) => <Button key={value} size="sm" variant={status === value ? "secondary" : "ghost"} aria-pressed={status === value} onClick={() => { setStatus(value); setOffset(0); }}>{label}</Button>)}
    </div>
  </div>;
  if (query.isError) return <section className="space-y-4">{filters}<QueryError onRetry={() => query.refetch()} /></section>;
  if (!query.data) return <section className="space-y-4">{filters}<p role="status" className="text-muted-foreground">{c("Loading inventory…", "Загрузка инвентаря…")}</p></section>;
  const canAttempt = (item: InventoryItem) => {
    if (item.fulfillment_mode === "LEGACY_REVIEW" || (!operator && item.fulfillment_mode === "OPERATOR")) return false;
    if (!operator && item.lifecycle_status === "TRADE_LINK_REQUIRED" && !viewerSettings.data?.trade_link) return false;
    if (item.latest_attempt_status === "BUYER_FAILED" && !operator && !item.buyer_retry_allowed) return false;
    return ["WAITING_VIEWER", "WAITING_OPERATOR", "TRADE_LINK_REQUIRED", "RETRY_AVAILABLE", "INSUFFICIENT_FUNDS"].includes(item.lifecycle_status);
  };
  const canRefund = (item: InventoryItem) => ["WAITING_VIEWER", "WAITING_OPERATOR", "TRADE_LINK_REQUIRED", "RETRY_AVAILABLE", "INSUFFICIENT_FUNDS"].includes(item.lifecycle_status) && item.fulfillment_mode !== "LEGACY_REVIEW";
  return <section aria-label={c("Inventory items", "Предметы инвентаря")} className="space-y-4">
    {filters}
    {!query.data.length && offset === 0 ? <EmptyState title={c("No matching inventory items", "Подходящих предметов нет")} description={c("Items appear here when a reward resolves a concrete skin.", "Предмет появится здесь после выбора конкретного скина для награды.")} /> : <ul className="inventory-grid">{query.data.map(item => <li key={item.id} className="inventory-item">
      <div className="inventory-art"><SkinImage marketItemName={item.item_name} size={300} /></div>
      <div className="min-w-0 space-y-2">
        <p className="eyebrow">{c(...(labels[item.lifecycle_status] || [item.lifecycle_status, item.lifecycle_status]))}</p>
        <h3>{item.item_name}</h3>
        <p className="text-xs text-muted-foreground">{item.reward_title} · <Link to={`/c/${item.channel_login}/profile`}>{item.channel_login}</Link></p>
        <div className="inventory-facts"><span>{formatMinorCurrency(item.fixed_price, item.currency)} <small>{item.fulfillment_mode === "LEGACY_REVIEW" ? c("historical recorded value", "историческая запись стоимости") : c("fixed value", "зафиксированная стоимость")}</small></span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}</time></div>
        {item.fulfillment_mode === "LEGACY_REVIEW" && <p className="text-xs text-amber-300">{c("This older item needs operator review before its original value can be trusted for a new action.", "Для этого старого предмета требуется проверка оператора, прежде чем использовать его стоимость для нового действия.")}</p>}
        {item.lifecycle_status === "TRADE_LINK_REQUIRED" && !operator && <Link className="text-sm text-lime-300" to="/inventory">{c("Add a Steam trade link in settings", "Добавьте ссылку обмена в настройках")}</Link>}
        {item.latest_attempt_status === "BUYER_FAILED" && !item.buyer_retry_allowed && !operator && <p className="text-xs text-muted-foreground">{c("Viewer retry is disabled for this reward.", "Повторная попытка зрителем отключена для этой награды.")}</p>}
        {item.fail_cause && <p className="text-xs text-amber-300 break-words">{item.fail_description || item.fail_cause}</p>}
        {(canAttempt(item) || canRefund(item)) && <div className="flex flex-wrap gap-2 pt-1">{canAttempt(item) && <Button size="sm" onClick={() => setAction({ item, kind: "attempt", useSavedLink: item.latest_attempt_outcome_kind === "trade_link" && (operator || !!viewerSettings.data?.trade_link) })}>{item.latest_attempt_outcome_kind === "trade_link" && (operator || viewerSettings.data?.trade_link) ? c("Try saved trade link", "Использовать сохранённую ссылку") : c(item.attempt_count ? "Try delivery again" : "Start delivery", item.attempt_count ? "Повторить доставку" : "Начать доставку")}</Button>}{canRefund(item) && <Button size="sm" variant="outline" onClick={() => setAction({ item, kind: "refund" })}>{c("Return Channel Points", "Вернуть баллы")}</Button>}</div>}
        {operator && <details className="builder-advanced"><summary>{c("Market references", "Данные Маркета")}</summary><dl className="preview-facts"><div><dt>Inventory ID</dt><dd className="break-all">{item.id}</dd></div><div><dt>Redemption ID</dt><dd className="break-all">{item.redemption_id}</dd></div><div><dt>{c("Attempts", "Попытки")}</dt><dd>{item.attempt_count}</dd></div><div><dt>{c("Latest attempt", "Последняя попытка")}</dt><dd className="break-all">{item.latest_attempt_custom_id || "—"}</dd></div><div><dt>{c("Attempt state", "Состояние попытки")}</dt><dd>{item.latest_attempt_status || "—"}</dd></div><div><dt>{c("Latest ceiling", "Последний лимит")}</dt><dd>{item.latest_attempt_max_price == null ? "—" : formatMinorCurrency(item.latest_attempt_max_price, item.currency)}</dd></div><div><dt>Market custom ID</dt><dd className="break-all">{item.market_custom_id || "—"}</dd></div><div><dt>Market order ID</dt><dd className="break-all">{item.market_order_id || "—"}</dd></div></dl></details>}
      </div>
    </li>)}</ul>}
    {!!query.data.length && <div className="flex items-center gap-4"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>{c("Previous", "Назад")}</Button><span className="text-xs text-muted-foreground">{c("Page", "Страница")} {Math.floor(offset / limit) + 1}</span><Button variant="outline" disabled={query.data.length < limit} onClick={() => setOffset(offset + limit)}>{c("Next", "Далее")}</Button></div>}
    <ConfirmAction open={!!action} onClose={() => setAction(null)} onConfirm={() => { if (action && !mutation.isPending) mutation.mutate(action); }} pending={mutation.isPending} destructive={action?.kind === "refund"} title={action?.kind === "refund" ? c("Return Channel Points?", "Вернуть баллы канала?") : c("Start a Market order?", "Создать заказ на маркете?")} description={action?.kind === "refund" ? c("Fulfillment will close only after the server verifies that no order or trade can still deliver this item.", "Выдача завершится только после проверки, что заказ или обмен больше не может доставить предмет.") : c("A new order is created only when the previous attempt is confirmed safe to retry.", "Новый заказ создаётся только после подтверждения безопасности повторной попытки.")} label={action?.kind === "refund" ? c("Return points", "Вернуть баллы") : c("Start order", "Создать заказ")} context={action?.item.item_name} />
  </section>;
}
