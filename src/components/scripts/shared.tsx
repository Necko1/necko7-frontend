import type { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { human, pretty } from "./data";

export function Time({ value }: { value: unknown }) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? (
    <span>Unknown time</span>
  ) : (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </time>
  );
}
export function StatusBadge({ value }: { value: unknown }) {
  return (
    <Badge
      className="rounded-sm"
      variant={
        ["failed", "error", "interrupted"].includes(String(value))
          ? "destructive"
          : ["success", "active", "enabled", "completed"].includes(
                String(value),
              )
            ? "default"
            : "outline"
      }
    >
      {human(value)}
    </Badge>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      disabled={disabled}
      items={options}
    >
      <SelectTrigger aria-label={label} className="max-w-full min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="w-max min-w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] rounded-lg"
      >
        {options.map((o) => (
          <SelectItem className="rounded-sm [&>span:first-child]:min-w-0 [&>span:first-child]:shrink [&>span:first-child]:whitespace-normal [&>span:first-child]:break-words" key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Filters({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="script-filter">
      <span>{label}</span>
      {["", ...options].map((v) => (
        <button
          type="button"
          aria-pressed={value === v}
          key={v}
          onClick={() => onChange(v)}
        >
          {v ? human(v) : "All"}
        </button>
      ))}
    </div>
  );
}
export function Raw({
  value,
  label = "Raw data",
}: {
  value: unknown;
  label?: string;
}) {
  return (
    <details className="script-raw">
      <summary>{label}</summary>
      <pre>{pretty(value)}</pre>
    </details>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="script-empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
