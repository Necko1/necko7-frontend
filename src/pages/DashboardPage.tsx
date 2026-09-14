import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { statsApi, broadcastersApi, redemptionsApi } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, QueryError, EmptyState } from "@/components/common/Page";
import { formatMajorCurrency, formatMinorCurrency } from "@/lib/currency";
import RedemptionList from "@/components/redemptions/RedemptionList";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import ChatDashboardWidget from "@/components/chat/ChatDashboardWidget";
import DashboardLogsWidget from "@/components/dashboard/DashboardLogsWidget";

export default function DashboardPage() {
  const { t } = useTranslation();
  const channelId = useAppStore(s => s.selectedBroadcasterId) || "";
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const stats = useQuery({ queryKey: ["stats", channelId, period], queryFn: () => statsApi.get(channelId, period).then(r => r.data), enabled: !!channelId });
  const balance = useQuery({ queryKey: ["balance", channelId], queryFn: () => broadcastersApi.getBalance(channelId).then(r => r.data), enabled: !!channelId, retry: false, refetchInterval: 60_000 });
  const holds = useQuery({ queryKey: ["redemptions", channelId, "attention-preview"], queryFn: () => redemptionsApi.list(channelId, { status: "MANUAL_HOLD", limit: 3 }).then(r => r.data), enabled: !!channelId, refetchInterval: 15_000 });
  const cards = [
    [t("dashboard.totalRedemptions"), stats.data?.total_redemptions?.toLocaleString()],
    [t("dashboard.completed"), stats.data?.completed?.toLocaleString()],
    [t("dashboard.failed"), stats.data?.failed?.toLocaleString()],
    [t("dashboard.totalSpent"), stats.data && balance.data ? formatMinorCurrency(stats.data.total_spent, balance.data.currency) : undefined],
    [t("dashboard.pointsEarned"), stats.data?.total_points_earned?.toLocaleString()],
  ];
  return <div className="page-shell">
    <PageHeader eyebrow={t("ops.operations")} title={t("ops.overview")} description={t("ops.overviewDesc")} actions={<Link to="/redemptions" className="text-sm text-primary hover:underline">{t("ops.viewAll")} →</Link>} />
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_290px] pt-4 pb-5">
      <section className="review-desk">
        <div className="review-desk-heading"><span className="review-count">{holds.data ? String(holds.data.total).padStart(2, "0") : "–"}</span><div><h2>{t("ops.attention")}</h2><p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">{t("ops.attentionDesc")}</p></div></div>
        {holds.isLoading ? <Skeleton className="h-40" /> : holds.isError ? <QueryError onRetry={() => void holds.refetch()} /> : holds.data?.total ? <div>{holds.data.items.map((row, i) => <Link key={row.twitch_redemption_id} to={`/redemptions?status=MANUAL_HOLD&redemption=${row.twitch_redemption_id}`} className="review-slip"><span className="review-slip-index">{String(i + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="text-sm font-medium truncate">{row.market_item_name || t("ops.unknownItem")}</p><p className="mt-1 text-xs text-muted-foreground">@{row.user_login} <span className="mx-1.5 opacity-40">/</span> {row.twitch_points_cost.toLocaleString()} {t("common.pts")}</p>{row.fail_cause && <p className="text-xs text-[#f1be73] mt-1.5">{t(`redemptions.failCauses.${row.fail_cause}`, { defaultValue: row.fail_cause.replaceAll("_", " ") })}</p>}</div><span className="review-slip-arrow" aria-hidden="true">↗</span></Link>)}</div> : <EmptyState title={t("ops.noHolds")} description={t("ops.noHoldsDesc")} />}
        <div className="review-desk-footer"><span className="text-[10px] font-mono text-muted-foreground">{t("ops.live")}</span><Link to="/redemptions?status=MANUAL_HOLD">{t("ops.reviewQueue")} →</Link></div>
      </section>
      <aside className="overview-rail">
        <div className="market-register"><p className="eyebrow">market.csgo.com</p><h2 className="text-xs text-muted-foreground mt-3">{t("dashboard.marketBalance")}</h2>{balance.isLoading ? <Skeleton className="h-10 w-32 mt-2" /> : <p className="market-register-amount">{balance.data ? formatMajorCurrency(balance.data.money, balance.data.currency) : t("ops.unavailable")}</p>}{balance.data ? <div className="text-xs text-muted-foreground mt-3 space-y-1"><p>{t("dashboard.settlement")} <span className="text-foreground tabular-nums ml-1">{formatMajorCurrency(balance.data.money_settlement, balance.data.currency)}</span></p><p className="text-[10px] font-mono">{t("dashboard.updated")} {new Date(balance.data.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div> : balance.isError && <div className="mt-2"><p className="text-xs text-muted-foreground">{t("ops.balanceUnavailable")}</p><Button className="mt-2" size="sm" variant="outline" disabled={balance.isFetching} onClick={() => void balance.refetch()}>{t("ops.tryAgain")}</Button></div>}</div>
        <SetupChecklist channelId={channelId} />
      </aside>
    </div>
    <section><div className="section-heading"><h2>{t("ops.recent")}</h2><Link className="text-xs text-primary hover:underline" to="/redemptions">{t("ops.viewAll")} →</Link></div><RedemptionList channelId={channelId} pageSize={5} compact /></section>
    <section><div className="section-heading"><div><h2>{t("ops.activity")}</h2><p className="text-xs text-muted-foreground mt-1">{t("ops.activityDesc")}</p></div><div className="flex gap-1">{(["week", "month", "year"] as const).map(p => <Button key={p} variant={p === period ? "secondary" : "ghost"} size="sm" aria-pressed={p === period} onClick={() => setPeriod(p)}>{t(`dashboard.${p}`)}</Button>)}</div></div>{stats.isError ? <QueryError onRetry={() => void stats.refetch()} /> : <div className="metric-strip">{cards.map(([label, value]) => <div className="min-w-0" key={label}><p className="text-xs text-muted-foreground">{label}</p>{stats.isLoading ? <Skeleton className="h-7 w-20 mt-2" /> : <p className="metric-value tabular-nums">{value ?? "–"}</p>}</div>)}</div>}</section>
    <DashboardLogsWidget channelId={channelId} />
    <ChatDashboardWidget channelId={channelId} compact />
  </div>;
}
