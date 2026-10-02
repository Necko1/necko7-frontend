import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Raw } from "./shared";
import { human, object, rows, text } from "./data";

export default function ExecutionReport({
  value,
  onDiagnostic,
}: {
  value: unknown;
  onDiagnostic?: (message: string) => void;
}) {
  const { t } = useTranslation();
  const report = object(value);
  const error =
    report.error == null
      ? null
      : typeof report.error === "string"
        ? report.error
        : text(object(report.error).message);
  const logs = rows(report.logs);
  const actions = rows(report.actions);
  const limits = object(object(report.meta).execution_limits);
  return (
    <div className="script-report">
      <div className="script-report-heading">
        <strong className={error ? "text-destructive" : "text-primary"}>
          {error
            ? t("scripts.attention")
            : report.dry_run
              ? t("scripts.testSucceeded")
              : report.has_on_event != null
                ? t("scripts.validationPassed")
                : t("scripts.executionReport")}
        </strong>
        {report.duration_ms != null && (
          <span>{t("scripts.milliseconds", { duration: text(report.duration_ms) })}</span>
        )}
      </div>
      {typeof limits.execution_timeout_secs === "number" && typeof limits.host_timeout_secs === "number" && (
        <p className="text-xs text-muted-foreground">{t("scripts.usedExecutionLimits", {
          execution: limits.execution_timeout_secs, host: limits.host_timeout_secs,
        })}</p>
      )}
      {error && (
        <div role="alert" className="script-diagnostic">
          <p>{error}</p>
          {onDiagnostic && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDiagnostic(error)}
            >
              {t("scripts.goDiagnostic")}
            </Button>
          )}
        </div>
      )}
      {report.has_on_event != null && (
        <p className="text-sm text-muted-foreground">
          {report.has_on_event
            ? t("scripts.eventHandlerReady")
            : t("scripts.noEventHandler")}
          {report.has_on_timer
            ? t("scripts.timerHandlerReady")
            : t("scripts.noTimerHandler")}
        </p>
      )}
      <h3>{t("scripts.scriptLogs")}</h3>
      {logs.length ? (
        <div className="script-log-lines">
          {logs.map((log, i) => (
            <p key={i} data-level={log.level}>
              <span>{human(log.level)}</span>
              {text(log.message)}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("scripts.noLogLines")}</p>
      )}
      <h3>{report.dry_run ? t("scripts.plannedActions") : t("scripts.hostActions")}</h3>
      {actions.length ? (
        <ul className="script-actions">
          {actions.map((action, i) => (
            <li key={i}>
              <div>
                <strong>{human(action.method)}</strong>
                <span>
                  {action.error
                    ? t("scripts.failed")
                    : action.dry_run
                      ? t("scripts.simulated")
                      : t("scripts.performed")}
                </span>
              </div>
              {Array.isArray(action.args) && (
                <p>
                  {action.args
                    .map((a) =>
                      typeof a === "object" ? JSON.stringify(a) : String(a),
                    )
                    .join(" / ")}
                </p>
              )}
              {action.error != null && (
                <p className="text-destructive">{text(action.error)}</p>
              )}
              {object(action.result).code != null && (
                <p>{human(object(action.result).code)}</p>
              )}
              <Raw value={action.result} label={t("scripts.actionResult")} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("scripts.noHostActions")}</p>
      )}
      <Raw value={value} label={t("scripts.rawExecution")} />
    </div>
  );
}
