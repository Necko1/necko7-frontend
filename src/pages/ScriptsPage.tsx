import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { NavLink, Navigate, useParams } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import Editor from "@monaco-editor/react";

import { Tree, type NodeRendererProps } from "react-arborist";

import type { editor } from "monaco-editor";

import { api } from "@/lib/api";

import { configureScripts, disposeScriptModels } from "@/lib/scriptLanguage";

import { useAppStore } from "@/store/useAppStore";

import { Button } from "@/components/ui/button";

import Cs2Page from "./Cs2Page";

import { toast } from "sonner";

import { isAxiosError } from "axios";



type Project = { id: string; name: string; enabled: boolean; draft: Record<string,string>; draft_version: number; active_revision: number | null };

type Row = Record<string, unknown> & { id?: string; project_id?: string; status?: string; created_at?: string };

type Overview = { projects: Project[]; revisions: Row[]; jobs: Row[]; storage: Row[]; executions: Row[]; matches: Row[]; snapshots: Row[] };

type Command = (data: Record<string,unknown>) => Promise<Record<string,unknown>>;

const tabs = [["cs2", "CS2 Integration"], ["editor", "Editor"], ["storage", "Local Storage"], ["matches", "Matches"], ["scheduler", "Scheduler"], ["logs", "Logs"]];

const inputClass = "rounded-md border border-border bg-background px-3 py-2 text-sm";

function pretty(v: unknown) { return JSON.stringify(v, null, 2); }



export default function ScriptsPage() {

  const { selectedBroadcasterId, broadcasters } = useAppStore();

  const channel = broadcasters.find(b => b.channel_id === selectedBroadcasterId);

  if (channel?.role.toUpperCase() !== "OWNER") return <Navigate to="/channels" replace />;

  return <Scripts key={channel.channel_id} channel={channel.channel_id} />;

}

