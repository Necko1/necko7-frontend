import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import RedemptionList from "@/components/redemptions/RedemptionList";
import type { RedemptionStatus } from "@/types/api";

const STATUS_OPTIONS: { value: RedemptionStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ORDER_CREATED", label: "Order Created" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED_REFUND", label: "Refunded" },
  { value: "FAILED_PENALTY", label: "Penalized" },
];

const PAGE_SIZES = [10, 25, 50];

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function RedemptionsPage() {
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const location = useLocation();

  // Read optional ?userId= from URL
  const queryParams = new URLSearchParams(location.search);
  const initialUserId = queryParams.get("userId") ?? "";

  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | "">("");
  const [userIdFilter, setUserIdFilter] = useState(initialUserId);
  const [userIdInput, setUserIdInput] = useState(initialUserId);
  const [pageSize, setPageSize] = useState(25);

  const applyUserFilter = () => setUserIdFilter(userIdInput.trim());

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
      <div className="flex flex-col gap-3">
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

        {/* User ID filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <IconSearch />
            </div>
            <input
              type="text"
              placeholder="Filter by User ID…"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyUserFilter()}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={applyUserFilter}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Filter
          </button>
          {userIdFilter && (
            <button
              type="button"
              onClick={() => { setUserIdFilter(""); setUserIdInput(""); }}
              className="h-9 px-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center gap-1 text-xs"
            >
              <IconX />
              Clear
            </button>
          )}
          {userIdFilter && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
              Filtering: {userIdFilter}
            </span>
          )}
        </div>
      </div>

      {/* Redemption list */}
      <RedemptionList
        channelId={channelId}
        statusFilter={statusFilter || null}
        userIdFilter={userIdFilter || null}
        pageSize={pageSize}
      />
    </div>
  );
}
