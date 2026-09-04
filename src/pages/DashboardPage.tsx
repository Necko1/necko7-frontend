import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { statsApi, broadcastersApi } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatMajorCurrency, formatMinorCurrency } from "@/lib/currency";

// ── Stat Card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentClass?: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon, accentClass, loading }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-6 space-y-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
      accentClass
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <>
          <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

// ── Period Selector ────────────────────────────────────────────────────────
const PERIODS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
] as const;

type Period = (typeof PERIODS)[number]["key"];

// ── Icons ─────────────────────────────────────────────────────────────────
const IconTrendUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCoins = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
);
const IconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <path d="M1 10h22" /><circle cx="18" cy="15" r="1" fill="currentColor" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────

function NoBroadcaster({ broadcasters }: { broadcasters: { channel_id: string }[] }) {
  const navigate = useNavigate();
  if (broadcasters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-96 space-y-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No channels available</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
            Ask a streamer to grant you access to their channel, or connect your own channel as a streamer.
          </p>
        </div>
        <Button onClick={() => navigate("/channels")} className="rounded-xl">
          Connect or view channels
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 space-y-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Select a channel</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Choose a broadcaster channel to view the dashboard.
        </p>
      </div>
      <Button onClick={() => navigate("/channels")} className="rounded-xl">
        Select channel
      </Button>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { selectedBroadcasterId, broadcasters, getSelectedBroadcaster } = useAppStore();
  const [period, setPeriod] = useState<Period>("month");
  const broadcaster = getSelectedBroadcaster();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", selectedBroadcasterId, period],
    queryFn: () => statsApi.get(selectedBroadcasterId!, period).then((r) => r.data),
    enabled: !!selectedBroadcasterId,
  });

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance", selectedBroadcasterId],
    queryFn: () => broadcastersApi.getBalance(selectedBroadcasterId!).then((r) => r.data),
    enabled: !!selectedBroadcasterId,
    staleTime: 60_000,
    retry: false, // Balance might not be available without market API key
  });

  if (!selectedBroadcasterId) {
    return (
      <div className="p-8">
        <NoBroadcaster broadcasters={broadcasters} />
      </div>
    );
  }

  const completionRate = stats
    ? stats.total_redemptions > 0
      ? Math.round((stats.completed / stats.total_redemptions) * 100)
      : 0
    : null;

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {broadcaster?.channel_login ?? "–"} · Statistics overview
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                period === p.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Redemptions"
          value={stats?.total_redemptions ?? "–"}
          subtitle={period === "week" ? "Last 7 days" : period === "month" ? "Last 30 days" : "Last year"}
          icon={<IconTrendUp />}
          loading={statsLoading}
        />
        <StatCard
          title="Completed"
          value={stats ? `${stats.completed} (${completionRate}%)` : "–"}
          subtitle="Successful purchases"
          icon={<IconCheck />}
          loading={statsLoading}
          accentClass="border-emerald-500/10"
        />
        <StatCard
          title="Failed"
          value={stats?.failed ?? "–"}
          subtitle="Refunded or penalized"
          icon={<IconX />}
          loading={statsLoading}
          accentClass="border-red-500/10"
        />
        <StatCard
          title="Points Earned"
          value={stats ? stats.total_points_earned.toLocaleString() : "–"}
          subtitle="Twitch channel points"
          icon={<IconCoins />}
          loading={statsLoading}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Spent on Market"
          value={
            stats
              ? formatMinorCurrency(stats.total_spent, balance?.currency ?? "RUB")
              : "–"
          }
          subtitle="From completed redemptions"
          icon={<IconBag />}
          loading={statsLoading}
        />
        <StatCard
          title="Market Balance"
          value={
            balance
              ? formatMajorCurrency(balance.money, balance.currency)
              : balanceLoading ? "–" : "N/A"
          }
          subtitle={
            balance
              ? `Settlement: ${formatMajorCurrency(balance.money_settlement, balance.currency)}${(() => {
                  try {
                    return ` · Updated ${format(new Date(balance.updated_at), "HH:mm")}`;
                  } catch {
                    return "";
                  }
                })()}`
              : "Market API key not configured"
          }
          icon={<IconWallet />}
          loading={balanceLoading}
          accentClass="border-primary/10"
        />
      </div>
    </div>
  );
}
