import api from "../../docs/api.json" with { type: "json" };

const builders = new Set(["UserFilter", "ActivityFilter", "MessageFilter", "RewardFilter"]);

// Bounded syntactic help for native builder chains, not a Rhai type checker.
// Quoted text stays a single token so parentheses in patterns cannot change the receiver.
export function scriptCompletionOwner(prefix: string): string | undefined {
  const suffix = prefix.match(/(?:\.|::)\w*$/);
  if (!suffix || suffix.index === undefined) return undefined;
  const receiver = prefix.slice(0, suffix.index).slice(-8192);
  const tokens = receiver.match(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[a-zA-Z_]\w*|::|[^\s]/g)
    ?.filter(token => !token.startsWith("//") && !token.startsWith("/*")) ?? [];
  function resolve(end: number, depth = 0): string | undefined {
    if (end < 0 || depth > 32) return undefined;
    if (tokens[end] === ")") {
      let level = 1, open = end - 1;
      for (; open >= 0; open--) {
        if (tokens[open] === ")") level++;
        if (tokens[open] === "(" && --level === 0) break;
      }
      if (open < 3) return undefined;
      const name = tokens[open - 1];
      const separator = tokens[open - 2];
      const owner = separator === "::" ? tokens[open - 3]
        : separator === "." ? resolve(open - 3, depth + 1) : undefined;
      return owner && builders.has(owner) && api.functions.some(fn => fn.namespace === owner && fn.name === name && fn.returns === owner && fn.signature.startsWith(`${owner}::`) === (separator === "::"))
        ? owner : undefined;
    }
    if (!/^\w+$/.test(tokens[end] ?? "")) return undefined;
    let owner = tokens[end];
    while (end >= 2 && tokens[end - 1] === "." && /^\w+$/.test(tokens[end - 2])) {
      owner = tokens[end - 2] + "." + owner;
      end -= 2;
    }
    return owner;
  }
  return resolve(tokens.length - 1);
}
