import { config } from "@/config";

export function scriptingDocsUrl(page = "") {
  const fallback = import.meta.env.DEV ? "http://127.0.0.1:4174/docs/scripting/" : "/docs/scripting/";
  try {
    const url = new URL(config.SCRIPTING_DOCS_URL || fallback, location.origin);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe docs origin");
    url.search = "";
    url.hash = "";
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return new URL(page, url).href;
  } catch {
    return new URL("/docs/scripting/" + page, location.origin).href;
  }
}
