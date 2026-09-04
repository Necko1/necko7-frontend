import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import RedemptionList from "@/components/redemptions/RedemptionList";
import type { RedemptionStatus } from "@/types/api";

const STATUS_OPTIONS: { value: RedemptionStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "OrderCreated", label: "Order Created" },
  { value: "Completed", label: "Completed" },
  { value: "FailedRefund", label: "Refunded" },
  { value: "FailedPenalty", label: "Penalized" },
];

const PAGE_SIZES = [10, 25, 50];

export default function RedemptionsPage() {
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";

  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | "">("");
  const [pageSize, setPageSize] = useState(25);

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Redemptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and manage all channel point redemptions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as RedemptionStatus | "")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {PAGE_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setPageSize(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  pageSize === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Redemption list */}
      <RedemptionList
        channelId={channelId}
        statusFilter={statusFilter || null}
        pageSize={pageSize}
      />
    </div>
  );
}
