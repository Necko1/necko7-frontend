import ItemArtwork from "@/components/common/SkinImage";
import RedemptionCase from "./RedemptionCase";
import ConfirmAction from "@/components/common/ConfirmAction";
import { EmptyState, QueryError } from "@/components/common/Page";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { redemptionsApi } from "@/lib/apiClient";
import type { RedemptionResponse, RedemptionStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<RedemptionStatus, string> = {
  PENDING: "status-pending",
  ORDER_CREATED: "status-order-created",
  MANUAL_HOLD: "status-manual-hold",
  COMPLETED: "status-completed",
  FAILED_REFUND: "status-failed-refund",
  FAILED_PENALTY: "status-failed-penalty",
  Pending: "status-pending",
  OrderCreated: "status-order-created",
  ManualHold: "status-manual-hold",
  Completed: "status-completed",
  FailedRefund: "status-failed-refund",
  FailedPenalty: "status-failed-penalty",
};

const FAIL_CAUSE_I18N_KEYS: Record<string, string> = {
  seller_timeout_retries_exhausted: "redemptions.failCauses.seller_timeout_retries_exhausted",
  seller_timeout: "redemptions.failCauses.seller_timeout",
  buyer_not_claimed: "redemptions.failCauses.buyer_not_claimed",
  invalid_trade_url: "redemptions.failCauses.invalid_trade_url",
  buyer_banned: "redemptions.failCauses.buyer_banned",
  timeout: "redemptions.failCauses.timeout",
  market_retry_failed: "redemptions.failCauses.market_retry_failed",
  no_money: "redemptions.failCauses.no_money",
  price_above_max: "redemptions.failCauses.price_above_max",
  item_not_found: "redemptions.failCauses.item_not_found",
  market_error: "redemptions.failCauses.market_error",
  filter_exhausted: "redemptions.failCauses.filter_exhausted",
};

function formatFailCause(cause: string): string {
  return cause
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const FAIL_DESCRIPTION_TRANSLATIONS: {
  en: Record<string, string>;
  ru: Record<string, string>;
} = {
  en: {
    "Не найден предмет с указанным шансом на передачу по указанной цене или ниже":
      "No item found with specified transfer chance at or below permissible price",
    "Не найден предмет по указанной цене или ниже":
      "No item found at or below permissible price",
    "Не найден подходящий предмет на маркете":
      "No matching item found on CSGO Market",
    "Недостаточно средств на балансе бота":
      "Insufficient bot market balance",
    "Таймаут ожидания передачи":
      "Trade transfer timeout",
    "Зритель не принял трейд вовремя":
      "Viewer did not accept trade offer in time",
    "Неверная ссылка на обмен":
      "Invalid Steam trade offer URL",
    "Трейд-бан или ограничения у зрителя":
      "Trade restrictions or trade ban on viewer",
  },
  ru: {
    "Viewer did not accept trade offer on Steam in time or declined it":
      "Зритель не принял трейд в Steam вовремя или отклонил его",
    "Market rejected purchase retry: item not available":
      "Маркет отклонил повторный заказ: предмет недоступен",
    "Viewer did not accept trade offer in time":
      "Зритель не принял обмен в Steam вовремя",
  },
};

function getLocalizedFailDescription(desc: string | null | undefined, language: string): string | null {
  if (!desc) return null;
  const isEn = language.startsWith("en");
  const dict = isEn ? FAIL_DESCRIPTION_TRANSLATIONS.en : FAIL_DESCRIPTION_TRANSLATIONS.ru;
  if (dict[desc]) return dict[desc];
  if (!isEn && desc.startsWith("Market rejected purchase retry: ")) {
    const reason = desc.replace("Market rejected purchase retry: ", "");
    return `Маркет отклонил повторный заказ: ${reason}`;
  }
  return desc;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={cn("transition-transform", open && "rotate-180")}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
// ── Redemption Row ─────────────────────────────────────────────────────────
function RedemptionRow({
  redemption,
  channelId,
  compact: _compact,
}: {
  redemption: RedemptionResponse;
  channelId: string;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(() => params.get("redemption") === redemption.twitch_redemption_id);
  const [action, setAction] = useState<"retry" | "refund" | "penalty" | null>(null);
  const role = useAppStore(state => state.broadcasters.find(b => b.channel_id === channelId)?.role.toUpperCase());
  const canAct = role === "OWNER" || role === "EDITOR";
  const qc = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: () => redemptionsApi.retry(channelId, redemption.twitch_redemption_id),
    onSuccess: (res) => {
      setAction(null);
      const updated = res.data;
      qc.setQueriesData({ queryKey: ["redemptions", channelId] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((item: RedemptionResponse) =>
            item.twitch_redemption_id === updated.twitch_redemption_id
              ? { ...item, ...updated }
              : item
          ),
        };
      });
      qc.invalidateQueries({ queryKey: ["redemptions", channelId] });
      qc.invalidateQueries({ queryKey: ["stats", channelId] });
      qc.invalidateQueries({ queryKey: ["balance", channelId] });
      qc.invalidateQueries({ queryKey: ["channel-logs", channelId] });
      qc.invalidateQueries({ queryKey: ["logs-summary", channelId] });
      qc.invalidateQueries({ queryKey: ["case-events", channelId] });
      qc.invalidateQueries({ queryKey: ["viewer-context", channelId, redemption.user_id] });
      toast.success(t("redemptions.retrySuccess", "Заказ успешно создан на маркете!"));
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        t("redemptions.retryError", "Ошибка маркета при создании заказа");
      toast.error(message);
    },
  });
  const refundMutation = useMutation({
    mutationFn: () => redemptionsApi.refund(channelId, redemption.twitch_redemption_id),
    onSuccess: () => {
      setAction(null);
      qc.invalidateQueries({ queryKey: ["redemptions", channelId] });
      qc.invalidateQueries({ queryKey: ["stats", channelId] });
      qc.invalidateQueries({ queryKey: ["balance", channelId] });
      qc.invalidateQueries({ queryKey: ["channel-logs", channelId] });
      qc.invalidateQueries({ queryKey: ["logs-summary", channelId] });
      qc.invalidateQueries({ queryKey: ["case-events", channelId] });
      qc.invalidateQueries({ queryKey: ["viewer-context", channelId, redemption.user_id] });
      toast.success(t("redemptions.refundSuccess", "Баллы успешно возвращены!"));
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        t("redemptions.refundError", "Ошибка при возврате баллов");
      toast.error(message);
    },
  });
  const penaltyMutation = useMutation({
    mutationFn: () => redemptionsApi.penalty(channelId, redemption.twitch_redemption_id),
    onSuccess: () => {
      setAction(null);
      qc.invalidateQueries({ queryKey: ["redemptions", channelId] });
      qc.invalidateQueries({ queryKey: ["stats", channelId] });
      qc.invalidateQueries({ queryKey: ["balance", channelId] });
      qc.invalidateQueries({ queryKey: ["channel-logs", channelId] });
      qc.invalidateQueries({ queryKey: ["logs-summary", channelId] });
      qc.invalidateQueries({ queryKey: ["case-events", channelId] });
      qc.invalidateQueries({ queryKey: ["viewer-context", channelId, redemption.user_id] });
      toast.success(t("redemptions.penaltySuccess", "Выкуп успешно оштрафован!"));
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        t("redemptions.penaltyError", "Ошибка при штрафе выкупа");
      toast.error(message);
    },
  });

  const isLoading = retryMutation.isPending || refundMutation.isPending || penaltyMutation.isPending;

  const isFailedPenalty =
    redemption.status === "FAILED_PENALTY" ||
    redemption.status === "FailedPenalty";
  const isPending =
    redemption.status === "PENDING" ||
    redemption.status === "Pending";
  const isManualHold =
    redemption.status === "MANUAL_HOLD" ||
    redemption.status === "ManualHold";

  const getStatusLabel = (status: RedemptionStatus) => {
    switch (status) {
      case "PENDING":
      case "Pending":
        return t("redemptions.statuses.pending");
      case "ORDER_CREATED":
      case "OrderCreated":
        return t("redemptions.statuses.orderCreated");
      case "MANUAL_HOLD":
      case "ManualHold":
        return t("redemptions.statuses.manualHold");
      case "COMPLETED":
      case "Completed":
        return t("redemptions.statuses.completed");
      case "FAILED_REFUND":
      case "FailedRefund":
        return t("redemptions.statuses.refunded");
      case "FAILED_PENALTY":
      case "FailedPenalty":
        return t("redemptions.statuses.penalized");
      default:
        return status;
    }
  };

  return (
    <div className="ledger-row">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={`detail-${redemption.twitch_redemption_id}`} className="ledger-summary">
        <span className="ledger-status"><Badge className={cn("text-xs rounded px-2 py-1 font-medium", STATUS_CLASSES[redemption.status] || "status-pending")}>{getStatusLabel(redemption.status)}</Badge></span>
        <span className="ledger-person min-w-0"><span className="ledger-art"><ItemArtwork key={redemption.market_item_name} marketItemName={redemption.market_item_name}/></span><span className="block text-sm font-semibold truncate">{redemption.market_item_name || t("ops.unknownItem")}</span><span className="mt-1 block text-xs text-muted-foreground truncate">@{redemption.user_login}{redemption.retry_count > 0 && ` · ${redemption.retry_count} ${t("redemptions.retriesMany")}`}</span>{isManualHold && redemption.fail_cause && <span className="mt-1 block text-xs text-amber-300 truncate">{FAIL_CAUSE_I18N_KEYS[redemption.fail_cause] ? t(FAIL_CAUSE_I18N_KEYS[redemption.fail_cause]) : formatFailCause(redemption.fail_cause)}</span>}</span>
        <span className="ledger-date text-xs text-muted-foreground">{format(new Date(redemption.created_at), "dd MMM HH:mm")}</span>
        <span className="ledger-points text-xs tabular-nums text-right">{redemption.twitch_points_cost.toLocaleString()} <span className="text-muted-foreground">{t("common.pts")}</span></span>
        <span className="ledger-chevron"><IconChevron open={open} /></span>
      </button>

      {open && <RedemptionCase redemption={redemption} channelId={channelId} statusLabel={getStatusLabel(redemption.status)} failure={getLocalizedFailDescription(redemption.fail_description, i18n.language) || (redemption.fail_cause ? (FAIL_CAUSE_I18N_KEYS[redemption.fail_cause] ? t(FAIL_CAUSE_I18N_KEYS[redemption.fail_cause]) : formatFailCause(redemption.fail_cause)) : "")} canAct={canAct} pending={isLoading} onAction={setAction} />}
      <ConfirmAction open={!!action} onClose={() => setAction(null)} pending={isLoading} destructive={action === "penalty"}
        title={t(`ops.${action || "retry"}Title`)} description={t(`ops.${action || "retry"}Desc`)}
        label={action === "retry" ? t("redemptions.retryMarketOrder") : action === "refund" ? t("redemptions.refund") : t("ops.penaltyLabel")}
        context={t("ops.confirmContext", { user: redemption.user_login, points: redemption.twitch_points_cost.toLocaleString(), item: redemption.market_item_name || t("ops.unknownItem") })}
        onConfirm={() => { if (isLoading || !canAct) return; if (action === "retry" ? !(isFailedPenalty || isManualHold) : !(isPending || isManualHold)) { setAction(null); return; } if (action === "retry") retryMutation.mutate(); if (action === "refund") refundMutation.mutate(); if (action === "penalty") penaltyMutation.mutate(); }} />
    </div>
  );
}

// ── Redemption List (reusable) ─────────────────────────────────────────────
interface RedemptionListProps {
  channelId: string;
  rewardId?: string;
  statusFilter?: RedemptionStatus | null;
  userIdFilter?: string | null;
  compact?: boolean;
  pageSize?: number;
}

function RedemptionListContent({
  channelId,
  rewardId,
  statusFilter,
  userIdFilter,
  compact,
  pageSize = 10,
}: RedemptionListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["redemptions", channelId, rewardId, statusFilter, userIdFilter, page, pageSize],
    queryFn: () =>
      redemptionsApi
        .list(channelId, {
          reward_id: rewardId ?? null,
          status: statusFilter ?? null,
          user_id: userIdFilter ?? null,
          offset: page * pageSize,
          limit: pageSize,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    refetchInterval: 15_000,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) return <QueryError onRetry={() => void refetch()} />;
  if (!data || data.items.length === 0) return <EmptyState title={t(statusFilter === "MANUAL_HOLD" ? "ops.noHolds" : "ops.emptyTransactions")} description={t(statusFilter === "MANUAL_HOLD" ? "ops.noHoldsDesc" : "ops.emptyTransactionsDesc")} />;

  return (
    <div className="space-y-3" aria-busy={isFetching}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t("ops.live")} · {t("ops.updated", { time: format(dataUpdatedAt, "HH:mm:ss") })}</span><Button size="sm" variant="ghost" disabled={isFetching} onClick={() => void refetch()}>{t("ops.refresh")}</Button></div>
      <div className="ledger-labels" aria-hidden="true"><span>{t("ops.status")}</span><span>{t("redemptions.marketItem")} / {t("ops.viewer")}</span><span className="ledger-date">{t("redemptions.created")}</span><span className="text-right">{t("redemptions.pointsCost")}</span><span /></div>
      <div className="ledger">
      {data.items.map((r) => (
        <RedemptionRow
          key={r.twitch_redemption_id}
          redemption={r}
          channelId={channelId}
          compact={compact}
        />
      ))}

      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            {t("common.prev")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages} · {data.total} {t("common.total")}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RedemptionList(props: RedemptionListProps) {
  const identity = [props.channelId, props.rewardId, props.statusFilter, props.userIdFilter, props.pageSize].join(":");
  return <RedemptionListContent key={identity} {...props} />;
}
