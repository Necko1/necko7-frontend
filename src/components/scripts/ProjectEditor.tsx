import { useTranslation } from "react-i18next";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Tree, type NodeRendererProps, type TreeApi } from "react-arborist";
import { ContextMenu } from "@base-ui/react/context-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Delete02Icon,
  Edit02Icon,
  File01Icon,
  FileAddIcon,
  FloppyDiskIcon,
  Folder01Icon,
  FolderAddIcon,
  MoreHorizontalIcon,
  PlayIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { configureScripts, disposeScriptModels } from "@/lib/scriptLanguage";
import { Choice, Empty, StatusBadge, Time } from "./shared";
import {
  confirmationField,
  errorText,
  human,
  object,
  pretty,
  projectNameField,
  rows,
  type Command,
  type Project,
  type Row,
} from "./data";
import { useScriptDialog } from "./useScriptDialog";
import {
  fileTree,
  isFolderMarker,
  movePaths,
  validPath,
  type FileNode,
} from "./fileTree";
import ExecutionReport from "./ExecutionReport";
import { toast } from "sonner";
import { scriptingDocsUrl } from "@/lib/scriptingDocs";

function TreeNode({ node, style, dragHandle }: NodeRendererProps<FileNode>) {
  const { t } = useTranslation();
  return (
    <div
      style={style}
      ref={dragHandle}
      className={`script-tree-node ${node.isSelected ? "selected" : ""}`}
      data-path={node.id}
      onClick={() => {
        node.select();
        if (node.isInternal) node.toggle();
      }}
    >
      <HugeiconsIcon
        icon={
          node.isInternal
            ? node.isOpen
              ? ArrowDown01Icon
              : ArrowRight01Icon
            : File01Icon
        }
        size={14}
      />
      {node.isInternal && <HugeiconsIcon icon={Folder01Icon} size={14} />}
      {node.isEditing ? (
        <input
          autoFocus
          defaultValue={node.data.name}
          aria-label={t("scripts.renamePath")}
          onFocus={(e) => e.target.select()}
          onBlur={() => node.reset()}
          onKeyDown={(e) => {
            if (e.key === "Escape") node.reset();
            if (e.key === "Enter") node.submit(e.currentTarget.value);
          }}
        />
      ) : (
        <span>{node.data.name}</span>
      )}
      {node.data.dirty && (
        <span className="script-dirty-dot" aria-label={t("scripts.unsaved")} />
      )}
    </div>
  );
}
function canonical(files: Record<string, string>) {
  return JSON.stringify(
    Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export default function ProjectEditor({
  project,
  channel,
  revisions,
  snapshots,
  onDirty,
  command,
  busy,
  active,
}: {
  project: Project;
  channel: string;
  revisions: Row[];
  snapshots: Row[];
  onDirty: (dirty: boolean) => void;
  command: Command;
  busy: boolean;
  active: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [files, setFiles] = useState(project.draft);
  const [saved, setSaved] = useState(project.draft);
  const [version, setVersion] = useState(project.draft_version);
  const [file, setFile] = useState("main.rhai");
  const [selectedPath, setSelectedPath] = useState("main.rhai");
  const [contextPath, setContextPath] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(["main.rhai"]);
  const [result, setResult] = useState<unknown>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [context, setContext] = useState(
    '{"event":{"kind":"round_ended"},"state":{},"previous":null,"current_match":{"rounds":[]}}',
  );
  const [entry, setEntry] = useState("on_event");
  const [recorded, setRecorded] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [testResult, setTestResult] = useState<unknown>(null);
  const [history, setHistory] = useState(false);
  const [historyRevision, setHistoryRevision] = useState<number | null>(null);
  const [historyFiles, setHistoryFiles] = useState<Record<
    string,
    string
  > | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyFile, setHistoryFile] = useState("main.rhai");
  const [treeHeight, setTreeHeight] = useState(
    window.innerWidth <= 767 ? 140 : 370,
  );
  const modal = useScriptDialog();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const treeRef = useRef<TreeApi<FileNode> | null>(null);
  const filesRef = useRef(files);
  const savePending = useRef(false);
  const dirty = canonical(files) !== canonical(saved);
  const unpublished = project.live_files
    ? canonical(files) !== canonical(project.live_files)
    : !project.active_revision;
  if (!active && menuOpen) setMenuOpen(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const resize = () => setTreeHeight(media.matches ? 140 : 370);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useLayoutEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(
    () => () => disposeScriptModels(`necko7://${channel}/${project.id}/`),
    [channel, project.id],
  );
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  function workingFiles() {
    const next = { ...filesRef.current };
    if (next[file] !== undefined && editorRef.current)
      next[file] = editorRef.current.getValue();
    return next;
  }
  async function save() {
    if (savePending.current || busy) return;
    savePending.current = true;
    const snapshot = workingFiles();
    setFiles(snapshot);
    filesRef.current = snapshot;
    try {
      const response = await command({
        action: "save",
        project_id: project.id,
        version,
        files: snapshot,
      });
      setSaved(snapshot);
      setVersion(Number(response.version));
      toast.success(t("scripts.draftSaved"));
    } catch (error) {
      setResult({ error: errorText(error) });
    } finally {
      savePending.current = false;
    }
  }
  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (active && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active]);
  function select(path: string) {
    if (
      filesRef.current[path] === undefined ||
      isFolderMarker(path, filesRef.current[path])
    )
      return;
    setSelectedPath(path);
    setFile(path);
    setOpen((t) => (t.includes(path) ? t : [...t, path]));
  }
  function applyMove(moves: { from: string; to: string }[]) {
    const next = movePaths(workingFiles(), moves);
    const transform = (p: string) => {
      const m = moves.find((m) => p === m.from || p.startsWith(m.from + "/"));
      return m ? m.to + p.slice(m.from.length) : p;
    };
    setFiles(next);
    filesRef.current = next;
    setOpen((t) => t.map(transform));
    setFile(transform(file));
    setSelectedPath(transform(selectedPath));
    toast.success(t("scripts.pathUpdated"));
  }
  function newFile(folder: boolean, parentOverride?: string) {
    const node = treeRef.current?.get(selectedPath);
    const parent = parentOverride ?? (node?.isInternal
      ? selectedPath
      : selectedPath.includes("/")
        ? selectedPath.slice(0, selectedPath.lastIndexOf("/"))
        : "");
    modal.show({
      title: folder ? t("scripts.createFolder") : t("scripts.createFile"),
      description: folder
        ? t("scripts.createFolderDescription")
        : t("scripts.createFileDescription"),
      submit: folder ? t("scripts.createFolder") : t("scripts.createFile"),
      fields: [
        {
          name: "path",
          label: folder ? t("scripts.folderPath") : t("scripts.filePath"),
          value: parent ? parent + "/" : "",
          validate: (value) =>
            !validPath(folder ? value + "/_folder.rhai" : value)
              ? t("scripts.invalidPath")
              : undefined,
        },
      ],
      onSubmit: (values) => {
        const path = folder ? values.path + "/_folder.rhai" : values.path;
        const next = workingFiles();
        if (
          next[path] !== undefined ||
          Object.keys(next).some(
            (p) => p.startsWith(path + "/") || path.startsWith(p + "/"),
          ) ||
          (!folder && path.endsWith("/_folder.rhai"))
        )
          throw new Error(t("scripts.reservedPath"));
        if (Object.keys(next).length >= 64)
          throw new Error(t("scripts.sourceLimit"));
        next[path] = folder ? "// Folder module\n" : "";
        setFiles(next);
        filesRef.current = next;
        if (!folder) select(path);
        else setSelectedPath(values.path);
      },
    });
  }
  function removePath(path = selectedPath) {
    if (path === "main.rhai") return;
    modal.show({
      title: t("scripts.deletePathTitle"),
      description: t("scripts.deletePathDescription", { path }),
      submit: t("scripts.delete"),
      destructive: true,
      onSubmit: () => {
        const next = Object.fromEntries(
          Object.entries(workingFiles()).filter(
            ([p]) => p !== path && !p.startsWith(path + "/"),
          ),
        );
        setFiles(next);
        filesRef.current = next;
        setOpen((t) => t.filter((p) => next[p] !== undefined));
        if (next[file] === undefined) setFile("main.rhai");
        setSelectedPath("main.rhai");
      },
    });
  }
  function editPath(path: string, rename = false) {
    modal.show({
      title: rename ? t("scripts.renamePath") : t("scripts.movePath"),
      description: t("scripts.importsDescription"),
      submit: rename ? t("scripts.rename") : t("scripts.move"),
      fields: [{ name: "path", label: rename ? t("scripts.name") : t("scripts.destinationPath"), value: rename ? path.split("/").at(-1) : path }],
      onSubmit: values => applyMove([{ from: path, to: rename && path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) + values.path : values.path }]),
    });
  }
  async function action(body: Record<string, unknown>) {
    try {
      const response = await command({ project_id: project.id, ...body });
      if (body.action === "validate") setResult(response);
      else toast.success(t("scripts.projectUpdated"));
      return response;
    } catch (error) {
      setResult({ error: errorText(error) });
      throw error;
    }
  }
  function diagnostic(message: string) {
    const path = Object.keys(files).find((p) => message.includes(p)) ?? file;
    select(path);
    const line = Number(message.match(/line (\d+)/)?.[1] ?? 1);
    setTimeout(() => {
      editorRef.current?.revealLineInCenter(line);
      editorRef.current?.setPosition({ lineNumber: line, column: 1 });
      editorRef.current?.focus();
    }, 50);
  }
  useEffect(() => {
    const m = monacoRef.current;
    if (!m) return;
    const message = object(result).error;
    const path = typeof message === "string"
      ? Object.keys(files).find((path) => message.includes(path)) ?? file
      : file;
    const line =
      typeof message === "string"
        ? Number(message.match(/line (\d+)/)?.[1] ?? 1)
        : 1;
    for (const model of m.editor.getModels().filter((model: editor.ITextModel) => model.uri.toString().startsWith(`necko7://${channel}/${project.id}/`))) m.editor.setModelMarkers(
      model,
      "rhai-validation",
      typeof message === "string" && model.uri.toString() === `necko7://${channel}/${project.id}/${path}`
        ? [
            {
              severity: m.MarkerSeverity.Error,
              message,
              startLineNumber: line,
              endLineNumber: line,
              startColumn: 1,
              endColumn: 2,
            },
          ]
        : [],
    );
  }, [result, file, files, channel, project.id]);
  async function inspectRevision(revision: number) {
    setHistoryRevision(revision);
    setHistoryFiles(null);
    setHistoryError("");
    setHistoryFile("main.rhai");
    try {
      const response = await command({
        action: "revision",
        project_id: project.id,
        revision,
      });
      setHistoryFiles(object(response.files) as Record<string, string>);
    } catch (error) {
      setHistoryError(errorText(error));
    }
  }
  const eventOptions = snapshots
    .flatMap((s) =>
      rows(s.events).map((event, index) => ({
        value: `${s.id}:${index}`,
        label: `${human(object(event.event).kind ?? event.kind)} / ${new Date(String(s.created_at)).toLocaleString(i18n.language)}`,
      })),
    )
    .filter((o) => o.label.toLowerCase().includes(eventSearch.toLowerCase()));
  const parsed = (() => {
    try {
      const value: unknown = JSON.parse(context);
      return value && typeof value === "object" && !Array.isArray(value)
        ? object(value)
        : null;
    } catch {
      return null;
    }
  })();
  return (
    <div className="script-editor">
      <div className="script-project-heading">
        <div>
          <h2>{project.name}</h2>
          <div className="script-state-line">
            <StatusBadge value={project.enabled ? "enabled" : "disabled"} />
            <span>
              {project.active_revision
                ? t("scripts.liveVersion", { version: project.active_revision })
                : t("scripts.neverPublished")}
            </span>
            <span>
              {dirty
                ? t("scripts.unsavedEdits")
                : project.active_revision && !project.live_files
                  ? t("scripts.comparisonUnavailable")
                  : unpublished
                    ? t("scripts.unpublishedDraft")
                    : t("scripts.matchesLive")}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("scripts.projectActions")}
                title={t("scripts.projectActions")}
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={19} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<a href={scriptingDocsUrl("reference/")} target="_blank" rel="noopener noreferrer" />}>{t("scripts.apiReference")}</DropdownMenuItem>
            <DropdownMenuItem render={<a href="https://rhai.rs/book/" target="_blank" rel="noopener noreferrer" />}>{t("scripts.rhaiGuide")}</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                modal.show({
                  title: t("scripts.renameProject"),
                  description:
                    t("scripts.renameProjectDescription"),
                  submit: t("scripts.rename"),
                  fields: [projectNameField(project.name)],
                  onSubmit: (values) =>
                    action({ action: "rename", name: values.name.trim() }),
                })
              }
            >
              {t("scripts.renameProject")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busy}
              onClick={() =>
                modal.show({
                  title: project.enabled
                    ? t("scripts.disableTitle")
                    : t("scripts.enableTitle"),
                  description: project.enabled
                    ? t("scripts.disableDescription")
                    : t("scripts.enableDescription"),
                  submit: project.enabled
                    ? t("scripts.disable")
                    : t("scripts.enable"),
                  onSubmit: () =>
                    action({ action: "enable", enabled: !project.enabled }),
                })
              }
            >
              {project.enabled ? t("scripts.disable") : t("scripts.enable")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                modal.show({
                  title: t("scripts.deleteProjectTitle"),
                  description: t("scripts.deleteProjectDescription", { name: project.name }),
                  submit: t("scripts.deleteProject"),
                  destructive: true,
                  fields: [confirmationField("DELETE")],
                  onSubmit: () =>
                    action({ action: "delete", confirmation: "DELETE" }),
                })
              }
            >
              {t("scripts.deleteProject")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="script-toolbar">
        <Button
          variant="outline"
          disabled={busy || !dirty}
          onClick={() => void save()}
          title={t("scripts.saveDraftTitle")}
        >
          <HugeiconsIcon icon={FloppyDiskIcon} size={16} />
          {t("scripts.saveDraft")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || dirty}
          onClick={() => void action({ action: "validate" }).catch(() => {})}
          title={t("scripts.validateTitle")}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
          {t("scripts.validate")}
        </Button>
        <Button
          disabled={busy || dirty}
          onClick={() =>
            modal.show({
              title: t("scripts.publishTitle"),
              description: project.enabled
                ? t("scripts.publishEnabledDescription")
                : t("scripts.publishDisabledDescription"),
              submit: t("scripts.publish"),
              onSubmit: async () => {
                await action({ action: "publish", version });
                toast.success(t("scripts.published"));
              },
            })
          }
        >
          <HugeiconsIcon icon={Upload01Icon} size={16} />
          {t("scripts.publish")}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setHistory(true);
            setHistoryRevision(null);
            setHistoryFiles(null);
          }}
        >
          <HugeiconsIcon icon={Clock01Icon} size={16} />
          {t("scripts.history")}
        </Button>
        <span className="script-save-state">
          {dirty
            ? t("scripts.saveBeforeTest")
            : project.enabled
              ? t("scripts.eventsUseLive")
              : t("scripts.automationDisabled")}
        </span>
      </div>
      <div className="script-workbench">
        <aside>
          <div className="script-file-tools">
            <span>{t("scripts.files")}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              title={t("scripts.createFile")}
              aria-label={t("scripts.createFile")}
              onClick={() => newFile(false)}
            >
              <HugeiconsIcon icon={FileAddIcon} size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title={t("scripts.createFolder")}
              aria-label={t("scripts.createFolder")}
              onClick={() => newFile(true)}
            >
              <HugeiconsIcon icon={FolderAddIcon} size={16} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("scripts.fileActions")}
                    aria-label={t("scripts.fileActions")}
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  disabled={selectedPath === "main.rhai"}
                  onClick={() => treeRef.current?.get(selectedPath)?.edit()}
                >
                  <HugeiconsIcon icon={Edit02Icon} size={15} />
                  {t("scripts.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedPath === "main.rhai"}
                  onClick={() =>
                    modal.show({
                      title: t("scripts.movePath"),
                      description:
                        t("scripts.moveDescription"),
                      submit: t("scripts.move"),
                      fields: [
                        {
                          name: "path",
                          label: t("scripts.destinationPath"),
                          value: selectedPath,
                        },
                      ],
                      onSubmit: (values) =>
                        applyMove([{ from: selectedPath, to: values.path }]),
                    })
                  }
                >
                  {t("scripts.moveTo")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedPath === "main.rhai"}
                  variant="destructive"
                  onClick={() => removePath()}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} />
                  {t("scripts.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ContextMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <ContextMenu.Trigger className="script-tree" tabIndex={0} aria-label={t("scripts.treeMenu")}
            onContextMenu={event => {
              const path = (event.target as Element).closest<HTMLElement>("[data-path]")?.dataset.path ?? null;
              setContextPath(path);
              if (path) setSelectedPath(path);
            }}
            onKeyDown={event => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) setContextPath(selectedPath);
            }}>
            <Tree
              ref={treeRef}
              data={fileTree(files, saved)}
              width="100%"
              height={treeHeight}
              rowHeight={30}
              selection={selectedPath}
              disableMultiSelection
              disableDrag={(node) => node.id === "main.rhai"}
              disableEdit={(node) => node.id === "main.rhai"}
              disableDrop={({ parentNode, dragNodes }) =>
                !!parentNode &&
                (parentNode.isLeaf ||
                  dragNodes.some(
                    (node) =>
                      parentNode.id === node.id ||
                      parentNode.id.startsWith(node.id + "/"),
                  ))
              }
              onSelect={(nodes) => {
                if (nodes[0]) setSelectedPath(nodes[0].id);
                if (nodes[0]?.isLeaf) select(nodes[0].id);
              }}
              onRename={({ id, name }) => {
                try {
                  applyMove([
                    {
                      from: id,
                      to: id.includes("/")
                        ? id.slice(0, id.lastIndexOf("/") + 1) + name
                        : name,
                    },
                  ]);
                } catch (error) {
                  toast.error(errorText(error));
                }
              }}
              onMove={({ dragIds, parentId }) => {
                try {
                  applyMove(
                    dragIds.map((from) => ({
                      from,
                      to:
                        (parentId ? parentId + "/" : "") +
                        from.split("/").at(-1),
                    })),
                  );
                } catch (error) {
                  toast.error(errorText(error));
                }
              }}
              aria-label={t("scripts.projectFiles")}
            >
              {TreeNode}
            </Tree>
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner sideOffset={4} collisionPadding={8} className="z-50">
              <ContextMenu.Popup className="script-context-menu" aria-label={t("scripts.treeActions")}>
                {contextPath && files[contextPath] !== undefined && <ContextMenu.Item disabled={busy} onClick={() => select(contextPath)}>{t("scripts.open")}</ContextMenu.Item>}
                {(!contextPath || files[contextPath] === undefined) && <>
                  <ContextMenu.Item disabled={busy} onClick={() => newFile(false, contextPath ?? "")}><HugeiconsIcon icon={FileAddIcon} size={15} />{t("scripts.newFile")}</ContextMenu.Item>
                  <ContextMenu.Item disabled={busy} onClick={() => newFile(true, contextPath ?? "")}><HugeiconsIcon icon={FolderAddIcon} size={15} />{t("scripts.newFolder")}</ContextMenu.Item>
                </>}
                {contextPath && <>
                  <ContextMenu.Item disabled={busy || contextPath === "main.rhai"} onClick={() => editPath(contextPath, true)}><HugeiconsIcon icon={Edit02Icon} size={15} />{t("scripts.rename")}</ContextMenu.Item>
                  <ContextMenu.Item disabled={busy || contextPath === "main.rhai"} onClick={() => editPath(contextPath)}>{t("scripts.moveTo")}</ContextMenu.Item>
                  <ContextMenu.Item disabled={busy || contextPath === "main.rhai"} data-destructive onClick={() => removePath(contextPath)}><HugeiconsIcon icon={Delete02Icon} size={15} />{t("scripts.delete")}</ContextMenu.Item>
                </>}
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
          </ContextMenu.Root>
        </aside>
        <div className="script-code">
          <div className="script-file-tabs">
            {open
              .filter(
                (p) => files[p] !== undefined && !isFolderMarker(p, files[p]),
              )
              .map((p) => (
                <div key={p} className={p === file ? "active" : ""}>
                  <button
                    aria-pressed={p === file}
                    onClick={() => setFile(p)}
                    title={p}
                  >
                    {p.split("/").at(-1)}
                    {files[p] !== saved[p] && (
                      <span className="script-dirty-dot" />
                    )}
                  </button>
                  {p !== "main.rhai" && (
                    <button
                      aria-label={t("scripts.closePath", { path: p })}
                      title={t("scripts.closeFile")}
                      onClick={() => {
                        setOpen((t) => t.filter((v) => v !== p));
                        if (file === p) setFile("main.rhai");
                      }}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={12} />
                    </button>
                  )}
                </div>
              ))}
          </div>
          <Editor
            loading={t("scripts.loadingEditor")}
            key={file}
            keepCurrentModel
            height="440px"
            language="rhai"
            theme="vs-dark"
            path={`necko7://${channel}/${project.id}/${file}`}
            defaultValue={files[file] ?? ""}
            beforeMount={configureScripts}
            onMount={(e, m) => {
              editorRef.current = e;
              monacoRef.current = m;
              if (e.getValue() !== filesRef.current[file])
                e.setValue(filesRef.current[file] ?? "");
            }}
            onChange={(value) => {
              const next = { ...filesRef.current, [file]: value ?? "" };
              filesRef.current = next;
              setFiles(next);
            }}
            options={{
              ariaLabel: t("scripts.codeEditor"),
              minimap: { enabled: false },
              fontSize: 13,
              tabSize: 4,
              automaticLayout: true,
              fixedOverflowWidgets: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 12 },
            }}
          />
          <div className="script-code-footer">
            <span>{file}</span>
            <span>Rhai</span>
          </div>
        </div>
      </div>
      {result !== null && (
        <section aria-label={t("scripts.diagnostics")} className="script-diagnostics">
          <ExecutionReport value={result} onDiagnostic={diagnostic} />
        </section>
      )}
      <section className="script-test">
        <button
          className="script-test-heading"
          aria-expanded={testOpen}
          onClick={() => setTestOpen((v) => !v)}
        >
          <HugeiconsIcon
            icon={testOpen ? ArrowDown01Icon : ArrowRight01Icon}
            size={16}
          />
          <strong>{t("scripts.testDraft")}</strong>
          <span>{t("scripts.noSideEffects")}</span>
        </button>
        {testOpen && (
          <div className="script-test-body">
            <div className="script-toolbar">
              <Tabs
                value={entry}
                onValueChange={(v) => {
                  setEntry(String(v));
                  setRecorded("");
                  setContext(
                    v === "on_timer"
                      ? '{"timer":{"key":"test_timer","payload":{}},"state":{},"previous":null,"current_match":null}'
                      : '{"event":{"kind":"round_ended"},"state":{},"previous":null,"current_match":{"rounds":[]}}',
                  );
                }}
              >
                <TabsList>
                  <TabsTrigger value="on_event">{t("scripts.cs2Event")}</TabsTrigger>
                  <TabsTrigger value="on_timer">{t("scripts.timer")}</TabsTrigger>
                </TabsList>
              </Tabs>
              {entry === "on_event" && (
                <>
                  <Input
                    aria-label={t("scripts.searchEvents")}
                    placeholder={t("scripts.findEvent")}
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="max-w-64"
                  />
                  <Choice
                    label={t("scripts.recordedEvent")}
                    value={recorded}
                    options={[
                      { value: "", label: t("scripts.manualContext") },
                      ...eventOptions,
                    ]}
                    disabled={busy}
                    onChange={(value) => {
                      setRecorded(value);
                      if (!value) return;
                      const [snapshot, index] = value.split(":");
                      void command({
                        action: "snapshot",
                        project_id: project.id,
                        snapshot_id: Number(snapshot),
                        event_index: Number(index),
                      })
                        .then((ctx) => setContext(pretty(ctx)))
                        .catch((error) => toast.error(errorText(error)));
                    }}
                  />
                </>
              )}
            </div>
            <div className="script-context-summary">
              <span>{t("scripts.context")}</span>
              <strong>
                {parsed
                  ? human(
                      object(parsed.event).event
                        ? object(object(parsed.event).event).kind
                        : (object(parsed.event).kind ??
                            object(parsed.timer).key),
                    )
                  : t("scripts.invalidJson")}
              </strong>
              {object(parsed?.state).match != null && (
                <span>
                  {String(object(object(parsed?.state).match).map ?? "")}
                </span>
              )}
            </div>
            <details className="script-raw">
              <summary>{t("scripts.editContext")}</summary>
              <Textarea
                aria-label={t("scripts.testContext")}
                rows={7}
                className="font-mono mt-3"
                value={context}
                onChange={(e) => {
                  setContext(e.target.value);
                  setRecorded("");
                }}
              />
            </details>
            <Button
              disabled={busy || dirty || !parsed}
              onClick={() =>
                void command({
                  action: "test",
                  project_id: project.id,
                  entry,
                  context: JSON.parse(context),
                })
                  .then(setTestResult)
                  .catch((error) => setTestResult({ error: errorText(error) }))
              }
            >
              <HugeiconsIcon icon={PlayIcon} size={16} />
              {t("scripts.runTest")}
            </Button>
            {testResult !== null && (
              <ExecutionReport
                value={testResult}
                onDiagnostic={(message) => {
                  diagnostic(message);
                }}
              />
            )}
          </div>
        )}
      </section>
      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="sm:max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("scripts.history")}</DialogTitle>
            <DialogDescription>
              {t("scripts.historyDescription")}
            </DialogDescription>
          </DialogHeader>
          {!revisions.length ? (
            <Empty title={t("scripts.noVersions")} />
          ) : (
            <div className="script-history">
              <div>
                {revisions.map((r) => (
                  <button
                    key={String(r.revision)}
                    aria-pressed={historyRevision === Number(r.revision)}
                    disabled={busy}
                    onClick={() => void inspectRevision(Number(r.revision))}
                  >
                    <strong>
                      {t("scripts.version")} {String(r.revision)}
                      {project.active_revision === r.revision ? t("scripts.liveSuffix") : ""}
                    </strong>
                    <Time value={r.created_at} />
                  </button>
                ))}
              </div>
              <div>
                {historyRevision === null ? (
                  <p className="text-muted-foreground">
                    {t("scripts.selectVersion")}
                  </p>
                ) : (
                  <>
                    <h3>{t("scripts.version")}{" "}{historyRevision}</h3>
                    {historyError && (
                      <p role="alert" className="text-destructive">
                        {historyError}
                      </p>
                    )}
                    {!historyFiles && !historyError && (
                      <p role="status">{t("scripts.loadingCode")}</p>
                    )}
                    {historyFiles && (
                      <>
                        <Choice
                          label={t("scripts.publishedFile")}
                          value={historyFile}
                          options={Object.keys(historyFiles)
                            .filter((p) => !isFolderMarker(p, historyFiles[p]))
                            .map((p) => ({ value: p, label: p }))}
                          onChange={setHistoryFile}
                        />
                        <pre className="script-published-code">
                          {historyFiles[historyFile]}
                        </pre>
                      </>
                    )}
                    <Button
                      disabled={
                        busy ||
                        project.active_revision === historyRevision ||
                        !historyFiles
                      }
                      variant="outline"
                      onClick={() =>
                        modal.show({
                          title: t("scripts.activateTitle", { version: historyRevision }),
                          description:
                            t("scripts.activateDescription"),
                          submit: t("scripts.activate"),
                          onSubmit: async () => {
                            await action({
                              action: "rollback",
                              revision: historyRevision,
                            });
                            toast.success(t("scripts.liveChanged"));
                          },
                        })
                      }
                    >
                      {t("scripts.activate")} {historyRevision}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {modal.dialog}
    </div>
  );
}
