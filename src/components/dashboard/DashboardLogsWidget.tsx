import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { logsApi } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLogsWidgetProps {
  channelId: string;
}

const IconAlertCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function DashboardLogsWidget({ channelId }: DashboardLogsWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["logs-summary", channelId],
    queryFn: () => logsApi.summary(channelId).then((r) => r.data),
    enabled: !!channelId,
    staleTime: 15_000,
  });

  const hasErrors = (summary?.errors_last_24h ?? 0) > 0;
  const hasWarnings = (summary?.warnings_last_24h ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("logs.systemHealth")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("logs.systemHealthDesc")}
          </p>
        </div>

        <Link to="/logs">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            {t("logs.openLogs")}
            <IconArrowRight />
          </Button>
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Errors */}
        <div
          onClick={() => navigate("/logs?level=ERROR")}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            hasErrors
              ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 hover:bg-rose-500/10"
              : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t("logs.errors")}</span>
            <span className={cn(hasErrors ? "text-rose-400" : "text-muted-foreground/60")}>
              <IconAlertCircle />
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className={cn("text-2xl font-bold tabular-nums", hasErrors ? "text-rose-400" : "text-foreground")}>
              {summary?.errors_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Warnings */}
        <div
          onClick={() => navigate("/logs?level=WARN")}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] select-none",
            hasWarnings
              ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
              : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t("logs.warnings")}</span>
            <span className={cn(hasWarnings ? "text-amber-400" : "text-muted-foreground/60")}>
              <IconAlertTriangle />
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className={cn("text-2xl font-bold tabular-nums", hasWarnings ? "text-amber-400" : "text-foreground")}>
              {summary?.warnings_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Info */}
        <div
          onClick={() => navigate("/logs?level=INFO")}
          className="rounded-xl border border-border/60 bg-muted/20 p-4 cursor-pointer transition-all hover:border-border hover:bg-muted/30 hover:scale-[1.01] select-none"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t("logs.info")}</span>
            <span className="text-muted-foreground/60">
              <IconInfo />
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {summary?.info_last_24h ?? 0}
            </p>
          )}
        </div>

        {/* Total Events */}
        <div
          onClick={() => navigate("/logs")}
          className="rounded-xl border border-border/60 bg-muted/20 p-4 cursor-pointer transition-all hover:border-border hover:bg-muted/30 hover:scale-[1.01] select-none"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t("logs.totalEvents")}</span>
            <span className="text-muted-foreground/60">
              <IconActivity />
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {summary?.total_last_24h ?? 0}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
