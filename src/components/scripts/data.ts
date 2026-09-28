import { isAxiosError } from "axios";

export type Project = {
  id: string;
  name: string;
  enabled: boolean;
  draft: Record<string, string>;
  draft_version: number;
  active_revision: number | null;
  live_files?: Record<string, string> | null;
};
export type Row = Record<string, unknown> & {
  id?: string;
  project_id?: string;
  status?: string;
  created_at?: string;
};
export type Overview = {
  projects: Project[];
  revisions: Row[];
  jobs: Row[];
  storage: Row[];
  executions: Row[];
  matches: Row[];
  snapshots: Row[];
};
export type Command = (
  data: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export const pretty = (value: unknown) => JSON.stringify(value, null, 2) ?? "";
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
export const text = (value: unknown) =>
  value == null ? "Unknown" : String(value);
export const human = (value: unknown) =>
  value === "cs2"
    ? "CS2"
    : text(value)
        .replaceAll("_", " ")
        .replace(/^./, (c) => c.toUpperCase());
export function errorText(error: unknown) {
  if (!isAxiosError(error)) return String(error);
  const body = object(error.response?.data);
  return text(body.message ?? object(body.error).message ?? error.message);
}
export const projectNameField = (value = "") => ({
  name: "name",
  label: "Project name",
  value,
  validate: (name: string) =>
    !name.trim()
      ? "Enter a project name."
      : new TextEncoder().encode(name.trim()).length > 80
        ? "Use a name of at most 80 bytes."
        : undefined,
});
export const confirmationField = (word: string) => ({
  name: "confirmation",
  label: `Type ${word} to confirm`,
  validate: (value: string) =>
    value !== word ? `Type ${word} to confirm.` : undefined,
});
