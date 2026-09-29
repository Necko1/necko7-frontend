import "./monacoLocale";
import type { Monaco } from "@monaco-editor/react";
import apiReference from "../../docs/api.json";
import { scriptingDocsUrl } from "./scriptingDocs";
import { scriptCompletionOwner } from "./scriptCompletion";
import * as monaco from "monaco-editor/editor/editor.api";
// The slim local API bundle does not register these editor contributions.
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import { loader } from "@monaco-editor/react";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
const docs: Record<string, Record<string, string>> = structuredClone(apiReference.properties);
for (const fn of apiReference.functions) {
  const description = `**\`${fn.signature}\`**\n\n${fn.description}\n\n${fn.behavior}\n\nErrors: ${fn.errors}\n\nDry run: ${fn.dry_run}\n\n[API reference](${scriptingDocsUrl("reference/" + fn.namespace.replaceAll(".", "-") + "#" + (fn.id ?? fn.name))})`;
  const group = docs[fn.namespace] ??= {};
  group[fn.name] = group[fn.name] ? group[fn.name] + "\n\n" + description : description;
}
const builderAliases: Record<string, string> = { filter: "UserFilter", activity_filter: "ActivityFilter", reward_filter: "RewardFilter", message_filter: "MessageFilter" };
for (const [alias, namespace] of Object.entries(builderAliases)) docs[alias] = docs[namespace];
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
    const prefix = model.getValueInRange(new m.Range(Math.max(1, position.lineNumber - 32), 1, position.lineNumber, position.column));
    const owner = scriptCompletionOwner(prefix);
    const namespace = owner ? builderAliases[owner] ?? owner : undefined;
    const staticCall = /::\w*$/.test(prefix);
    const word = model.getWordUntilPosition(position);
    const entries = owner ? docs[owner] ?? {} : Object.fromEntries(Object.keys(docs).filter(k => !k.includes(".")).map(k => [k, `${k} scripting capability`]));
    return { suggestions: Object.entries(entries).flatMap(([label, documentation]) => {
      const references = apiReference.functions.filter(fn => fn.namespace === namespace && fn.name === label);
      if (references.length && !references.some(fn => fn.signature.startsWith(`${namespace}::`) === staticCall)) return [];
      return [{ label, detail: references.length ? references.map(fn => fn.signature).join("; ") : documentation,
        documentation, insertText: owner === "log" && label === "debug" ? 'debug(log, "message")' : label==="match" ? '["match"]' : label,
        kind: m.languages.CompletionItemKind.Method, range: new m.Range(position.lineNumber, owner === "log" && label === "debug" ? Math.max(1,word.startColumn-4) : label==="match" ? Math.max(1,word.startColumn-1) : word.startColumn, position.lineNumber, word.endColumn) }];
    }) };
  } });
  m.languages.registerHoverProvider("rhai", { provideHover(model: monaco.editor.ITextModel, position: monaco.Position) {
    const word = model.getWordAtPosition(position);
    if (!word) return null;
    const prefix = model.getValueInRange(new m.Range(Math.max(1, position.lineNumber - 32), 1, position.lineNumber, word.endColumn));
    const owner = scriptCompletionOwner(prefix);
    const scoped = owner ? docs[owner]?.[word.word] : undefined;
    const found = scoped ? [scoped] : [...new Set(Object.values(docs).map(group => group[word.word]).filter(Boolean))];
    return found.length ? { contents: found.map(value => ({ value })) } : null;
  } });
}

export function disposeScriptModels(prefix:string) { for(const model of monaco.editor.getModels()) if(model.uri.toString().startsWith(prefix))model.dispose(); }
