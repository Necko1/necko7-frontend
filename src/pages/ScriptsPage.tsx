import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/scripts/shared";
import {
  projectNameField,
  type Command,
  type Overview,
} from "@/components/scripts/data";
import { useScriptDialog } from "@/components/scripts/useScriptDialog";
import ProjectEditor from "@/components/scripts/ProjectEditor";
import ScriptRecords from "@/components/scripts/ScriptRecords";
import Cs2Page from "./Cs2Page";
import { toast } from "sonner";
import "@/components/scripts/scripts.css";

const tabs = [
  ["cs2", "CS2 Integration"],
  ["editor", "Editor"],
  ["storage", "Local Storage"],
  ["matches", "Matches"],
  ["scheduler", "Scheduler"],
  ["logs", "Logs"],
];
export default function ScriptsPage() {
  const { selectedBroadcasterId, broadcasters } = useAppStore();
  const channel = broadcasters.find(
    (b) => b.channel_id === selectedBroadcasterId,
  );
  if (channel?.role.toUpperCase() !== "OWNER")
    return <Navigate to="/channels" replace />;
  return <Scripts key={channel.channel_id} channel={channel.channel_id} />;
}
function Scripts({ channel }: { channel: string }) {
  const { section = "editor" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const queryKey = ["scripts", channel];
  const [executionSearch, setExecutionSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setHistorySearch(executionSearch.trim()), 200);
    return () => clearTimeout(timer);
  }, [executionSearch]);
  const query = useQuery({
    queryKey: [...queryKey, section === "logs" ? historySearch : ""],
    queryFn: () =>
      api
        .get<Overview>(`/api/v1/broadcasters/${channel}/scripts`, {
          params: section === "logs" && historySearch ? { execution_search: historySearch } : undefined,
        })
        .then((r) => r.data),
    enabled: section !== "cs2",
    refetchInterval: section === "editor" ? false : 10000,
    placeholderData: (previous) => previous,
  });
  const [projectId, setProjectId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const modal = useScriptDialog();
  const showDialog = modal.show;
  const selected =
    query.data?.projects.find((p) => p.id === projectId) ??
    query.data?.projects[0];
  const command: Command = async (body) => {
    if (pending.current)
      throw new Error("Wait for the current action to finish.");
    pending.current = true;
    setBusy(true);
    try {
      const response = await api.post(
        `/api/v1/broadcasters/${channel}/scripts`,
        body,
      );
      await qc.invalidateQueries({ queryKey });
      return response.data;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !dirty ||
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        anchor.target === "_blank"
      )
        return;
      const target = new URL(anchor.href);
      if (
        target.origin !== location.origin ||
        !target.pathname.startsWith("/scripts/")
      ) {
        event.preventDefault();
        event.stopPropagation();
        showDialog({
          title: "Leave with unsaved changes?",
          description: "Your latest edits have not been saved to the draft.",
          submit: "Discard and leave",
          destructive: true,
          onSubmit: () => {
            setDirty(false);
            if (target.origin === location.origin)
              navigate(target.pathname + target.search);
            else location.assign(target.href);
          },
        });
      }
    };
    document.addEventListener("click", listener, true);
    return () => document.removeEventListener("click", listener, true);
  }, [dirty, showDialog, navigate]);
  if (!tabs.some(([key]) => key === section))
    return <Navigate to="/scripts/editor" replace />;
  function chooseProject(id: string) {
    const change = () => {
      setDirty(false);
      setProjectId(id);
    };
    if (dirty)
      modal.show({
        title: "Switch project?",
        description: "Unsaved edits in this project will be discarded.",
        submit: "Discard and switch",
        destructive: true,
        onSubmit: change,
      });
    else change();
  }
  return (
    <div className="page-shell scripts-page">
      <header>
        <h1>Scripts</h1>
      </header>
      <nav aria-label="Scripts" className="scripts-nav">
        {tabs.map(([key, label]) => (
          <NavLink key={key} to={`/scripts/${key}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      {section === "cs2" && <Cs2Page />}
      {section !== "cs2" && query.isLoading && (
        <p role="status">Loading scripts...</p>
      )}
      {section !== "cs2" && query.isError && (
        <div role="alert" className="flex flex-wrap gap-3 items-center">
          Unable to load scripts.
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {query.data && (
        <>
          <div hidden={section !== "editor"} className="script-editor-section">
            <div className="script-project-bar">
              <Choice
                label="Project"
                value={selected?.id ?? ""}
                options={query.data.projects.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                onChange={chooseProject}
                disabled={busy || !selected}
              />
              <Button
                variant="outline"
                disabled={busy || dirty}
                title={
                  dirty
                    ? "Save your current edits before creating a project"
                    : undefined
                }
                onClick={() =>
                  modal.show({
                    title: "Create project",
                    description:
                      "A project contains automation scripts, its own storage and scheduled jobs. New projects start disabled.",
                    submit: "Create project",
                    fields: [projectNameField()],
                    onSubmit: async (values) => {
                      const result = await command({
                        action: "create",
                        name: values.name.trim(),
                      });
                      setDirty(false);
                      setProjectId(String(result.id));
                      toast.success("Project created");
                    },
                  })
                }
              >
                Create project
              </Button>
            </div>
            {selected ? (
              <ProjectEditor
                key={selected.id}
                project={selected}
                channel={channel}
                revisions={query.data.revisions.filter(
                  (r) => r.project_id === selected.id,
                )}
                snapshots={query.data.snapshots}
                onDirty={setDirty}
                command={command}
                busy={busy}
                active={section === "editor"}
              />
            ) : (
              <div className="script-empty">
                <h2>No projects yet</h2>
                <p>Create a project to start writing automation.</p>
              </div>
            )}
          </div>
          {section !== "editor" && section !== "cs2" && (
            <ScriptRecords
              key={section}
              section={section}
              data={query.data}
              command={command}
              busy={busy}
              executionSearch={executionSearch}
              onExecutionSearch={setExecutionSearch}
            />
          )}
        </>
      )}
      {modal.dialog}
    </div>
  );
}
