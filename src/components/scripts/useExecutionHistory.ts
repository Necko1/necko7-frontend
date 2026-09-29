import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Row } from "./data";

export type HistoryFilter = {
  search?: string; project_id?: string; status?: string; level?: string;
  source?: string; mode: string; job_id?: string;
};
type Page = { executions: Row[]; total: number; next_cursor: string | null; start_cursor: string; retained_days: number };
export function useExecutionHistory(channel: string, filter: HistoryFilter, enabled: boolean) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(filter.search?.trim() ?? "");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filter.search?.trim() ?? ""), 200);
    return () => clearTimeout(timer);
  }, [filter.search]);
  const params = { ...filter, search };
  const key = JSON.stringify(params);
  const [navigation, setNavigation] = useState<{ key: string; cursors: (string | undefined)[]; index: number }>({ key, cursors: [undefined], index: 0 });
  const frame = navigation.key === key ? navigation : { key, cursors: [undefined], index: 0 };
  const cursor = frame.cursors[frame.index];
  const query = useQuery({
    queryKey: ["script-history", channel, key, cursor],
    queryFn: () => api.get<Page>(`/api/v1/broadcasters/${channel}/scripts/executions`, { params: { ...params, cursor, limit: 50 } }).then(r => r.data),
    enabled,
    retry: 1,
    gcTime: 0,
    refetchInterval: frame.index === 0 && !cursor ? 10000 : false,
  });
  return {
    query, index: frame.index,
    previous: () => setNavigation({ ...frame, index: Math.max(0, frame.index - 1) }),
    next: () => {
      const next = query.data?.next_cursor;
      if (next) setNavigation({ key, cursors: [...(frame.index === 0 ? [query.data?.start_cursor] : frame.cursors.slice(0, frame.index + 1)), next], index: frame.index + 1 });
    },
    refresh: () => {
      setNavigation({ key, cursors: [undefined], index: 0 });
      void qc.invalidateQueries({ queryKey: ["script-history", channel] });
    },
  };
}
