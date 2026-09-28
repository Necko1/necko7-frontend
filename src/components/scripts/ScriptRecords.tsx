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

const valueType = (value: unknown) =>
  value === null
    ? "Null"
    : Array.isArray(value)
      ? "Array"
      : human(typeof value);
function score(value: unknown) {
  const s = object(value);
  return `${s.ct ?? "?"} : ${s.t ?? "?"}`;
}
function matchStatus(row: Row) {
  const data = object(row.data);
  return data.end_reason === "observation_reset"
    ? "Observation ended"
    : row.completed_at
      ? "Game over"
      : "Live";
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
  if (!Number.isFinite(seconds) || seconds < 0) return "Unknown duration";
  return seconds < 60
    ? "Less than a minute"
    : `${Math.floor(seconds / 60)} min`;
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
        ? "Scheduled job execution"
        : row.source === "publish"
          ? "Published draft"
          : row.source === "validate"
            ? "Draft validation"
            : row.source === "dry_run"
              ? "Draft test"
              : "Execution report";
}
export default function ScriptRecords({
  section,
  data,
  command,
  busy,
  executionSearch,
  onExecutionSearch,
}: {
  section: string;
  data: Overview;
  command: Command;
  busy: boolean;
  executionSearch: string;
  onExecutionSearch: (value: string) => void;
}) {
  const [project, setProject] = useState("");
  const [search, setSearch] = useState("");
  const activeSearch = section === "logs" ? executionSearch : search;
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");
  const [executionStatus, setExecutionStatus] = useState("");
  const [observations, setObservations] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const modal = useScriptDialog();
  const projectName = (row: Row) =>
    data.projects.find((p) => p.id === row.project_id)?.name ??
    "Deleted project";
  const jobsResult = (row: Row) =>
    data.executions.find((e) => e.job_id === row.id);
  const all =
    section === "storage"
      ? data.storage
      : section === "scheduler"
        ? data.jobs
        : section === "logs"
          ? data.executions
          : data.matches;
  const filtered = all.filter((row) => {
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
      title: row ? "Edit storage value" : "Add storage key",
      description: `Stored only for ${data.projects.find((p) => p.id === owner)?.name ?? "this project"}.`,
      submit: row ? "Save value" : "Add key",
      fields: [
        ...(!row
          ? [
              {
                name: "key",
                label: "Key",
                validate: (value: string) =>
                  !value.trim() || new TextEncoder().encode(value).length > 128
                    ? "Enter a key of 1-128 bytes."
                    : undefined,
              },
            ]
          : []),
        {
          name: "value",
          label: "JSON value",
          value: pretty(row?.value ?? null),
          multiline: true,
          validate: (value: string) => {
            try {
              JSON.parse(value);
              return undefined;
            } catch {
              return "Enter valid JSON.";
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
        toast.success("Storage value saved");
      },
    });
  }
  function deleteKey(row: Row) {
    modal.show({
      title: "Delete storage key?",
      description: `Remove ${text(row.key)} from ${projectName(row)}? Scripts will no longer read this value.`,
      submit: "Delete key",
      destructive: true,
      onSubmit: async () => {
        await command({
          action: "storage_delete",
          project_id: row.project_id,
          key: row.key,
        });
        setDetail(null);
        toast.success("Key deleted");
      },
    });
  }
  function jobAction(row: Row, run: boolean) {
    modal.show({
      title: run ? "Run this job now?" : "Cancel this job?",
      description: run
        ? `${text(row.job_key)} will use pinned version ${text(row.revision)} of ${projectName(row)}, even if the project is disabled. It may send chat or purchase rewards. This consumes the one-shot job.`
        : `Cancel ${text(row.job_key)}? The job and its execution history remain available.`,
      submit: run ? "Run now" : "Cancel job",
      destructive: !run,
      onSubmit: async () => {
        await command({
          action: run ? "run_job" : "cancel_job",
          project_id: row.project_id,
          job_id: row.id,
          ...(run ? { confirmation: "RUN" } : {}),
        });
        toast.success(run ? "Job queued for a manual run" : "Job cancelled");
      },
    });
  }
  const title =
    section === "storage"
      ? "Local Storage"
      : section === "scheduler"
        ? "Scheduler"
        : section === "logs"
          ? "Execution logs"
          : "Matches";
  return (
    <section className="script-records">
      <div className="script-record-heading">
        <div>
          <h2>{title}</h2>
          <p>
            {section === "storage"
              ? "Project-owned values shared with your scripts."
              : section === "scheduler"
                ? "One-shot jobs keep the version that created them."
                : section === "logs"
                  ? "Script executions, tests and validation reports."
                  : "Observed match progression from the paired desktop."}
          </p>
        </div>
        {section === "storage" && (
          <div className="script-toolbar">
            <Button
              variant="outline"
              disabled={!project || busy}
              onClick={() => storageEdit()}
            >
              Add key
            </Button>
            <Button
              variant="ghost"
              disabled={!project || busy}
              onClick={() =>
                modal.show({
                  title: "Clear project storage?",
                  description: `Remove every key belonging to ${data.projects.find((p) => p.id === project)?.name}.`,
                  submit: "Clear storage",
                  destructive: true,
                  fields: [confirmationField("CLEAR")],
                  onSubmit: async () => {
                    await command({
                      action: "storage_clear",
                      project_id: project,
                      confirmation: "CLEAR",
                    });
                    setDetail(null);
                    toast.success("Project storage cleared");
                  },
                })
              }
            >
              Clear storage
            </Button>
          </div>
        )}
      </div>
      <div className="script-record-controls">
        <Input
          aria-label="Search"
          placeholder={
            section === "matches" ? "Search maps or matches" : "Search"
          }
          value={activeSearch}
          maxLength={section === "logs" ? 128 : undefined}
          onChange={(e) => section === "logs" ? onExecutionSearch(e.target.value) : setSearch(e.target.value)}
          className="sm:max-w-80"
        />
        {section !== "matches" && (
          <Choice
            label="Project filter"
            value={project}
            options={[
              { value: "", label: "All projects" },
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
            Include setup observations
          </label>
        )}
      </div>
      {section === "scheduler" && (
        <>
          <Filters
            label="Job status"
            value={status}
            options={[
              "scheduled",
              "blocked",
              "queued",
              "completed",
              "cancelled",
            ]}
            onChange={setStatus}
          />
          <Choice
            label="Last execution result"
            value={executionStatus}
            options={[
              { value: "", label: "Any execution result" },
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
          <Filters
            label="Status"
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
            label="Level"
            value={level}
            options={["debug", "info", "warn", "error"]}
            onChange={setLevel}
          />
          <Filters
            label="Source"
            value={source}
            options={["cs2", "timer", "validate", "publish", "dry_run"]}
            onChange={setSource}
          />
        </div>
      )}
      {section === "logs" ? (
        <div className="terminal-register script-log-register">
          <div className="flex justify-between text-xs">
            <span>Executions</span>
            <span>{filtered.length} results</span>
          </div>
          {filtered.map((row) => (
            <article
              key={row.id}
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
                    <small>Version {text(row.revision)}</small>
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
                  ? ["Key / value", "Project", "Type", "Updated", "Actions"]
                  : section === "scheduler"
                    ? [
                        "Job",
                        "Project / version",
                        "Due",
                        "Job status",
                        "Last execution",
                        "Actions",
                      ]
                    : [
                        "Map / mode",
                        "Score",
                        "Match status",
                        "Rounds",
                        "Observed time",
                        "Data",
                      ]
                ).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id ?? `${row.project_id}-${row.key ?? i}`}>
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
                            aria-label={`Edit ${row.key}`}
                            title="Edit value"
                            disabled={busy}
                            onClick={() => storageEdit(row)}
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${row.key}`}
                            title="Delete key"
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
                        <small>Version {text(row.revision)}</small>
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
                          >
                            {human(jobsResult(row)?.status)}
                          </button>
                        ) : (
                          "Not executed"
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
                              Run now
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
                              Cancel
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
                      <td>{matchPartial(row) ? "Partial" : "Continuous"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!filtered.length && (
        <Empty
          title={
            all.length
              ? "No results match these filters"
              : section === "storage"
                ? "No stored values"
                : section === "scheduler"
                  ? "No scheduled jobs"
                  : section === "logs"
                    ? "No execution reports"
                    : "No matches recorded"
          }
        >
          {all.length
            ? "Adjust your filters or search."
            : section === "storage"
              ? "Values appear when a script writes to storage. Select a project to add a key."
              : section === "matches"
                ? "Match observations appear while the desktop receives live CS2 data."
                : undefined}
        </Empty>
      )}
      <p className="script-limit">
        {section === "logs"
          ? activeSearch ? "Latest 200 matching reports" : "Latest 200 reports"
          : section === "matches"
            ? "Current match and up to 30 ended observations"
            : section === "storage"
              ? "Up to 2,000 keys"
              : "Latest 500 jobs"}
      </p>
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
                      : "Execution"}
            </SheetTitle>
            <SheetDescription>
              {section === "storage"
                ? "Storage value"
                : section === "matches"
                  ? "Match observation"
                  : section === "scheduler"
                    ? "Scheduled job"
                    : "Execution details"}
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
                      <dt>Project</dt>
                      <dd>{projectName(selected)}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{valueType(selected.value)}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>
                        <Time value={selected.updated_at} />
                      </dd>
                    </div>
                  </dl>
                  <h3>Value</h3>
                  <pre className="script-storage-value">
                    {pretty(selected.value)}
                  </pre>
                  <div className="script-toolbar">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => storageEdit(selected)}
                    >
                      Edit value
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => deleteKey(selected)}
                    >
                      Delete key
                    </Button>
                  </div>
                  <Raw value={selected} label="Raw storage record" />
                </>
              ) : section === "scheduler" ? (
                <>
                  <dl className="script-facts">
                    <div>
                      <dt>Project</dt>
                      <dd>{projectName(selected)}</dd>
                    </div>
                    <div>
                      <dt>Job status</dt>
                      <dd>
                        <StatusBadge value={selected.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>Pinned version</dt>
                      <dd>{text(selected.revision)}</dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>
                        <Time value={selected.scheduled_for} />
                      </dd>
                    </div>
                    {selected.reason != null && (
                      <div>
                        <dt>Reason</dt>
                        <dd>{human(selected.reason)}</dd>
                      </div>
                    )}
                  </dl>
                  {selected.status === "blocked" && (
                    <p className="script-warning">
                      This job will not run automatically after re-enabling the
                      project. A manual run uses its pinned version.
                    </p>
                  )}
                  <Raw value={selected.payload} label="Job payload" />
                  <h3>Execution history</h3>
                  {data.executions
                    .filter((e) => e.job_id === selected.id)
                    .map((e) => (
                      <section key={e.id}>
                        <StatusBadge value={e.status} />
                        <Time value={e.created_at} />
                        <ExecutionReport value={e.report} />
                      </section>
                    ))}
                  {!jobsResult(selected) && <p>Not executed.</p>}
                  <Raw value={selected} label="Raw job record" />
                </>
              ) : (
                <>
                  <dl className="script-facts">
                    <div>
                      <dt>Time</dt>
                      <dd>
                        <Time value={selected.created_at} />
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <StatusBadge value={selected.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{human(selected.source)}</dd>
                    </div>
                    {selected.revision != null && (
                      <div>
                        <dt>Version</dt>
                        <dd>{text(selected.revision)}</dd>
                      </div>
                    )}
                    {selected.event != null && (
                      <div>
                        <dt>Event</dt>
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
                        <dt>Job</dt>
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
                  <Raw value={selected} label="Identifiers and raw metadata" />
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
          <dt>Mode</dt>
          <dd>{human(match.mode)}</dd>
        </div>
        <div>
          <dt>Score (CT : T)</dt>
          <dd>{score(match.score)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{matchStatus(row)}</dd>
        </div>
        <div>
          <dt>Observed duration</dt>
          <dd>{duration(row.created_at, data.updated_at)}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            {matchPartial(row)
              ? "Partial observations"
              : "Continuous observations"}
          </dd>
        </div>
      </dl>
      {Object.keys(totals).length > 0 && (
        <section className="script-local-totals" aria-label="Local player totals">
          <h3>{summary.final === true ? "Final local totals" : "Last observed local totals"}</h3>
          <dl className="script-facts">
            {[["Kills", "kills"], ["Assists", "assists"], ["Deaths", "deaths"], ["MVPs", "mvps"], ["Score", "score"]].map(([label, key]) => (
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
              {["Round", "Side", "Winner", "Score", "Kills / HS"].map(
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
                        ? " / Incomplete"
                        : " / Current"
                      : ""}
                  </button>
                </td>
                <td>{human(object(round.player).side)}</td>
                <td>{human(round.winner)}</td>
                <td>
                  {score(round.score_before)} → {score(round.score_after)}
                  {round.side_swap_before != null && (
                    <div className="text-muted-foreground text-xs">
                      Side swap: {score(object(round.side_swap_before).before)} → {score(object(round.side_swap_before).after)}
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
      <Raw value={row} label="Full normalized match" />
    </div>
  );
}
function RoundDetails({ row }: { row: Row }) {
  const player = object(row.player);
  const events = rows(row.events);
  return (
    <section className="script-round-detail">
      <h3>Round {typeof row.index === "number" ? row.index + 1 : "?"}</h3>
      <dl className="script-facts">
        <div>
          <dt>Last observed local health</dt>
          <dd>{text(player.health)}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>
            <Time value={row.started_at} />
          </dd>
        </div>
        {row.ended_at != null && (
          <div>
            <dt>Ended</dt>
            <dd>
              <Time value={row.ended_at} />
            </dd>
          </div>
        )}
      </dl>
      <h3>Event timeline</h3>
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
        <p className="text-muted-foreground">No recorded semantic events.</p>
      )}
      <Raw value={row} label="Round state and event data" />
    </section>
  );
}
