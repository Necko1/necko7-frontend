import i18n from "@/i18n";
import { isAxiosError } from "axios";
import { scriptCopy, scriptValuesRu } from "@/i18n/scripts";

const t = i18n.t.bind(i18n);

export type Project = {
  id: string;
  name: string;
  enabled: boolean;
  draft: Record<string, string>;
  draft_version: number;
  active_revision: number | null;
  live_files?: Record<string, string> | null;
  execution_timeout_secs?: number;
  host_timeout_secs?: number;
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
  value == null ? t("scripts.unknown") : String(value);
export const human = (value: unknown) => {
  const key = String(value);
  return Object.hasOwn(scriptValuesRu, key)
    ? t(`scripts.values.${key}`)
    : text(value).replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
};
const knownErrors = new Map(Object.entries(scriptCopy).map(([key, copy]) => [copy[0] as string, key]));
export function errorText(error: unknown) {
  const body = isAxiosError(error) ? object(error.response?.data) : {};
  const message = text(body.message ?? object(body.error).message ?? (error instanceof Error ? error.message : error));
  const key = knownErrors.get(message);
  return key ? t(`scripts.${key}`) : message;
}
export const projectNameField = (value = "") => ({
  name: "name",
  label: t("scripts.projectName"),
  value,
  validate: (name: string) =>
    !name.trim()
      ? t("scripts.enterProjectName")
      : new TextEncoder().encode(name.trim()).length > 80
        ? t("scripts.projectNameLimit")
        : undefined,
});
export const confirmationField = (word: string) => ({
  name: "confirmation",
  label: t("scripts.confirmWord", { word }),
  validate: (value: string) =>
    value !== word ? t("scripts.confirmWordError", { word }) : undefined,
});

export const executionLimitFields = (execution = 30, host = 10) => [
  {
    name: "execution_timeout_secs", label: t("scripts.executionTimeout"), value: String(execution),
    inputType: "number" as const, min: 1, max: 120, step: 1,
    description: t("scripts.executionTimeoutHelp"),
    validate: (value: string) => {
      const seconds = Number(value);
      return !Number.isInteger(seconds) || seconds < 1 || seconds > 120 ? t("scripts.executionTimeoutInvalid") : undefined;
    },
  },
  {
    name: "host_timeout_secs", label: t("scripts.hostTimeout"), value: String(host),
    inputType: "number" as const, min: 1, max: 60, step: 1,
    description: t("scripts.hostTimeoutHelp"),
    validate: (value: string, values: Record<string, string>) => {
      const seconds = Number(value);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60) return t("scripts.hostTimeoutInvalid");
      if (seconds > Number(values.execution_timeout_secs)) return t("scripts.hostTimeoutExceedsExecution");
    },
  },
];
