import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { redemptionsApi } from "@/lib/apiClient";
import type { RedemptionResponse, RedemptionStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatMinorCurrency } from "@/lib/currency";

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: "Pending",
  ORDER_CREATED: "Order Created",
  COMPLETED: "Completed",
  FAILED_REFUND: "Refunded",
  FAILED_PENALTY: "Penalized",
  Pending: "Pending",
  OrderCreated: "Order Created",
  Completed: "Completed",
  FailedRefund: "Refunded",
  FailedPenalty: "Penalized",
};

const STATUS_CLASSES: Record<RedemptionStatus, string> = {
  PENDING: "status-pending",
  ORDER_CREATED: "status-order-created",
  COMPLETED: "status-completed",
  FAILED_REFUND: "status-failed-refund",
  FAILED_PENALTY: "status-failed-penalty",
  Pending: "status-pending",
  OrderCreated: "status-order-created",
  Completed: "status-completed",
  FailedRefund: "status-failed-refund",
  FailedPenalty: "status-failed-penalty",
};

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
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: () => redemptionsApi.retry(channelId, redemption.twitch_redemption_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
  const refundMutation = useMutation({
    mutationFn: () => redemptionsApi.refund(channelId, redemption.twitch_redemption_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
  const penaltyMutation = useMutation({
    mutationFn: () => redemptionsApi.penalty(channelId, redemption.twitch_redemption_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });

  const isLoading = retryMutation.isPending || refundMutation.isPending || penaltyMutation.isPending;

  const isFailedPenalty =
    redemption.status === "FAILED_PENALTY" ||
    redemption.status === "FailedPenalty";
  const isPending =
    redemption.status === "PENDING" ||
    redemption.status === "Pending";

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-all">
      {/* Main row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <Badge className={cn("text-xs shrink-0 rounded-md px-2 py-0.5 font-medium border", STATUS_CLASSES[redemption.status] || "status-pending")}>
          {STATUS_LABELS[redemption.status] || redemption.status}
        </Badge>
        {redemption.retry_count > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500 bg-amber-500/10 font-normal shrink-0">
            {redemption.retry_count} {redemption.retry_count === 1 ? "retry" : "retries"}
          </Badge>
        )}
        <span className="text-sm font-medium text-foreground shrink-0">@{redemption.user_login}</span>
        {!compact && (
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {format(new Date(redemption.created_at), "dd MMM HH:mm")}
          </span>
        )}
        <span className="text-xs tabular-nums text-primary font-medium ml-auto shrink-0">
          {redemption.twitch_points_cost.toLocaleString()} pts
        </span>
        <IconChevron open={open} />
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-border bg-muted/10 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Redemption ID</p>
              <p className="font-mono text-foreground break-all">{redemption.twitch_redemption_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Reward ID</p>
              <p className="font-mono text-foreground break-all">{redemption.twitch_reward_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">User ID</p>
              <p className="text-foreground">{redemption.user_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Retry Count</p>
              <p className="text-foreground tabular-nums">{redemption.retry_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Market Paid</p>
              <p className="text-foreground tabular-nums">
                {redemption.market_paid_price != null
                  ? formatMinorCurrency(redemption.market_paid_price, redemption.currency)
                  : "–"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Points Cost</p>
              <p className="text-foreground tabular-nums">{redemption.twitch_points_cost.toLocaleString()} pts</p>
            </div>
            {redemption.market_item_name != null && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-0.5">Market Item</p>
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
            <div>
              <p className="text-muted-foreground mb-0.5">Created</p>
              <p className="text-foreground">{format(new Date(redemption.created_at), "dd MMM yyyy HH:mm:ss")}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Updated</p>
              <p className="text-foreground">{format(new Date(redemption.updated_at), "dd MMM yyyy HH:mm:ss")}</p>
            </div>
            {redemption.fail_cause && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-0.5">Fail Cause</p>
                <p className="text-destructive">{redemption.fail_cause}</p>
                {redemption.fail_description && (
                  <p className="text-muted-foreground text-xs mt-0.5">{redemption.fail_description}</p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons for failed / pending states */}
          {(isFailedPenalty || isPending) && (
            <div className="flex flex-wrap gap-2">
              {isFailedPenalty && (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => retryMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconRetry />
                  Retry Market Order
                </Button>
              )}
              {isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => refundMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconRefund />
                  Refund
                </Button>
              )}
              {isPending && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 text-xs"
                  onClick={() => penaltyMutation.mutate()}
                  disabled={isLoading}
                >
                  <IconPenalty />
                  Penalize
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
  compact?: boolean;
  pageSize?: number;
}

export default function RedemptionList({
  channelId,
  rewardId,
  statusFilter,
  compact,
  pageSize = 10,
}: RedemptionListProps) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["redemptions", channelId, rewardId, statusFilter, page, pageSize],
    queryFn: () =>
      redemptionsApi
        .list(channelId, {
          reward_id: rewardId ?? null,
          status: statusFilter ?? null,
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
        No redemptions found.
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
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages} · {data.total} total
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
