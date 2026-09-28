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
  const report = object(value);
  const error =
    report.error == null
      ? null
      : typeof report.error === "string"
        ? report.error
        : text(object(report.error).message);
  const logs = rows(report.logs);
  const actions = rows(report.actions);
  return (
    <div className="script-report">
      <div className="script-report-heading">
        <strong className={error ? "text-destructive" : "text-primary"}>
          {error
            ? "Needs attention"
            : report.dry_run
              ? "Test succeeded"
              : report.has_on_event != null
                ? "Validation passed"
                : "Execution report"}
        </strong>
        {report.duration_ms != null && (
          <span>{text(report.duration_ms)} ms</span>
        )}
      </div>
      {error && (
        <div role="alert" className="script-diagnostic">
          <p>{error}</p>
          {onDiagnostic && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDiagnostic(error)}
            >
              Go to diagnostic
            </Button>
          )}
        </div>
      )}
      {report.has_on_event != null && (
        <p className="text-sm text-muted-foreground">
          {report.has_on_event
            ? "CS2 event handler ready"
            : "No CS2 event handler"}
          {report.has_on_timer
            ? " / Timer handler ready"
            : " / No timer handler"}
        </p>
      )}
      <h3>Script logs</h3>
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
        <p className="text-sm text-muted-foreground">No script log lines.</p>
      )}
      <h3>{report.dry_run ? "Planned actions" : "Host actions"}</h3>
      {actions.length ? (
        <ul className="script-actions">
          {actions.map((action, i) => (
            <li key={i}>
              <div>
                <strong>{human(action.method)}</strong>
                <span>
                  {action.error
                    ? "Failed"
                    : action.dry_run
                      ? "Simulated"
                      : "Performed"}
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
              <Raw value={action.result} label="Action result" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No host actions.</p>
      )}
      <Raw value={value} label="Raw execution report" />
    </div>
  );
}
