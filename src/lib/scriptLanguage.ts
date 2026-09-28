import type { Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
// The slim local API bundle does not register these editor contributions.
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import { loader } from "@monaco-editor/react";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
const docs: Record<string, Record<string, string>> = {
  rewards: {
    get: "get(alias): Safe reward details or ().",
    set_visible: "set_visible(alias, bool): Changes Twitch visibility only. Does not pause processing or pricing.",
    set_paused: "set_paused(alias, bool): Changes operational pause state.",
    enable_for: "enable_for(alias, Duration): Show a reward temporarily using a persisted timer.",
    trigger: "trigger(alias, user_id): Internal fulfillment. No Twitch redemption or points spent. Bypasses Twitch cooldown/per-stream/user-stream limits; enforces chat requirements, purchase limits and market/inventory rules. Returns {ok, code, fulfillment_id}. Never automatically sends trigger results to chat.",
  },
  storage: { get: "get(key [, default]): Project-scoped persisted JSON value.", set: "set(key, value): Up to 64 KiB/value, 1 MiB/project.", delete: "delete(key): Remove this project's key.", increment: "increment(key, integer): Atomic counter update." },
  scheduler: { after: "after(key, Duration, payload): Durable one-shot job pinned to this revision's on_timer. Replaces a scheduled key, retaining history.", cancel: "cancel(key): Retains cancelled history.", exists: "exists(key): Is a live job present?" },
  chat: { recent_chatters: "recent_chatters(Duration, UserFilter): Safe normalized users, bounded to 1000; windows at least one minute.", user_stats: "user_stats(user_id, Duration): Message/character counts and first/last activity.", send: "send(message): Send up to 500 characters; 3 calls per execution.", reply: "reply(message_id, message): Reply to a Twitch chat message." },
  users: { recent_chatters: "recent_chatters(Duration, UserFilter): Same normalized query as chat.", user_stats: "user_stats(user_id, Duration): Channel activity." },
  random: { pick: "pick(array): Random element; () if empty." },
  log: { debug: "debug(message): Script execution log.", info: "info(message): Script execution log.", warn: "warn(message): Script warning.", error: "error(message): Script error log." },
  ctx: { event: "Semantic CS2 event (on_event only).", state: "Normalized state AFTER this payload.", previous: "Normalized state BEFORE this payload; () if unavailable.", current_match: "Shared normalized match and ordered rounds.", meta: "Execution/project/revision/channel identifiers. No secrets.", timer: "Timer key, payload and scheduling metadata (on_timer only)." },
  "ctx.state": { player: "Known local player only, never spectator target data.", round: "Round phase, completed_rounds and known winner.", match: "Map, mode, phase and side scores. Native Rhai access: ctx.state[\"match\"].", game: "Normalized provider metadata.", view: "Observed identity and activity." },
  "ctx.state.player": Object.fromEntries(["steam_id", "team", "health", "armor", "helmet", "defuse_kit", "money", "equipment_value", "flash", "smoke", "burning", "match_stats", "round_stats", "weapons"].map(k => [k, `Observed ${k}; () means unknown.`])),
  "ctx.current_match": { rounds: "Completed observed rounds in order; gaps are not filled with invented values.", current_round: "Latest observed round record.", last_rounds: "last_rounds(n): Last n completed observed rounds." },
  "ctx.event": { kind: "Stable semantic event kind; route events with switch.", source_seq: "Signed observation sequence, shared by events from this payload." },
  "ctx.timer": { key: "Project-local job key.", payload: "Persisted JSON payload from scheduler.after.", scheduled_for: "Original due time.", creating_revision: "Pinned published revision." },
  "ctx.meta": { project_id: "Project UUID.", channel_id: "Channel Twitch ID.", revision: "Published revision number.", execution_id: "Audit correlation UUID.", timestamp: "Execution timestamp.", source: "Source metadata, including CS2 sequence/session when available." },
  result: { ok: "Whether fulfillment was admitted successfully. Delivery can still be pending.", code: "Stable rejection code, e.g. activity_requirement_failed, purchase_limit_reached, market_unavailable, trigger_rate_limit.", fulfillment_id: "Internal fulfillment UUID. SCRIPT has no Twitch redemption ID.", inventory_item_id: "Created inventory item UUID when available.", selected_item: "Selected item name.", origin: "SCRIPT", retry_after: "Retry delay in seconds, when supplied." },
  r: { player: "Known local player round stats.", index: "Observed round ordering.", winner: "Known winning side or ().", score_before: "Observed starting scores.", score_after: "Observed ending scores.", start: "Initial observed player state.", end: "Latest observed player state." },
  "r.player": { kills: "Observed round kills, () if unknown.", headshot_kills: "Observed round headshot kills.", side: "Observed team.", health: "Latest observed health.", match_stats: "Cumulative match counters; these are not per-round assists or damage." },
  filter: { min_messages: "min_messages(n): Minimum observed messages.", min_characters: "min_characters(n): Minimum observed characters.", reward_redemptions: "reward_redemptions(RewardFilter): Combine with reward activity." },
  reward_filter: { reward: "reward(alias)", statuses: "statuses([domain_status]): PENDING, MANUAL_HOLD, ORDER_CREATED, COMPLETED, FAILED_REFUND, FAILED_PENALTY.", min_count: "min_count(n)", during: "during(Duration): At least one minute." },
  Duration: Object.fromEntries(["from_secs", "from_mins", "from_hours", "from_days", "from_weeks"].map(k => [k, `${k}(positive_integer): Explicit duration, up to one year.`])),
  UserFilter: { create: "create(): Extensible user filter. Chain min_messages, min_characters and reward_redemptions." },
  RewardFilter: { create: "create(): Chain reward(alias), statuses([...]), min_count(n), during(Duration)." },
};
let installed = false;
export function configureScripts(m: Monaco) {
  if (installed) return;
  installed = true;
  m.languages.register({ id: "rhai" });
  m.languages.setMonarchTokensProvider("rhai", { tokenizer: { root: [
    [/\/\/.*$/, "comment"], [/\/\*/, "comment", "@comment"], [/"([^"\\]|\\.)*"/, "string"], [/`[^`]*`/, "string"],
    [/\b(fn|let|const|if|else|switch|for|in|while|loop|break|continue|return|import|as|true|false|throw|try|catch)\b/, "keyword"], [/\b\d+(\.\d+)?\b/, "number"], [/[a-zA-Z_]\w*/, "identifier"],
  ], comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]] } });
  m.languages.setLanguageConfiguration("rhai", { comments: { lineComment: "//", blockComment: ["/*", "*/"] }, brackets: [["{", "}"], ["[", "]"], ["(", ")"]], autoClosingPairs: [{ open: "{", close: "}" }, { open: "(", close: ")" }, { open: "[", close: "]" }, { open: '"', close: '"' }] });
  m.languages.registerCompletionItemProvider("rhai", { triggerCharacters: [".", ":"], provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
    const prefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
    const owner = prefix.match(/([\w.]+)(?:\.|::)\w*$/)?.[1];
    const word = model.getWordUntilPosition(position);
    const entries = owner ? docs[owner] ?? {} : Object.fromEntries(Object.keys(docs).filter(k => !k.includes(".")).map(k => [k, `${k} scripting capability`]));
    return { suggestions: Object.entries(entries).map(([label, detail]) => ({ label, detail, documentation: detail, insertText: label==="match" ? '["match"]' : label, kind: m.languages.CompletionItemKind.Method, range: new m.Range(position.lineNumber, label==="match" ? Math.max(1,word.startColumn-1) : word.startColumn, position.lineNumber, word.endColumn) })) };
  } });
  m.languages.registerHoverProvider("rhai", { provideHover(model: monaco.editor.ITextModel, position: monaco.Position) {
    const word = model.getWordAtPosition(position)?.word;
    if (!word) return null;
    const found = Object.values(docs).map(group => group[word]).filter(Boolean);
    return found.length ? { contents: found.map(value => ({ value })) } : null;
  } });
}

export function disposeScriptModels(prefix:string) { for(const model of monaco.editor.getModels()) if(model.uri.toString().startsWith(prefix))model.dispose(); }