function Scripts({ channel }: { channel: string }) {

  const { section = "editor" } = useParams();

  const qc = useQueryClient();

  const queryKey = ["scripts",channel];

  const query = useQuery({ queryKey, queryFn: () => api.get<Overview>(`/api/v1/broadcasters/${channel}/scripts`).then(r => r.data), enabled: section !== "cs2", refetchInterval: section === "editor" ? false : 10000 });

  const [draftDirty,setDraftDirty] = useState(false);

  const [level,setLevel] = useState("");

  const [source,setSource] = useState("");

  const [projectId,setProjectId] = useState("");

  const [search,setSearch] = useState("");

  const [status,setStatus] = useState("");

  const [busy,setBusy] = useState(false);

  const [detail,setDetail] = useState<Row | null>(null);

  const [result,setResult] = useState<unknown>(null);

  const data = query.data;

  const selected = data?.projects.find(p => p.id === projectId) ?? data?.projects[0];

  const command: Command = async body => {

    setBusy(true);

    try {

      const response = await api.post(`/api/v1/broadcasters/${channel}/scripts`,body);

      await qc.invalidateQueries({ queryKey });

      return response.data;

    } catch(error) {

      const message = isAxiosError(error) ? pretty(error.response?.data ?? error.message) : String(error);

      toast.error(message); throw error;

    } finally { setBusy(false); }

  };

  async function create() {

    const name=window.prompt("Project name"); if (!name?.trim()) return;

    const response=await command({action:"create",name}); setProjectId(String(response.id));

  }

  const run = (body:Record<string,unknown>) => { void command(body).then(setResult).catch(()=>{}); };

  const rows = section === "storage" ? data?.storage : section === "scheduler" ? data?.jobs : section === "logs" ? data?.executions : data?.matches;

  const filtered = rows?.filter(r => (!projectId || section === "matches" || r.project_id === projectId) && (!status || r.status === status) && (!source || r.source === source) && (!level || (level==="error" && !!(r.report as Record<string,unknown>|null)?.error) || pretty(r.report).includes(`"level": "${level}"`)) && pretty(r).toLowerCase().includes(search.toLowerCase()));

  return <div className="page-shell space-y-5">

    <header><h1 className="text-3xl font-semibold">Scripts</h1><p className="mt-1 text-muted-foreground">Publish automation projects, inspect shared game history, and manage scheduled work.</p></header>

    <nav aria-label="Scripts" className="flex gap-1 overflow-x-auto border-b border-border">{tabs.map(([key,label]) => <NavLink key={key} to={`/scripts/${key}`} className={({isActive}) => `shrink-0 px-3 py-3 text-sm border-b-2 ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{label}</NavLink>)}</nav>

    {section === "cs2" ? <Cs2Page /> : <>

      {query.isLoading && <p role="status">Loading scripts…</p>}

      {query.isError && <div role="alert">Unable to load scripting data. <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>}

      {data && <>

        {section !== "matches" && <div className="flex flex-wrap items-center gap-2"><label className="text-sm">Project <select aria-label="Project" className={inputClass} value={section === "editor" ? selected?.id ?? "" : projectId} onChange={e => {if(!draftDirty || confirm("Discard unsaved draft changes?")) {setDraftDirty(false);setProjectId(e.target.value);}}}>{section !== "editor" && <option value="">All projects</option>}{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}{!p.enabled ? " · disabled" : ""}</option>)}</select></label>{section === "editor" && <Button disabled={busy} onClick={() => void create().catch(()=>{})}>Create project</Button>}</div>}

        {section === "editor" ? selected ? <ProjectEditor key={selected.id} project={selected} channel={channel} revisions={data.revisions.filter(r => r.project_id === selected.id)} snapshots={data.snapshots} onDirty={setDraftDirty} command={command} busy={busy} /> : <p className="py-8 text-muted-foreground">Create your first project. Drafts are safe to edit; only published, enabled projects receive events.</p> : <>

          <div className="flex flex-wrap gap-2"><input aria-label="Search" className={inputClass} placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} />{["scheduler","logs"].includes(section) && <select aria-label="Status" className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{["scheduled","blocked","queued","completed","cancelled","success","failed","interrupted","skipped"].map(s=><option key={s}>{s}</option>)}</select>}

            {section === "logs" && <><select aria-label="Log level" className={inputClass} value={level} onChange={e=>setLevel(e.target.value)}><option value="">All levels</option>{["debug","info","warn","error"].map(v=><option key={v}>{v}</option>)}</select><select aria-label="Execution source" className={inputClass} value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option>{["cs2","timer","validate","publish","dry_run"].map(v=><option key={v}>{v}</option>)}</select></>}

            {section === "storage" && projectId && <><Button variant="outline" onClick={() => { const key=prompt("Storage key"); const value=key && prompt("JSON value"); if(key && value!==null) {try {run({action:"storage_set",project_id:projectId,key,value:JSON.parse(value || "null")});} catch {toast.error("Enter valid JSON");}} }}>Add key</Button><Button variant="destructive" disabled={busy} onClick={() => {if(prompt("Clear this project's storage? Type CLEAR") === "CLEAR") run({action:"storage_clear",project_id:projectId,confirmation:"CLEAR"});}}>Clear project storage</Button></>}

          </div>

          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground border-b border-border"><tr><th className="p-3">{section === "matches" ? "Map" : "Project"}</th><th className="p-3">{section === "storage" ? "Key / value" : "Details"}</th><th className="p-3">Status / time</th><th className="p-3">Actions</th></tr></thead><tbody>{filtered?.map((r,i) => <tr key={r.id ?? `${r.project_id}-${r.key ?? i}`} className="border-b border-border/50">

            <td className="p-3">{section === "matches" ? String(r.map) : data.projects.find(p=>p.id===r.project_id)?.name ?? "Deleted project"}</td>

            <td className="p-3 max-w-96"><button className="text-primary text-left break-all" onClick={()=>setDetail(r)}>{String(r.job_key ?? r.key ?? (section === "logs" ? `${r.source} · revision ${r.revision}` : "Inspect rounds"))}</button>{section === "storage" && <pre className="truncate text-xs text-muted-foreground">{pretty(r.value)}</pre>}</td>

            <td className="p-3"><span>{r.status ?? (r.completed_at ? "Completed" : section === "matches" ? "Active" : typeof r.value)}</span><div className="text-xs text-muted-foreground">{String(r.reason ?? r.scheduled_for ?? r.updated_at ?? r.created_at ?? "")}</div></td>

            <td className="p-3"><div className="flex gap-2">{section === "scheduler" && ["scheduled","blocked"].includes(r.status ?? "") && <><Button size="sm" disabled={busy} onClick={()=>{if(confirm("Run now using the pinned revision? This may send chat or purchase rewards, even if the project is disabled.")) run({action:"run_job",project_id:r.project_id,job_id:r.id,confirmation:"RUN"});}}>Run now</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>run({action:"cancel_job",project_id:r.project_id,job_id:r.id})}>Cancel</Button></>}{section === "storage" && <><Button size="sm" variant="outline" onClick={()=>{const value=prompt("Edit JSON value",pretty(r.value));if(value!==null)try{run({action:"storage_set",project_id:r.project_id,key:r.key,value:JSON.parse(value)});}catch{toast.error("Enter valid JSON");}}}>Edit</Button><Button size="sm" variant="outline" onClick={()=>{if(confirm(`Delete key ${r.key}?`))run({action:"storage_delete",project_id:r.project_id,key:r.key});}}>Delete</Button></>}</div></td>

          </tr>)}</tbody></table></div>

          {!filtered?.length && <p className="py-8 text-muted-foreground">No {section === "storage" ? "storage keys" : section === "logs" ? "executions" : section === "scheduler" ? "jobs" : "matches"} match these filters.</p>}

          <p className="text-xs text-muted-foreground">Showing the latest {section === "logs" ? "200 executions" : section === "matches" ? "30 completed matches and current match" : section === "storage" ? "2,000 keys" : "500 jobs"}.</p>

        </>}

      </>}

      {result !== null && <details open><summary>Action result</summary><pre className="text-xs overflow-auto p-3">{pretty(result)}</pre></details>}

      {detail && <section className="border-t border-border pt-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Details</h2><Button variant="ghost" onClick={()=>setDetail(null)}>Close</Button></div><RecordDetails row={detail} section={section} /></section>}

    </>}

  </div>;

}

type FileNode = { id:string; name:string; children?:FileNode[] };

function fileTree(files:Record<string,string>) {

  const roots:FileNode[]=[];

  Object.keys(files).sort().forEach(path=>{let nodes=roots; let prefix=""; const parts=path.split("/"); parts.forEach((name,i)=>{prefix+=(prefix?"/":"")+name; let n=nodes.find(n=>n.id===prefix); if(!n){n={id:prefix,name,...(i<parts.length-1?{children:[]}: {})}; nodes.push(n);} if(n.children) nodes=n.children;});});

  return roots;

}

function TreeNode({node,style,dragHandle}:NodeRendererProps<FileNode>) { return <div style={style} ref={dragHandle} className={`px-2 py-1 text-sm truncate cursor-pointer ${node.isSelected?"bg-accent":""}`} onClick={()=>{node.select();if(node.isInternal)node.toggle();}}>{node.isInternal ? node.isOpen ? "▾ " : "▸ " : "· "}{node.data.name}</div>; }

function ProjectEditor({project,channel,revisions,snapshots,onDirty,command,busy}:{project:Project;channel:string;revisions:Row[];snapshots:Row[];onDirty:(dirty:boolean)=>void;command:Command;busy:boolean}) {

  const [files,setFiles]=useState(project.draft);

  const [saved,setSaved]=useState(project.draft);

  const [version,setVersion]=useState(project.draft_version);

  const [selectedPath,setSelectedPath]=useState("main.rhai");

  const [file,setFile]=useState("main.rhai");

  const [open,setOpen]=useState(["main.rhai"]);

  const [result,setResult]=useState<unknown>(null);

  const [context,setContext]=useState('{"event":{"kind":"round_ended"},"state":{},"previous":null,"current_match":{"rounds":[]}}');

  const [entry,setEntry]=useState("on_event");

  const editorRef=useRef<editor.IStandaloneCodeEditor|null>(null);

  const dirty=pretty(files)!==pretty(saved);

  async function save() {const snapshot={...files,[file]:editorRef.current?.getValue()??files[file]};setFiles(snapshot);const response=await command({action:"save",project_id:project.id,version,files:snapshot});setSaved(snapshot);setVersion(Number(response.version));setResult({saved:true});}

  const saveRef=useRef(save); useLayoutEffect(()=>{saveRef.current=save;});
  useEffect(()=>()=>disposeScriptModels(`necko7://${channel}/${project.id}/`),[channel,project.id]);

  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==="s"){e.preventDefault();void saveRef.current().catch(()=>{});}};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener);},[]);

  useEffect(()=>{const listener=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};window.addEventListener("beforeunload",listener);return()=>window.removeEventListener("beforeunload",listener);},[dirty]);

  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);

  useEffect(()=>{const listener=(e:MouseEvent)=>{if(dirty && (e.target as Element).closest("a[href]") && !confirm("Discard unsaved draft changes?")){e.preventDefault();e.stopPropagation();}};document.addEventListener("click",listener,true);return()=>document.removeEventListener("click",listener,true);},[dirty]);

  function renamePath() {

    if(selectedPath==="main.rhai")return;

    const target=prompt("Rename/move selected file or folder",selectedPath); if(!target||target===selectedPath)return;

    const next:Record<string,string>={}; let valid=true;

    Object.entries(files).forEach(([path,content])=>{const renamed=path===selectedPath||path.startsWith(selectedPath+"/")?target+path.slice(selectedPath.length):path;if(!/^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.rhai$/.test(renamed)||next[renamed]!==undefined)valid=false;next[renamed]=content;});

    if(!valid){toast.error("Invalid path or destination already exists");return;}setFiles(next);setOpen(["main.rhai"]);setFile("main.rhai");setSelectedPath(target);

  }

  function deletePath() {if(selectedPath==="main.rhai"||!confirm(`Delete ${selectedPath} and its files?`))return;setFiles(Object.fromEntries(Object.entries(files).filter(([p])=>p!==selectedPath&&!p.startsWith(selectedPath+"/"))));setOpen(["main.rhai"]);setFile("main.rhai");setSelectedPath("main.rhai");}

  function select(path:string) {setSelectedPath(path);setFile(path);setOpen(t=>t.includes(path)?t:[...t,path]);}

  function newFile(folder=false) {const path=prompt(folder?"Folder path":"File path (for example events/kill.rhai)");if(!path)return;const name=folder?`${path}/_folder.rhai`:path;if(!/^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.rhai$/.test(name)||files[name]!==undefined){toast.error("Enter a unique relative .rhai path");return;}setFiles({...files,[name]:folder?"// Folder module\n":""});select(name);}

  const action=(body:Record<string,unknown>)=>void command({project_id:project.id,...body}).then(setResult).catch(error=>setResult({error:isAxiosError(error)?error.response?.data??error.message:String(error)}));

  return <div className="space-y-3">

    <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-sm text-muted-foreground">{project.enabled?"Enabled":"Disabled"} · {project.active_revision?`Live revision ${project.active_revision}`:"Unpublished"} · Draft {version}{dirty?" · Unsaved":""}</span><Button variant="outline" disabled={busy} onClick={()=>{const name=prompt("Project name",project.name);if(name)action({action:"rename",name});}}>Rename</Button><Button variant="outline" disabled={busy} onClick={()=>action({action:"enable",enabled:!project.enabled})}>{project.enabled?"Disable":"Enable"}</Button><Button variant="outline" disabled={busy} onClick={()=>{if(prompt("Delete project and cancel its jobs? Type DELETE") === "DELETE")action({action:"delete",confirmation:"DELETE"});}}>Delete project</Button></div>

    <div className="flex flex-wrap gap-2"><Button disabled={busy||!dirty} onClick={()=>void save().catch(()=>{})}>Save draft</Button><Button variant="outline" disabled={busy||dirty} onClick={()=>action({action:"validate"})}>Validate</Button><Button disabled={busy||dirty} onClick={()=>{if(confirm("Publish this saved draft? Enabled projects will use it for new CS2 events."))action({action:"publish",version});}}>Publish</Button><select aria-label="Revision history" className={inputClass} value="" onChange={e=>{if(e.target.value&&confirm("Activate this revision? Existing timer jobs keep their original revision."))action({action:"rollback",revision:Number(e.target.value)});}}><option value="">Revision history / rollback</option>{revisions.map(r=><option key={String(r.revision)} value={String(r.revision)}>Revision {String(r.revision)} · {String(r.created_at)}</option>)}</select></div>

    {dirty && <p className="text-xs text-muted-foreground">Save the draft before validation, publication or testing.</p>}

    <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] border border-border rounded-lg overflow-hidden">

      <aside className="border-b md:border-r border-border bg-card"><div className="flex flex-wrap p-2 gap-1"><Button size="sm" variant="ghost" onClick={()=>newFile()}>+ File</Button><Button size="sm" variant="ghost" onClick={()=>newFile(true)}>+ Folder</Button><Button size="sm" variant="ghost" onClick={renamePath}>Rename</Button><Button size="sm" variant="ghost" onClick={deletePath}>Delete</Button></div><div className="max-h-44 overflow-auto md:max-h-none"><Tree data={fileTree(files)} width={218} height={370} rowHeight={30} disableDrag disableDrop onSelect={nodes=>{if(nodes[0])setSelectedPath(nodes[0].id);if(nodes[0]?.isLeaf)select(nodes[0].id);}}>{TreeNode}</Tree></div></aside>

      <div className="min-w-0"><div role="tablist" aria-label="Open files" className="flex overflow-x-auto border-b border-border">{open.filter(p=>files[p]!==undefined).map(p=><button role="tab" aria-selected={p===file} key={p} onClick={()=>setFile(p)} className={`px-3 py-2 text-xs whitespace-nowrap ${p===file?"bg-accent":""}`}>{p}{files[p]!==saved[p]?" •":""}</button>)}</div><Editor key={file} keepCurrentModel height="470px" language="rhai" theme="vs-dark" path={`necko7://${channel}/${project.id}/${file}`} defaultValue={files[file]??""} beforeMount={configureScripts} onMount={e=>{editorRef.current=e;if(e.getValue()!==files[file])e.setValue(files[file]??"");}} onChange={value=>setFiles(f=>({...f,[file]:value??""}))} options={{minimap:{enabled:false},fontSize:13,tabSize:4,automaticLayout:true,scrollBeyondLastLine:false,wordWrap:"on",padding:{top:12}}}/></div>

    </div>

    <details><summary className="cursor-pointer text-sm font-medium">Dry Run / Test — no real side effects</summary><div className="space-y-2 pt-3"><select aria-label="Test entrypoint" className={inputClass} value={entry} onChange={e=>setEntry(e.target.value)}><option>on_event</option><option>on_timer</option></select><select aria-label="Recorded event" className={inputClass} value="" onChange={e=>{if(!e.target.value)return;const [snapshot,index]=e.target.value.split(":");void command({action:"snapshot",project_id:project.id,snapshot_id:Number(snapshot),event_index:Number(index)}).then(ctx=>{setContext(pretty(ctx));setEntry("on_event");}).catch(()=>{});}}><option value="">Load recorded CS2 event…</option>{snapshots.flatMap(s=>(Array.isArray(s.events)?s.events:[]).map((event:Record<string,unknown>,i:number)=><option key={`${s.id}:${i}`} value={`${s.id}:${i}`}>{String(s.created_at)} · {String(event.kind)}</option>))}</select><label className="block text-sm">Normalized test context (JSON)<textarea aria-label="Test context" className={`${inputClass} block w-full font-mono mt-1`} rows={5} value={context} onChange={e=>setContext(e.target.value)}/></label><Button disabled={busy||dirty} onClick={()=>{try{action({action:"test",entry,context:JSON.parse(context)});}catch{toast.error("Enter valid JSON");}}}>Run dry test</Button></div></details>

    {result!==null && <section aria-label="Diagnostics" className="border-t border-border pt-3"><h2 className="font-medium">Diagnostics / execution report</h2><Button variant="ghost" size="sm" onClick={()=>{const text=pretty(result);const path=Object.keys(files).find(p=>text.includes(p))??file;select(path);const line=Number(text.match(/line (\d+)/)?.[1]??1);setTimeout(()=>{editorRef.current?.revealLineInCenter(line);editorRef.current?.setPosition({lineNumber:line,column:1});editorRef.current?.focus();},50);}}>Go to diagnostic</Button><pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto mt-2">{pretty(result)}</pre></section>}

  </div>;

}


