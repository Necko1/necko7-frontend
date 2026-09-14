import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { chatApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, EmptyState, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChatDashboardWidget from "@/components/chat/ChatDashboardWidget";
export default function ChatPage() {
  const c = useCopy();
  const id = useAppStore((s) => s.selectedBroadcasterId) || "";
  const [params, setParams] = useSearchParams();
  const hours =
    params.get("hours") === "all" ? null : Number(params.get("hours")) || 168;
  const sort = params.get("sort") === "characters" ? "characters" : "messages";
  const page = Math.max(0, Number(params.get("page")) || 0);
  const search = params.get("search") || "";
  const [draft, setDraft] = useState(search);
  const set = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("page");
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  const query = useQuery({
    queryKey: ["leaderboard", id, hours, sort, search, page],
    queryFn: () =>
      chatApi
        .getLeaderboard(id, {
          time_window_hours: hours,
          sort_by: sort,
          order: "desc",
          search: search || null,
          offset: page * 25,
          limit: 25,
        })
        .then((r) => r.data),
    enabled: !!id,
  });
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow={c("Community", "Сообщество")}
        title={c("Chat activity", "Активность чата")}
        description={c(
          "Understand when your channel is active and which viewers participate.",
          "Посмотрите, когда канал активен и кто участвует в чате.",
        )}
        actions={
          <Link to="/chat">
            {c("Open message history", "Открыть историю сообщений")} →
          </Link>
        }
      />
      <nav
        className="context-tabs"
        aria-label={c("Analysis period", "Период анализа")}
      >
        {[
          [24, "24h"],
          [168, "7d"],
          [720, "30d"],
          [null, c("All time", "Всё время")],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            aria-current={hours === value ? "true" : undefined}
            onClick={() => set("hours", value == null ? "all" : String(value))}
          >
            {label}
          </button>
        ))}
      </nav>
      <ChatDashboardWidget channelId={id} compact={false} hours={hours} />
      <section className="space-y-4">
        <div className="section-heading">
          <h2>{c("Participating viewers", "Участники чата")}</h2>
          <span className="text-xs text-muted-foreground">
            {query.data?.total ?? "…"} {c("viewers", "зрителей")}
          </span>
        </div>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            set("search", draft.trim());
          }}
        >
          <Input
            aria-label={c("Find a viewer", "Найти зрителя")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={c("Find a viewer…", "Найти зрителя…")}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            {c("Search", "Найти")}
          </Button>
          <label className="flex gap-2 items-center text-sm">
            {c("Rank by", "Рейтинг по")}
            <select value={sort} onChange={(e) => set("sort", e.target.value)}>
              <option value="messages">{c("Messages", "Сообщения")}</option>
              <option value="characters">{c("Characters", "Символы")}</option>
            </select>
          </label>
        </form>
        {query.isError ? (
          <QueryError onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <Skeleton className="h-48" />
        ) : !query.data.items.length ? (
          <EmptyState title={c("No viewers match", "Зрители не найдены")} />
        ) : (
          <div className="participant-table">
            <div className="participant-head">
              <span>#</span>
              <span>{c("Viewer", "Зритель")}</span>
              <span>{c("Messages", "Сообщения")}</span>
              <span>{c("Characters", "Символы")}</span>
              <span>{c("Last active", "Последняя активность")}</span>
            </div>
            {query.data.items.map((viewer, index) => (
              <Link
                key={viewer.chatter_user_id}
                to={`/chat/users/${viewer.chatter_user_id}`}
              >
                <span>{search ? "—" : page * 25 + index + 1}</span>
                <strong>@{viewer.chatter_user_login}</strong>
                <span>{viewer.message_count.toLocaleString()}</span>
                <span>{viewer.char_count.toLocaleString()}</span>
                <time>
                  {new Date(viewer.last_seen_at).toLocaleDateString()}
                </time>
              </Link>
            ))}
          </div>
        )}
        <div className="history-toolbar">
          <Button
            variant="outline"
            disabled={!page || query.isFetching}
            onClick={() =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("page", String(page - 1));
                return next;
              })
            }
          >
            {c("Previous", "Назад")}
          </Button>
          <span>{page + 1}</span>
          <Button
            variant="outline"
            disabled={
              query.isFetching ||
              !query.data ||
              (page + 1) * 25 >= query.data.total
            }
            onClick={() =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("page", String(page + 1));
                return next;
              })
            }
          >
            {c("Next", "Далее")}
          </Button>
        </div>
      </section>
    </div>
  );
}
