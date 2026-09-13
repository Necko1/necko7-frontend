import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { broadcastersApi, rewardsApi } from "@/lib/apiClient";
import { QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";

export default function SetupChecklist({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const settings = useQuery({ queryKey: ["settings", channelId], queryFn: () => broadcastersApi.getSettings(channelId).then(r => r.data) });
  const rewards = useQuery({ queryKey: ["rewards", channelId, false], queryFn: () => rewardsApi.list(channelId, { is_deleted: false }).then(r => r.data) });
  if (settings.isError || rewards.isError) return <QueryError onRetry={() => { void settings.refetch(); void rewards.refetch(); }} />;
  if (!settings.data || !rewards.data) return <Skeleton className="h-52" />;
  const steps = [
    { title: t("ops.market"), ready: settings.data.market_api_key_set, label: t(settings.data.market_api_key_set ? "ops.marketReady" : "ops.marketMissing"), href: `/broadcasters/${channelId}/settings#market-integration` },
    { title: t("nav.rewards"), ready: rewards.data.length > 0, label: rewards.data.length ? t("ops.rewardsReady", { count: rewards.data.length }) : t("ops.rewardsMissing"), href: "/rewards" },
    { title: t("ops.bot"), ready: settings.data.is_active, label: t(settings.data.is_active ? "ops.botActive" : "ops.botPaused"), href: `/broadcasters/${channelId}/settings#bot-processing` },
  ];
  const done = steps.filter(s => s.ready).length;
  return <section className="readiness" data-tour="readiness"><div className="section-heading"><h2>{t("ops.setup")}</h2><span className="text-xs text-muted-foreground">{t("ops.setupProgress", { done, total: 3 })}</span></div><div className="flex gap-1 mb-4" aria-hidden="true">{steps.map((s, i) => <span key={i} className={`h-1 flex-1 rounded-full ${s.ready ? "bg-primary/70" : "bg-muted"}`} />)}</div>{steps.map((s, i) => <Link key={s.title} to={s.href} className="flex items-center gap-3 py-3 border-t border-border group"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${s.ready ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{s.ready ? "✓" : i + 1}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium group-hover:text-primary">{s.title}</p><p className="text-xs text-muted-foreground mt-0.5">{s.label}</p></div><span className="text-muted-foreground" aria-hidden="true">→</span></Link>)}</section>;
}