function RecordDetails({row,section}:{row:Row;section:string}) {
  if(section==="matches") {
    const data=(row.data??{}) as Record<string,unknown>;
    const rounds=Array.isArray(data.rounds)?data.rounds as Record<string,unknown>[]:[];
    const current=data.current_round as Record<string,unknown>|null;
    return <div className="space-y-3 mt-3"><p className="text-sm text-muted-foreground">{String(row.map)} · {row.completed_at?"Completed":"Current match"} · {rounds.length} observed completed rounds. Unknown values are shown as —.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Round</th><th>Side</th><th>Kills</th><th>Health</th><th>Winner</th><th>Details</th></tr></thead><tbody>{[...rounds,...(current&&!current.completed?[current]:[])].map((r,i)=>{const player=(r.player??{}) as Record<string,unknown>;return <tr key={i} className="border-b border-border"><td className="py-2">{String(r.index??"—")}{!r.completed?" (current)":""}</td><td>{String(player.side??"—")}</td><td>{String(player.kills??"—")}</td><td>{String(player.health??"—")}</td><td>{String(r.winner??"—")}</td><td><details><summary className="cursor-pointer text-primary">State / events</summary><pre className="text-xs max-h-64 overflow-auto whitespace-pre-wrap">{pretty(r)}</pre></details></td></tr>;})}</tbody></table></div><details><summary className="cursor-pointer text-sm">Full normalized match</summary><pre className="text-xs max-h-96 overflow-auto whitespace-pre-wrap">{pretty(row)}</pre></details></div>;
  }
  if(section==="logs") {
    const report=(row.report??{}) as Record<string,unknown>;
    const logs=Array.isArray(report.logs)?report.logs as Record<string,unknown>[]:[];
    return <div className="mt-3 space-y-3"><p className="text-sm">{String(row.source)} · {String(row.status)} · {String(report.duration_ms??0)} ms · Execution {row.id}</p>{report.error!=null && <p role="alert" className="text-sm text-destructive whitespace-pre-wrap">{String(report.error)}</p>}{logs.map((log,i)=><p className="text-sm font-mono break-words" key={i}><span className="text-muted-foreground">[{String(log.level)}]</span> {String(log.message)}</p>)}<details open><summary className="cursor-pointer text-sm">Actions and metadata</summary><pre className="text-xs max-h-96 overflow-auto whitespace-pre-wrap break-words">{pretty(row)}</pre></details></div>;
  }
  return <pre className="text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto p-3">{pretty(row)}</pre>;
}
