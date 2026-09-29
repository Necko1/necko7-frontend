import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Edit02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { Choice, Empty, Filters, Raw, StatusBadge, Time } from "./shared";
import {
  confirmationField,
  human,
  object,
  pretty,
  rows,
  text,
  type Command,
  type Overview,
  type Row,
} from "./data";
import { useScriptDialog } from "./useScriptDialog";
import ExecutionReport from "./ExecutionReport";
import { toast } from "sonner";
import { useExecutionHistory } from "./useExecutionHistory";
import { HistoryPager } from "./HistoryPager";

const t = i18n.t.bind(i18n);

const valueType = (value: unknown) =>
  value === null
    ? t("scripts.null")
    : Array.isArray(value)
      ? t("scripts.array")
      : human(typeof value);
function score(value: unknown) {
  const s = object(value);
  return `${s.ct ?? "?"} : ${s.t ?? "?"}`;
}
function matchStatus(row: Row) {
  const data = object(row.data);
  return data.end_reason === "observation_reset"
    ? t("scripts.observationEnded")
    : row.completed_at
      ? t("scripts.gameOver")
      : t("scripts.live");
}
function matchPartial(row: Row) {
  const data = object(row.data);
  const completed = rows(data.rounds);
  return (
    data.partial === true ||
    data.end_reason === "observation_reset" ||
    completed.some((r, i) => r.index !== i) ||
    (!!row.completed_at && object(data.current_round).completed === false)
  );
}
function duration(start: unknown, end: unknown) {
  const seconds = (Date.parse(String(end)) - Date.parse(String(start))) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return t("scripts.unknownDuration");
  return seconds < 60
    ? t("scripts.lessMinute")
    : t("scripts.minutes", { count: Math.floor(seconds / 60) });
}
function executionSummary(row: Row) {
  const report = object(row.report);
  if (report.error) return String(report.error);
  const log =
    rows(report.logs).find((log) =>
      ["error", "warn"].includes(String(log.level)),
    ) ?? rows(report.logs)[0];
  const event = object(row.event);
  return log
    ? text(log.message)
    : event.kind
      ? human(event.kind)
      : row.job_id
        ? t("scripts.jobExecution")
        : row.source === "publish"
          ? t("scripts.publishedDraft")
          : row.source === "validate"
            ? t("scripts.draftValidation")
            : row.source === "dry_run"
              ? t("scripts.draftTest")
              : t("scripts.executionReport");
}
export default function ScriptRecords({
  channel,
  section,
  data,
  command,
  busy,
  executionSearch,
  onExecutionSearch,
}: {
  channel: string;
  section: string;
  data: Overview;
  command: Command;
  busy: boolean;
  executionSearch: string;
  onExecutionSearch: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [project, setProject] = useState("");
  const [search, setSearch] = useState("");
  const activeSearch = section === "logs" ? executionSearch : search;
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");
  const [executionStatus, setExecutionStatus] = useState("");
  const [observations, setObservations] = useState(false);
  const [mode, setMode] = useState("noteworthy");
  const [detail, setDetail] = useState<Row | null>(null);
  const history = useExecutionHistory(channel, section === "logs"
    ? { search: activeSearch, project_id: project || undefined, status, source, level, mode }
    : { job_id: detail?.id, mode: "all" }, section === "logs" || (section === "scheduler" && !!detail));
  const modal = useScriptDialog();
  const projectName = (row: Row) =>
    data.projects.find((p) => p.id === row.project_id)?.name ??
    t("scripts.deletedProject");
  const jobsResult = (row: Row) =>
    row.last_execution ? object(row.last_execution) : null;
  const jobExecutionLabel = (row: Row) => {
    const result = jobsResult(row);
    if (result) return human(result.status);
    return t(`scripts.${row.status === "scheduled" ? "notRunYet" : row.status === "blocked" ? "notRunBlocked" : row.status === "queued" ? "awaitingExecution" : row.status === "cancelled" ? "cancelledBeforeRun" : "executionUnavailable"}`);
  };
  const all =
    section === "storage"
      ? data.storage
      : section === "scheduler"
        ? data.jobs
        : section === "logs"
          ? history.query.data?.executions ?? []
          : data.matches;
  const filtered = all.filter((row) => {
    if (section === "logs") return true;
    const report = object(row.report);
    return (
      (!project || row.project_id === project) &&
      (!status || row.status === status) &&
      (!source || row.source === source) &&
      (!level ||
        rows(report.logs).some((log) => log.level === level) ||
        (level === "error" && !!report.error)) &&
      (!executionStatus || jobsResult(row)?.status === executionStatus) &&
      (section !== "matches" ||
        observations ||
        !(
          object(row.data).end_reason === "observation_reset" &&
          rows(object(row.data).rounds).length === 0
        )) &&
      (pretty(row) + projectName(row))
        .toLowerCase()
        .includes((section === "logs" ? activeSearch.trim() : activeSearch).toLowerCase())
    );
  });
  const selected =
    detail &&
    all.find((row) =>
      section === "storage"
        ? row.project_id === detail.project_id && row.key === detail.key
        : row.id === detail.id,
    );
  function storageEdit(row?: Row) {
    const owner = row?.project_id ?? project;
    modal.show({
      title: row ? t("scripts.editStorage") : t("scripts.addStorage"),
      description: t("scripts.storageScope", { name: data.projects.find((p) => p.id === owner)?.name ?? t("scripts.thisProject") }),
      submit: row ? t("scripts.saveValue") : t("scripts.addKey"),
      fields: [
        ...(!row
          ? [
              {
                name: "key",
                label: t("scripts.key"),
                validate: (value: string) =>
                  !value.trim() || new TextEncoder().encode(value).length > 128
                    ? t("scripts.keyLimit")
                    : undefined,
              },
            ]
          : []),
        {
          name: "value",
          label: t("scripts.jsonValue"),
          value: pretty(row?.value ?? null),
          multiline: true,
          validate: (value: string) => {
            try {
              JSON.parse(value);
              return undefined;
            } catch {
              return t("scripts.validJson");
            }
          },
        },
      ],
      onSubmit: async (values) => {
        await command({
          action: "storage_set",
          project_id: owner,
          key: row?.key ?? values.key,
          value: JSON.parse(values.value),
        });
        toast.success(t("scripts.storageSaved"));
      },
    });
  }
  function deleteKey(row: Row) {
    modal.show({
      title: t("scripts.deleteKeyTitle"),
      description: t("scripts.deleteKeyDescription", { key: text(row.key), name: projectName(row) }),
      submit: t("scripts.deleteKey"),
      destructive: true,
      onSubmit: async () => {
        await command({
          action: "storage_delete",
          project_id: row.project_id,
          key: row.key,
        });
        setDetail(null);
        toast.success(t("scripts.keyDeleted"));
      },
    });
  }
  function jobAction(row: Row, run: boolean) {
    modal.show({
      title: run ? t("scripts.runJobTitle") : t("scripts.cancelJobTitle"),
      description: run
        ? t("scripts.runJobDescription", { key: text(row.job_key), version: text(row.revision), name: projectName(row) })
        : t("scripts.cancelJobDescription", { key: text(row.job_key) }),
      submit: run ? t("scripts.runNow") : t("scripts.cancelJob"),
      destructive: !run,
      onSubmit: async () => {
        await command({
          action: run ? "run_job" : "cancel_job",
          project_id: row.project_id,
          job_id: row.id,
          ...(run ? { confirmation: "RUN" } : {}),
        });
        toast.success(run ? t("scripts.jobQueued") : t("scripts.jobCancelled"));
      },
    });
  }
  const title =
    section === "storage"
      ? t("scripts.storage")
      : section === "scheduler"
        ? t("scripts.scheduler")
        : section === "logs"
          ? t("scripts.executionLogs")
          : t("scripts.matches");
  return (
    <section className="script-records">
      <div className="script-record-heading">
        <div>
          <h2>{title}</h2>
          <p>
            {section === "storage"
              ? t("scripts.storageDescription")
              : section === "scheduler"
                ? t("scripts.schedulerDescription")
                : section === "logs"
                  ? t("scripts.logsDescription")
                  : t("scripts.matchesDescription")}
          </p>
        </div>
        {section === "storage" && (
          <div className="script-toolbar">
            <Button
              variant="outline"
              disabled={!project || busy}
              onClick={() => storageEdit()}
            >
              {t("scripts.addKey")}
            </Button>
            <Button
              variant="ghost"
              disabled={!project || busy}
              onClick={() =>
                modal.show({
                  title: t("scripts.clearStorageTitle"),
                  description: t("scripts.clearStorageDescription", { name: data.projects.find((p) => p.id === project)?.name }),
                  submit: t("scripts.clearStorage"),
                  destructive: true,
                  fields: [confirmationField("CLEAR")],
                  onSubmit: async () => {
                    await command({
                      action: "storage_clear",
                      project_id: project,
                      confirmation: "CLEAR",
                    });
                    setDetail(null);
                    toast.success(t("scripts.storageCleared"));
                  },
                })
              }
            >
              {t("scripts.clearStorage")}
            </Button>
          </div>
        )}
      </div>
      <div className="script-record-controls">
        <Input
          aria-label={t("scripts.search")}
          placeholder={
            section === "matches" ? t("scripts.searchMaps") : t("scripts.search")
          }
          value={activeSearch}
          maxLength={section === "logs" ? 128 : undefined}
          onChange={(e) => section === "logs" ? onExecutionSearch(e.target.value) : setSearch(e.target.value)}
          className="sm:max-w-80"
        />
        {section !== "matches" && (
          <Choice
            label={t("scripts.projectFilter")}
            value={project}
            options={[
              { value: "", label: t("scripts.allProjects") },
              ...data.projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(v) => {
              setProject(v);
              setDetail(null);
            }}
          />
        )}
        {section === "matches" && (
          <label className="script-checkbox">
            <input
              type="checkbox"
              checked={observations}
              onChange={(e) => setObservations(e.target.checked)}
            />
            {t("scripts.includeSetup")}
          </label>
        )}
      </div>
      {section === "scheduler" && (
        <>
          <Filters
            label={t("scripts.jobStatus")}
            value={status}
            options={[
              "scheduled",
              "blocked",
              "queued",
              "completed",
              "failed",
              "cancelled",
            ]}
            onChange={setStatus}
          />
          <Choice
            label={t("scripts.lastResult")}
            value={executionStatus}
            options={[
              { value: "", label: t("scripts.anyResult") },
              ...["success", "failed", "interrupted", "skipped"].map(
                (value) => ({ value, label: human(value) }),
              ),
            ]}
            onChange={setExecutionStatus}
          />
        </>
      )}
      {section === "logs" && (
        <div className="script-log-filters">
          <Choice label={t("scripts.historyView")} value={mode} options={[
            { value: "noteworthy", label: t("scripts.withOutput") },
            { value: "all", label: t("scripts.allExecutions") },
          ]} onChange={setMode} />
          <Filters
            label={t("scripts.status")}
            value={status}
            options={[
              "queued",
              "running",
              "success",
              "failed",
              "interrupted",
              "skipped",
            ]}
            onChange={setStatus}
          />
          <Filters
            label={t("scripts.level")}
            value={level}
            options={["debug", "info", "warn", "error"]}
            onChange={setLevel}
          />
          <Filters
            label={t("scripts.source")}
            value={source}
            options={["cs2", "timer", "validate", "publish", "dry_run"]}
            onChange={setSource}
          />
        </div>
      )}
      {section === "logs" ? (
        <div className="terminal-register script-log-register">
          <div className="flex justify-between text-xs">
            <span>{t("scripts.executions")}</span>
            <span>{t("scripts.results", { count: filtered.length })}</span>
          </div>
          {filtered.map((row) => (
            <article
              key={row.id}
              data-execution-id={row.id}
              className="terminal-record"
              data-level={row.status === "failed" ? "ERROR" : "INFO"}
            >
              <button
                className="script-execution-line"
                onClick={() => setDetail(row)}
              >
                <Time value={row.created_at} />
                <StatusBadge value={row.status} />
                <span>
                  {projectName(row)}
                  {row.revision != null && (
                    <small>{t("scripts.version")}{" "}{text(row.revision)}</small>
                  )}
                </span>
                <span>{human(row.source)}</span>
                <strong>{executionSummary(row)}</strong>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="script-table-wrap">
          <table className="script-table">
            <thead>
              <tr>
                {(section === "storage"
                  ? [t("scripts.keyValue"), t("scripts.project"), t("scripts.type"), t("scripts.updated"), t("scripts.actions")]
                  : section === "scheduler"
                    ? [
                        t("scripts.job"),
                        t("scripts.projectVersion"),
                        t("scripts.due"),
                        t("scripts.jobStatus"),
                        t("scripts.lastExecution"),
                        t("scripts.actions"),
                      ]
                    : [
                        t("scripts.mapMode"),
                        t("scripts.score"),
                        t("scripts.matchStatus"),
                        t("scripts.rounds"),
                        t("scripts.observedTime"),
                        t("scripts.data"),
                      ]
                ).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id ?? `${row.project_id}-${row.key ?? i}`} data-record-id={row.id}>
                  {section === "storage" ? (
                    <>
                      <td>
                        <button
                          className="script-record-link"
                          onClick={() => setDetail(row)}
                        >
                          {text(row.key)}
                        </button>
                        <p className="script-value-preview">
                          {pretty(row.value)}
                        </p>
                      </td>
                      <td>{projectName(row)}</td>
                      <td>{valueType(row.value)}</td>
                      <td>
                        <Time value={row.updated_at} />
                      </td>
                      <td>
                        <div className="script-toolbar">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("scripts.editKey", { key: row.key })}
                            title={t("scripts.editValue")}
                            disabled={busy}
                            onClick={() => storageEdit(row)}
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("scripts.deleteNamedKey", { key: row.key })}
                            title={t("scripts.deleteKey")}
                            disabled={busy}
                            onClick={() => deleteKey(row)}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : section === "scheduler" ? (
                    <>
                      <td>
                        <button
                          className="script-record-link"
                          onClick={() => setDetail(row)}
                        >
                          {text(row.job_key)}
                        </button>
                        {row.reason != null && (
                          <p className="text-xs text-amber-300">
                            {human(row.reason)}
                          </p>
                        )}
                      </td>
                      <td>
                        {projectName(row)}
                        <small>{t("scripts.version")}{" "}{text(row.revision)}</small>
                      </td>
                      <td>
                        <Time value={row.scheduled_for} />
                      </td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>
                        {jobsResult(row) ? (
                          <button
                            onClick={() => setDetail(row)}
                            className="script-record-link"
                            data-result={String(jobsResult(row)?.status)}
                          >
                            {human(jobsResult(row)?.status)}
                          </button>
                        ) : (
                          jobExecutionLabel(row)
                        )}
                      </td>
                      <td>
                        <div className="script-toolbar">
                          {["scheduled", "blocked"].includes(
                            row.status ?? "",
                          ) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => jobAction(row, true)}
                            >
                              <HugeiconsIcon icon={PlayIcon} size={14} />
                              {t("scripts.runNow")}
                            </Button>
                          )}
                          {["scheduled", "blocked", "queued"].includes(
                            row.status ?? "",
                          ) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => jobAction(row, false)}
                            >
                              {t("scripts.cancel")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <button
                          className="script-record-link"
                          onClick={() => setDetail(row)}
                        >
                          {text(row.map)}
                        </button>
                        <small>
                          {human(
                            object(object(row.data).state).match
                              ? object(object(object(row.data).state).match)
                                  .mode
                              : null,
                          )}
                        </small>
                      </td>
                      <td>
                        {score(
                          object(object(object(row.data).state).match).score,
                        )}
                      </td>
                      <td>{matchStatus(row)}</td>
                      <td>{rows(object(row.data).rounds).length}</td>
                      <td>
                        <Time value={row.created_at} />
                        <small>
                          {duration(
                            row.created_at,
                            object(row.data).updated_at ?? row.completed_at,
                          )}
                        </small>
                      </td>
                      <td>{matchPartial(row) ? t("scripts.partial") : t("scripts.continuous")}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!filtered.length && !(section === "logs" && (history.query.isPending || history.query.isError)) && (
        <Empty
          title={
            all.length
              ? t("scripts.noResults")
              : section === "storage"
                ? t("scripts.noStorage")
                : section === "scheduler"
                  ? t("scripts.noJobs")
                  : section === "logs"
                    ? t("scripts.noExecutions")
                    : t("scripts.noMatches")
          }
        >
          {all.length
            ? t("scripts.adjustFilters")
            : section === "storage"
              ? t("scripts.noStorageDescription")
              : section === "matches"
                ? t("scripts.noMatchesDescription")
                : undefined}
        </Empty>
      )}
      <p className="script-limit">
        {section === "logs"
          ? t("scripts.historyRetention")
          : section === "matches"
            ? t("scripts.matchesLimit")
            : section === "storage"
              ? t("scripts.storageLimit")
              : t("scripts.jobsLimit")}
      </p>
      {section === "logs" && <HistoryPager history={history} />}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent className="script-inspector w-[min(760px,100vw)]! sm:max-w-[760px]! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {section === "storage"
                ? text(selected?.key)
                : section === "scheduler"
                  ? text(selected?.job_key)
                  : section === "matches"
                    ? text(selected?.map)
                    : selected
                      ? projectName(selected)
                      : t("scripts.execution")}
            </SheetTitle>
            <SheetDescription>
              {section === "storage"
                ? t("scripts.storageValue")
                : section === "matches"
                  ? t("scripts.matchObservation")
                  : section === "scheduler"
                    ? t("scripts.scheduledJob")
                    : t("scripts.executionDetails")}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="script-inspector-body">
              {section === "matches" ? (
                <MatchDetails key={selected.id} row={selected} />
              ) : section === "storage" ? (
                <>
                  <dl className="script-facts">
                    <div>
                      <dt>{t("scripts.project")}</dt>
                      <dd>{projectName(selected)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.type")}</dt>
                      <dd>{valueType(selected.value)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.updated")}</dt>
                      <dd>
                        <Time value={selected.updated_at} />
                      </dd>
                    </div>
                  </dl>
                  <h3>{t("scripts.value")}</h3>
                  <pre className="script-storage-value">
                    {pretty(selected.value)}
                  </pre>
                  <div className="script-toolbar">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => storageEdit(selected)}
                    >
                      {t("scripts.editValue")}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => deleteKey(selected)}
                    >
                      {t("scripts.deleteKey")}
                    </Button>
                  </div>
                  <Raw value={selected} label={t("scripts.rawStorage")} />
                </>
              ) : section === "scheduler" ? (
                <>
                  <dl className="script-facts">
                    <div>
                      <dt>{t("scripts.project")}</dt>
                      <dd>{projectName(selected)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.jobStatus")}</dt>
                      <dd>
                        <StatusBadge value={selected.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t("scripts.jobInstance")}</dt>
                      <dd>{text(selected.id)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.lastExecution")}</dt>
                      <dd>{jobExecutionLabel(selected)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.pinnedVersion")}</dt>
                      <dd>{text(selected.revision)}</dd>
                    </div>
                    <div>
                      <dt>{t("scripts.due")}</dt>
                      <dd>
                        <Time value={selected.scheduled_for} />
                      </dd>
                    </div>
                    {selected.reason != null && (
                      <div>
                        <dt>{t("scripts.reason")}</dt>
                        <dd>{human(selected.reason)}</dd>
                      </div>
                    )}
                  </dl>
                  {selected.status === "blocked" && (
                    <p className="script-warning">
                      {t("scripts.blockedJobDescription")}
                    </p>
                  )}
                  <Raw value={selected.payload} label={t("scripts.jobPayload")} />
                  <h3>{t("scripts.executionHistory")}</h3>
                  <HistoryPager history={history} />
                  {(history.query.data?.executions ?? [])
                    .map((e) => (
                      <section key={e.id}>
                        <div className="flex items-center gap-3">
                          <StatusBadge value={e.status} />
                          <Time value={e.created_at} />
                        </div>
                        <ExecutionReport value={e.report} />
                      </section>
                    ))}
                  {!history.query.isPending && !history.query.isError && !history.query.data?.executions.length && <p>{jobExecutionLabel(selected)}</p>}
                  <Raw value={selected} label={t("scripts.rawJob")} />
                </>
              ) : (
                <>
                  <dl className="script-facts">
                    <div>
                      <dt>{t("scripts.time")}</dt>
                      <dd>
                        <Time value={selected.created_at} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t("scripts.status")}</dt>
                      <dd>
                        <StatusBadge value={selected.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t("scripts.source")}</dt>
                      <dd>{human(selected.source)}</dd>
                    </div>
                    {selected.revision != null && (
                      <div>
                        <dt>{t("scripts.version")}</dt>
                        <dd>{text(selected.revision)}</dd>
                      </div>
                    )}
                    {selected.event != null && (
                      <div>
                        <dt>{t("scripts.event")}</dt>
                        <dd>
                          {human(
                            object(selected.event).kind ??
                              object(object(selected.event).event).kind,
                          )}
                        </dd>
                      </div>
                    )}
                    {selected.job_id != null && (
                      <div>
                        <dt>{t("scripts.job")}</dt>
                        <dd>
                          {data.jobs.find((j) => j.id === selected.job_id)
                            ?.job_key
                            ? text(
                                data.jobs.find((j) => j.id === selected.job_id)
                                  ?.job_key,
                              )
                            : text(selected.job_id)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <ExecutionReport value={selected.report} />
                  <Raw value={selected} label={t("scripts.rawMetadata")} />
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      {modal.dialog}
    </section>
  );
}
function MatchDetails({ row }: { row: Row }) {
  const { t } = useTranslation();
  const data = object(row.data);
  const state = object(data.state);
  const match = object(state.match);
  const completed = rows(data.rounds);
  const current = object(data.current_round);
  const summary = object(data.local_summary);
  const totals = object(summary.stats);
  const roundsList = [
    ...completed,
    ...(Object.keys(current).length && current.completed !== true
      ? [current]
      : []),
  ];
  const [roundIndex, setRoundIndex] = useState<number | null>(null);
  return (
    <div className="space-y-5">
      <dl className="script-facts">
        <div>
          <dt>{t("scripts.mode")}</dt>
          <dd>{human(match.mode)}</dd>
        </div>
        <div>
          <dt>{t("scripts.ctTScore")}</dt>
          <dd>{score(match.score)}</dd>
        </div>
        <div>
          <dt>{t("scripts.status")}</dt>
          <dd>{matchStatus(row)}</dd>
        </div>
        <div>
          <dt>{t("scripts.observedDuration")}</dt>
          <dd>{duration(row.created_at, data.updated_at)}</dd>
        </div>
        <div>
          <dt>{t("scripts.data")}</dt>
          <dd>
            {matchPartial(row)
              ? t("scripts.partialObservations")
              : t("scripts.continuousObservations")}
          </dd>
        </div>
      </dl>
      {Object.keys(totals).length > 0 && (
        <section className="script-local-totals" aria-label={t("scripts.localTotals")}>
          <h3>{summary.final === true ? t("scripts.finalTotals") : t("scripts.lastTotals")}</h3>
          <dl className="script-facts">
            {[[t("scripts.kills"), "kills"], [t("scripts.assists"), "assists"], [t("scripts.deaths"), "deaths"], [t("scripts.mvps"), "mvps"], [t("scripts.playerScore"), "score"]].map(([label, key]) => (
              <div key={key}><dt>{label}</dt><dd>{text(totals[key])}</dd></div>
            ))}
          </dl>
          {summary.final !== true && <Time value={summary.observed_at} />}
        </section>
      )}
      <div className="script-table-wrap">
        <table className="script-table script-rounds">
          <thead>
            <tr>
              {[t("scripts.round"), t("scripts.side"), t("scripts.winner"), t("scripts.score"), t("scripts.killsHs")].map(
                (label) => (
                  <th key={label}>{label}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {roundsList.map((round, i) => (
              <tr key={i}>
                <td>
                  <button
                    className="script-record-link"
                    aria-expanded={roundIndex === i}
                    onClick={() => setRoundIndex(roundIndex === i ? null : i)}
                  >
                    {typeof round.index === "number" ? round.index + 1 : "?"}
                    {round.completed !== true
                      ? row.completed_at
                        ? t("scripts.incompleteSuffix")
                        : t("scripts.currentSuffix")
                      : ""}
                  </button>
                </td>
                <td>{human(object(round.player).side)}</td>
                <td>{human(round.winner)}</td>
                <td>
                  {score(round.score_before)} → {score(round.score_after)}
                  {round.side_swap_before != null && (
                    <div className="text-muted-foreground text-xs">
                      {t("scripts.sideSwap")} {score(object(round.side_swap_before).before)} → {score(object(round.side_swap_before).after)}
                    </div>
                  )}
                </td>
                <td>
                  {text(object(round.player).kills)} /{" "}
                  {text(object(round.player).headshot_kills)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {roundIndex !== null && roundsList[roundIndex] && (
        <RoundDetails row={roundsList[roundIndex]} />
      )}
      <Raw value={row} label={t("scripts.rawMatch")} />
    </div>
  );
}
function RoundDetails({ row }: { row: Row }) {
  const { t } = useTranslation();
  const player = object(row.player);
  const events = rows(row.events);
  return (
    <section className="script-round-detail">
      <h3>{t("scripts.round")}{" "}{typeof row.index === "number" ? row.index + 1 : "?"}</h3>
      <dl className="script-facts">
        <div>
          <dt>{t("scripts.lastHealth")}</dt>
          <dd>{text(player.health)}</dd>
        </div>
        <div>
          <dt>{t("scripts.started")}</dt>
          <dd>
            <Time value={row.started_at} />
          </dd>
        </div>
        {row.ended_at != null && (
          <div>
            <dt>{t("scripts.ended")}</dt>
            <dd>
              <Time value={row.ended_at} />
            </dd>
          </div>
        )}
      </dl>
      <h3>{t("scripts.eventTimeline")}</h3>
      {events.length ? (
        <ol className="script-timeline">
          {events.map((event, i) => (
            <li key={i}>
              <Time value={event.timestamp} />
              <strong>{human(object(event.event).kind)}</strong>
              {object(event.event).count != null && (
                <span>{text(object(event.event).count)}</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">{t("scripts.noEvents")}</p>
      )}
      <Raw value={row} label={t("scripts.rawRound")} />
    </section>
  );
}
