export type FileNode = {
  id: string;
  name: string;
  children?: FileNode[];
  dirty?: boolean;
};
export const isFolderMarker = (path: string, content: string) =>
  path.endsWith("/_folder.rhai") && /^\s*(?:\/\/[^\n]*\n?\s*)*$/.test(content);
export function validPath(path: string) {
  return (
    path.length <= 180 &&
    path.endsWith(".rhai") &&
    path.split("/").every((part) => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part))
  );
}
export function fileTree(
  files: Record<string, string>,
  saved: Record<string, string>,
) {
  const roots: FileNode[] = [];
  Object.keys(files)
    .sort()
    .forEach((path) => {
      let nodes = roots;
      let prefix = "";
      const parts = path.split("/");
      parts.forEach((name, i) => {
        if (i === parts.length - 1 && isFolderMarker(path, files[path])) return;
        prefix += (prefix ? "/" : "") + name;
        let node = nodes.find((n) => n.id === prefix);
        if (!node) {
          node = {
            id: prefix,
            name,
            ...(i < parts.length - 1 ? { children: [] } : {}),
            dirty: files[path] !== saved[path],
          };
          nodes.push(node);
        }
        if (node.children) nodes = node.children;
      });
    });
  return roots;
}
export function movePaths(
  files: Record<string, string>,
  moves: { from: string; to: string }[],
) {
  if (
    moves.some((m) => m.from === "main.rhai" || m.to.startsWith(m.from + "/"))
  )
    throw new Error(
      "The entry file must stay at the root, and folders cannot move inside themselves.",
    );
  const next: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const move = moves.find(
      (m) => path === m.from || path.startsWith(m.from + "/"),
    );
    const renamed = move ? move.to + path.slice(move.from.length) : path;
    if (!validPath(renamed) || next[renamed] !== undefined)
      throw new Error(
        "Use a unique relative path with letters, numbers, underscores or dashes.",
      );
    next[renamed] = content;
  }
  const paths = Object.keys(next);
  if (paths.some((p) => paths.some((other) => other.startsWith(p + "/"))))
    throw new Error("A file and folder cannot share the same path.");
  return next;
}
