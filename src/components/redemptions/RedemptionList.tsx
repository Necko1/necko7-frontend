import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { redemptionsApi } from "@/lib/apiClient";
import type { RedemptionResponse, RedemptionStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatMinorCurrency } from "@/lib/currency";
import { toast } from "sonner";

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: "Pending",
  ORDER_CREATED: "Order Created",
  MANUAL_HOLD: "Manual Hold",
  COMPLETED: "Completed",
  FAILED_REFUND: "Refunded",
  FAILED_PENALTY: "Penalized",
  Pending: "Pending",
  OrderCreated: "Order Created",
  ManualHold: "Manual Hold",
  Completed: "Completed",
  FailedRefund: "Refunded",
  FailedPenalty: "Penalized",
};

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
const IconRetry = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconRefund = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);
const IconPenalty = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={cn("transition-transform", open && "rotate-180")}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconUser = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconCopy = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// ── Redemption Row ─────────────────────────────────────────────────────────
function RedemptionRow({
  redemption,
  channelId,
  compact,
}: {
  redemption: RedemptionResponse;
  channelId: string;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tradeCopied, setTradeCopied] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const retryMutation = useMutation({
    mutationFn: () => redemptionsApi.retry(channelId, redemption.twitch_redemption_id),
    onSuccess: (res) => {
      const updated = res.data;
      qc.setQueriesData({ queryKey: ["redemptions"] }, (oldData: any) => {
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
      qc.invalidateQueries({ queryKey: ["redemptions"] });
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
      qc.invalidateQueries({ queryKey: ["redemptions"] });
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
      qc.invalidateQueries({ queryKey: ["redemptions"] });
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

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat/users/${redemption.user_id}`);
  };

  const handleCopyTradeLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(redemption.user_trade_link).then(() => {
      setTradeCopied(true);
      setTimeout(() => setTradeCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-all">
      {/* Main row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <Badge className={cn("text-xs shrink-0 rounded-md px-2 py-0.5 font-medium border", STATUS_CLASSES[redemption.status] || "status-pending")}>
          {getStatusLabel(redemption.status)}
        </Badge>
        {redemption.retry_count > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500 bg-amber-500/10 font-normal shrink-0">
            {redemption.retry_count} {redemption.retry_count === 1 ? t("redemptions.retryOne") : t("redemptions.retriesMany")}
          </Badge>
        )}
        {/* Clickable username */}
        <button
          type="button"
          onClick={handleUserClick}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline shrink-0 flex items-center gap-1 transition-colors"
        >
          @{redemption.user_login}
        </button>
        {redemption.market_item_name && (
          <span
            className="text-xs text-muted-foreground/80 truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px] font-medium"
            title={redemption.market_item_name}
          >
            {redemption.market_item_name}
          </span>
        )}
        {!compact && (
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {format(new Date(redemption.created_at), "dd MMM HH:mm")}
          </span>
        )}
        <span className={cn("text-xs tabular-nums text-primary font-medium shrink-0", compact ? "ml-auto" : "ml-auto sm:ml-0")}>
          {redemption.twitch_points_cost.toLocaleString()} {t("common.pts")}
        </span>
        <IconChevron open={open} />
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-border bg-muted/10 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.redemptionId")}</p>
              <p className="font-mono text-foreground break-all">{redemption.twitch_redemption_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.rewardId")}</p>
              <p className="font-mono text-foreground break-all">{redemption.twitch_reward_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.userId")}</p>
              <div className="flex items-center gap-2">
                <p className="text-foreground">{redemption.user_id}</p>
                <button
                  type="button"
                  onClick={handleUserClick}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <IconUser />
                  {t("redemptions.viewProfile")}
                </button>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.retryCount")}</p>
              <p className="text-foreground tabular-nums">{redemption.retry_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.marketPaid")}</p>
              <p className="text-foreground tabular-nums">
                {redemption.market_paid_price != null
                  ? formatMinorCurrency(redemption.market_paid_price, redemption.currency)
                  : "–"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.pointsCost")}</p>
              <p className="text-foreground tabular-nums">{redemption.twitch_points_cost.toLocaleString()} {t("common.pts")}</p>
            </div>
            {redemption.market_item_name != null && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-0.5">{t("redemptions.marketItem")}</p>
                <a
                  href={`https://market.csgo.com/en/?search=${encodeURIComponent(redemption.market_item_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-medium break-all"
                >
                  {redemption.market_item_name}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )}
            {/* Trade link */}
            {redemption.user_trade_link && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">{t("redemptions.steamTradeLink")}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-mono text-[10px] text-foreground break-all truncate max-w-[240px]">
                    {redemption.user_trade_link}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyTradeLink}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-all",
                      tradeCopied
                        ? "border-green-500/40 text-green-500 bg-green-500/10"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <IconCopy />
                    {tradeCopied ? t("common.copied") : t("common.copy")}
                  </button>
                  <a
                    href={redemption.user_trade_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <IconExternalLink />
                    {t("common.open")}
                  </a>
                </div>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.created")}</p>
              <p className="text-foreground">{format(new Date(redemption.created_at), "dd MMM yyyy HH:mm:ss")}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t("redemptions.updated")}</p>
              <p className="text-foreground">{format(new Date(redemption.updated_at), "dd MMM yyyy HH:mm:ss")}</p>
            </div>
            {redemption.fail_cause && (
              <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-destructive">
                    {FAIL_CAUSE_I18N_KEYS[redemption.fail_cause]
                      ? t(FAIL_CAUSE_I18N_KEYS[redemption.fail_cause])
                      : formatFailCause(redemption.fail_cause)}
                  </span>
                  <code className="text-[10px] font-mono bg-destructive/10 text-destructive/80 px-1.5 py-0.5 rounded border border-destructive/20">
                    {redemption.fail_cause}
                  </code>
                </div>
                {redemption.fail_description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getLocalizedFailDescription(redemption.fail_description, i18n.language)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons for failed / pending / manual hold states */}
          {(isFailedPenalty || isPending || isManualHold) && (
            <div className="flex flex-wrap gap-2">
              {(isFailedPenalty || isManualHold) && (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs cursor-pointer"
                  onClick={() => retryMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconRetry />
                  {t("redemptions.retryMarketOrder")}
                </Button>
              )}
              {(isPending || isManualHold) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs cursor-pointer"
                  onClick={() => refundMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconRefund />
                  {t("redemptions.refund")}
                </Button>
              )}
              {(isPending || isManualHold) && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 text-xs cursor-pointer"
                  onClick={() => penaltyMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconPenalty />
                  {t("redemptions.penalize")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
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

export default function RedemptionList({
  channelId,
  rewardId,
  statusFilter,
  userIdFilter,
  compact,
  pageSize = 10,
}: RedemptionListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
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
    placeholderData: (prev) => prev,
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

  if (!data || data.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t("redemptions.noRedemptions")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.items.map((r) => (
        <RedemptionRow
          key={r.twitch_redemption_id}
          redemption={r}
          channelId={channelId}
          compact={compact}
        />
      ))}

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
