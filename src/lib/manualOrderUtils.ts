import { isAxiosError } from "axios";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { getCurrencyDivisor, minorToMajor } from "./currency";

export function orderMoney(value: number, currency: string, language: string) {
  return `${minorToMajor(value, currency).toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: getCurrencyDivisor(currency) === 1000 ? 3 : 2 })} ${currency}`;
}
export function orderError(error: unknown, t: TFunction) {
  const message = isAxiosError(error) ? error.response?.data?.error?.message : undefined;
  return typeof message === "string" && t(`manual.errors.${message}`, { defaultValue: "" })
    ? t(`manual.errors.${message}`) : t("manual.errors.generic");
}
export function useDebounced(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const id = setTimeout(() => setSettled(value), 300); return () => clearTimeout(id); }, [value]);
  return settled;
}
export function splitTags(value: string) { return [...new Set(value.split(",").map(v => v.trim()).filter(Boolean))]; }
export function orderDate(value: string | null, language: string) { return value ? new Date(value).toLocaleString(language) : "—"; }
