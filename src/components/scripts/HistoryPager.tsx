import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { errorText } from "./data";
import type { useExecutionHistory } from "./useExecutionHistory";

export function HistoryPager({ history }: { history: ReturnType<typeof useExecutionHistory> }) {
  const { t } = useTranslation();
  const { query } = history;
  return <div className="script-history-pager">
    <span role="status">{query.isPending ? t("scripts.loadingHistory") : query.data ? t("scripts.pageResults", {
      count: query.data.executions.length, total: query.data.total, page: history.index + 1,
    }) : null}</span>
    <div className="script-toolbar">
      <Button variant="ghost" size="icon-sm" aria-label={t("scripts.refreshHistory")} title={t("scripts.refreshHistory")} disabled={query.isFetching} onClick={history.refresh}><HugeiconsIcon icon={RefreshIcon} size={16} /></Button>
      <Button variant="outline" size="sm" disabled={history.index === 0 || query.isFetching} onClick={history.previous}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} />{t("scripts.previousPage")}</Button>
      <Button variant="outline" size="sm" disabled={!query.data?.next_cursor || query.isFetching} onClick={history.next}>{t("scripts.nextPage")}<HugeiconsIcon icon={ArrowRight01Icon} size={16} /></Button>
    </div>
    {query.isError && <div role="alert"><p>{errorText(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>{t("scripts.retry")}</Button></div>}
  </div>;
}
