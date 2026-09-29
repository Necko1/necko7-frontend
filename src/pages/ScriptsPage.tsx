import { useTranslation } from "react-i18next";
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
import { scriptingDocsUrl } from "@/lib/scriptingDocs";
import "@/components/scripts/scripts.css";

const tabs = [
  ["cs2", "scripts.cs2"],
  ["editor", "scripts.editor"],
  ["storage", "scripts.storage"],
  ["matches", "scripts.matches"],
  ["scheduler", "scripts.scheduler"],
  ["logs", "scripts.logs"],
];
export default function ScriptsPage() {
  const { selectedBroadcasterId, broadcasters } = useAppStore();
  const channel = broadcasters.find(
    (b) => b.channel_id === selectedBroadcasterId,
  );
  if (!channel || !["OWNER", "EDITOR"].includes(channel.role.toUpperCase()))
    return <Navigate to="/channels" replace />;
  return <Scripts key={channel.channel_id} channel={channel.channel_id} />;
}
function Scripts({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const { section = "editor" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const queryKey = ["scripts", channel];
  const [executionSearch, setExecutionSearch] = useState("");
  const recordSection = section === "logs" || section === "scheduler";
  const query = useQuery({
    queryKey: [...queryKey, recordSection],
    queryFn: () =>
      api
        .get<Overview>(`/api/v1/broadcasters/${channel}/scripts`, {
          params: recordSection ? { include_executions: false } : undefined,
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
      throw new Error(t("scripts.waitAction"));
    pending.current = true;
    setBusy(true);
    try {
      const response = await api.post(
        `/api/v1/broadcasters/${channel}/scripts`,
        body,
      );
      await qc.invalidateQueries({ queryKey });
      await qc.invalidateQueries({ queryKey: ["script-history", channel] });
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
          title: t("scripts.leaveTitle"),
          description: t("scripts.leaveDescription"),
          submit: t("scripts.leave"),
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
  }, [dirty, showDialog, navigate, t]);
  if (!tabs.some(([key]) => key === section))
    return <Navigate to="/scripts/editor" replace />;
  function chooseProject(id: string) {
    const change = () => {
      setDirty(false);
      setProjectId(id);
    };
    if (dirty)
      modal.show({
        title: t("scripts.switchTitle"),
        description: t("scripts.switchDescription"),
        submit: t("scripts.switch"),
        destructive: true,
        onSubmit: change,
      });
    else change();
  }
  return (
    <div className="page-shell scripts-page">
      <header>
        <h1>{t("scripts.title")}</h1>
        <a href={scriptingDocsUrl()} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">{t("scripts.docs")}</a>
      </header>
      <nav aria-label={t("scripts.title")} className="scripts-nav">
        {tabs.map(([key, label]) => (
          <NavLink key={key} to={`/scripts/${key}`}>
            {t(label)}
          </NavLink>
        ))}
      </nav>
      {section === "cs2" && <Cs2Page />}
      {section !== "cs2" && query.isLoading && (
        <p role="status">{t("scripts.loading")}</p>
      )}
      {section !== "cs2" && query.isError && (
        <div role="alert" className="flex flex-wrap gap-3 items-center">
          {t("scripts.loadFailed")}
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("scripts.retry")}
          </Button>
        </div>
      )}
      {query.data && (
        <>
          <div hidden={section !== "editor"} className="script-editor-section">
            <div className="script-project-bar">
              <Choice
                label={t("scripts.project")}
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
                    ? t("scripts.saveBeforeCreate")
                    : undefined
                }
                onClick={() =>
                  modal.show({
                    title: t("scripts.createProject"),
                    description:
                      t("scripts.createProjectDescription"),
                    submit: t("scripts.createProject"),
                    fields: [projectNameField()],
                    onSubmit: async (values) => {
                      const result = await command({
                        action: "create",
                        name: values.name.trim(),
                      });
                      setDirty(false);
                      setProjectId(String(result.id));
                      toast.success(t("scripts.projectCreated"));
                    },
                  })
                }
              >
                {t("scripts.createProject")}
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
                <h2>{t("scripts.noProjects")}</h2>
                <p>{t("scripts.noProjectsDescription")}</p>
              </div>
            )}
          </div>
          {section !== "editor" && section !== "cs2" && (
            <ScriptRecords
              key={section}
              channel={channel}
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
