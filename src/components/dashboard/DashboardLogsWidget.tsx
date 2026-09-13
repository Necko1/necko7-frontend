import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { logsApi } from "@/lib/apiClient";
import { QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
export default function DashboardLogsWidget({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["logs-summary", channelId], queryFn: () => logsApi.summary(channelId).then(r => r.data), enabled: !!channelId, refetchInterval: 30_000 });
  const items = [
    { key: "errors", value: data?.errors_last_24h, level: "ERROR", color: "text-destructive" },
    { key: "warnings", value: data?.warnings_last_24h, level: "WARN", color: "text-amber-300" },
    { key: "info", value: data?.info_last_24h, level: "INFO", color: "text-blue-300" },
    { key: "total", value: data?.total_last_24h, level: "", color: "text-foreground" },
  ];
  return <section><div className="section-heading"><div><h2>{t("logs.systemHealth")}</h2><p className="text-xs text-muted-foreground mt-1">{t("logs.systemHealthDesc")}</p></div><Link className="text-xs text-primary hover:underline" to="/logs">{t("logs.openLogs")} →</Link></div>{isError ? <QueryError onRetry={() => void refetch()} /> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{items.map(item => <Link key={item.key} to={item.level ? `/logs?level=${item.level}` : "/logs"} className="flex items-center justify-between gap-2 border-b border-border p-3 hover:bg-muted/40 rounded-t-md"><span className="text-sm text-muted-foreground">{t(item.key === "total" ? "common.total" : `logs.${item.key}`)}</span>{isLoading ? <Skeleton className="h-6 w-8" /> : <span className={`text-lg tabular-nums font-semibold ${item.color}`}>{item.value ?? "–"}</span>}</Link>)}</div>}</section>;
}
