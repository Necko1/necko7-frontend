import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return <header className="page-header"><div className="min-w-0">{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</header>;
}

export function QueryError({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4"><div><p className="text-sm font-semibold text-destructive">{t("ops.loadError")}</p><p className="mt-1 text-sm text-muted-foreground">{message || t("ops.loadErrorDesc")}</p></div>{onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t("ops.tryAgain")}</Button>}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span aria-hidden="true" className="empty-state-mark">✓</span><h2 className="text-base font-semibold">{title}</h2>{description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}{action}</div>;
}
