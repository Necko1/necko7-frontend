import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RedemptionList from "@/components/redemptions/RedemptionList";
import type { RedemptionStatus } from "@/types/api";

const statuses = [
  ["", "all"], ["MANUAL_HOLD", "manualHold"], ["PENDING", "pending"], ["ORDER_CREATED", "orderCreated"],
  ["COMPLETED", "completed"], ["FAILED_REFUND", "refunded"], ["FAILED_PENALTY", "penalized"],
] as const;
export default function RedemptionsPage() {
  const { t } = useTranslation();
  const channelId = useAppStore(s => s.selectedBroadcasterId) || "";
  const [params, setParams] = useSearchParams();
  const requestedStatus = params.get("status") || "";
  const status = statuses.some(s => s[0] === requestedStatus) ? requestedStatus as RedemptionStatus | "" : "";
  const user = params.get("userId") || "";
  const [userInput, setUserInput] = useState(user);
  const [pageSize, setPageSize] = useState(25);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  return <div className="page-shell">
    <PageHeader eyebrow={t("ops.operations")} title={t(status === "MANUAL_HOLD" ? "ops.holds" : "ops.transactions")} description={t(status === "MANUAL_HOLD" ? "ops.holdDesc" : "ops.transactionDesc")} />
    <div className="space-y-4">
      <div aria-label={t("redemptions.title")} className="transaction-filters">{statuses.map(([value, key]) => <Button key={value} size="sm" variant={status === value ? "secondary" : "ghost"} aria-pressed={status === value} className={value === "MANUAL_HOLD" ? "text-amber-300" : ""} onClick={() => update("status", value)}>{t(`redemptions.statuses.${key}`)}</Button>)}</div>
      <div className="transaction-toolbar">
        <form className="flex flex-wrap sm:flex-nowrap items-end gap-2 min-w-0 max-w-sm" onSubmit={event => { event.preventDefault(); update("userId", userInput.trim()); }}><label className="space-y-1.5 min-w-0 flex-1"><span className="text-xs text-muted-foreground">{t("redemptions.userId")}</span><Input aria-label={t("redemptions.filterUserId")} placeholder={t("redemptions.filterUserId")} value={userInput} onChange={e => setUserInput(e.target.value)} /></label><Button type="submit" variant="outline">{t("redemptions.filter")}</Button>{user && <Button variant="ghost" onClick={() => { setUserInput(""); update("userId", ""); }}>{t("common.clear", "Clear")}</Button>}</form>
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">{t("common.perPage")}</span><select aria-label={t("common.perPage")} className="h-9 rounded-md border border-input bg-card px-2 text-foreground" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
    </div>
    <RedemptionList channelId={channelId} statusFilter={status || null} userIdFilter={user || null} pageSize={pageSize} />
  </div>;
}
