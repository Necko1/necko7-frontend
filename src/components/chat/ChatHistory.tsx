import Segments from "@/components/common/Segments";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { chatApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@/types/api";

function MessageText({ text, search }: { text: string; search: string }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
        if (/^https?:\/\//.test(part))
          return (
            <a key={index} href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          );
        if (!search) return part;
        const at = part.toLowerCase().indexOf(search.toLowerCase());
        return at < 0 ? (
          part
        ) : (
          <span key={index}>
            {part.slice(0, at)}
            <mark>{part.slice(at, at + search.length)}</mark>
            {part.slice(at + search.length)}
          </span>
        );
      })}
    </>
  );
}

const authorPalette = [
  "#d6eb98",
  "#91cbe3",
  "#e3b48f",
  "#c8acf0",
  "#89d6be",
  "#edabc6",
];
function authorColor(identity: string) {
  let hash = 0;
  for (const letter of identity)
    hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return authorPalette[hash % authorPalette.length];
}
export function MessageStream({
  messages,
  search = "",
  onFilter,
  groupConsecutive = true,
}: {
  messages: ChatMessage[];
  search?: string;
  onFilter?: (login: string) => void;
  groupConsecutive?: boolean;
}) {
  const c = useCopy();
  return (
    <ol className="conversation-stream message-stream">
      {messages.map((message, index) => {
        const date = new Date(message.sent_at);
        const previous = messages[index - 1];
        const startDay =
          !previous ||
          new Date(previous.sent_at).toDateString() !== date.toDateString();
        const continuation =
          groupConsecutive &&
          !startDay &&
          previous?.chatter_user_id === message.chatter_user_id &&
          Math.abs(Date.parse(previous.sent_at) - date.getTime()) < 120000;
        return (
          <li key={message.message_id || message.id}>
            {startDay && (
              <div className="message-day">
                {date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
            <article
              className="conversation-line"
              data-continuation={continuation}
            >
              <time dateTime={message.sent_at} title={date.toLocaleString()}>
                {date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </time>
              <div className="conversation-content">
                {continuation ? (
                  <span className="sr-only">
                    {message.chatter_user_login}:{" "}
                  </span>
                ) : (
                  <span
                    className="conversation-author"
                    style={{ color: authorColor(message.chatter_user_id) }}
                  >
                    <Link to={`/chat/users/${message.chatter_user_id}`}>
                      @{message.chatter_user_login}
                    </Link>
                    {message.chatter_user_id === message.broadcaster_id && (
                      <small>{c("Streamer", "Стример")}</small>
                    )}
                    {onFilter && (
                      <button
                        type="button"
                        className="author-filter"
                        onClick={() => onFilter(message.chatter_user_login)}
                        title={c("Filter this author", "Фильтр по автору")}
                        aria-label={c(
                          `Filter messages by ${message.chatter_user_login}`,
                          `Сообщения ${message.chatter_user_login}`,
                        )}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M2 3h12L9 8v5l-2-1V8Z" />
                        </svg>
                      </button>
                    )}
                    <span aria-hidden="true" className="author-colon">
                      :{" "}
                    </span>
                  </span>
                )}
                <span className="message-body">
                  {message.message_text ? (
                    <MessageText text={message.message_text} search={search} />
                  ) : (
                    <em>
                      {c(
                        "Message content unavailable",
                        "Содержимое сообщения недоступно",
                      )}
                    </em>
                  )}
                </span>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export default function ChatHistory(props: {
  channelId: string;
  userId?: string;
  compact?: boolean;
}) {
  const [params] = useSearchParams();
  return (
    <ChatHistoryView
      key={`${props.channelId}:${props.userId || ""}:${params.get("q") || ""}:${params.get("chatter") || ""}`}
      {...props}
    />
  );
}

function ChatHistoryView({
  channelId,
  userId,
  compact = false,
}: {
  channelId: string;
  userId?: string;
  compact?: boolean;
}) {
  const c = useCopy();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [login, setLogin] = useState(params.get("chatter") || "");
  const [live, setLive] = useState(false);
  const liveStatusId = useId();
  const page = Math.max(0, Number(params.get("chatPage")) || 0);
  const hours = Number(params.get("hours")) || null;
  const q = params.get("q") || "";
  const chatter = params.get("chatter") || "";
  const pageSize = compact ? 20 : 50;
  const update = (values: Record<string, string>) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("chatPage");
      for (const [key, value] of Object.entries(values))
        if (value) next.set(key, value);
        else next.delete(key);
      return next;
    });
  const query = useQuery({
    queryKey: ["chat-history", channelId, userId, q, chatter, hours, page],
    queryFn: () =>
      chatApi
        .getChannelMessages(channelId, {
          user_id: userId,
          search: q || null,
          chatter_login: userId ? null : chatter || null,
          time_window_hours: hours,
          limit: pageSize,
          offset: page * pageSize,
        })
        .then((r) => r.data),
    enabled: !!channelId,
    refetchInterval: live && page === 0 ? 10_000 : false,
  });
  return (
    <section className="space-y-4">
      <form
        className="chat-search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: search.trim(), chatter: login.replace(/^@/, "").trim() });
        }}
      >
        <label>
          <span>{c("Message text", "Текст сообщения")}</span>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c("Search this history…", "Поиск в истории…")}
          />
        </label>
        {!userId && (
          <label>
            <span>{c("Viewer login", "Логин зрителя")}</span>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="@login"
            />
          </label>
        )}
        <Button type="submit">{c("Search", "Найти")}</Button>
      </form>
      <div className="chat-reading-controls">
        <Segments
          label={c("Period", "Период")}
          value={String(hours || "")}
          options={[
            { value: "", label: c("All time", "Всё время") },
            { value: "24", label: "24h" },
            { value: "168", label: "7d" },
            { value: "720", label: "30d" },
          ]}
          onChange={(value) => update({ hours: value })}
        />
        <Segments
          label={c("Read this page", "Порядок на странице")}
          value={params.get("direction") || "desc"}
          options={[
            { value: "desc", label: c("Newest first", "Сначала новые") },
            { value: "asc", label: c("Oldest first", "Сначала старые") },
          ]}
          onChange={(value) =>
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("direction", value);
              return next;
            })
          }
        />
      </div>
      <div className="history-toolbar">
        <span>
          {query.data
            ? `${query.data.total.toLocaleString()} ${c("messages", "сообщений")}`
            : "…"}{" "}
          ·{" "}
          {params.get("direction") === "asc"
            ? c("Oldest first on this page", "Сначала старые на этой странице")
            : c("Newest first", "Сначала новые")}
          {q && (
            <span className="ml-2">
              {c("Matching", "Поиск")}: “{q}”
            </span>
          )}
        </span>
        <div className="flex gap-3 items-center">
          {(q || chatter || hours) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setLogin("");
                update({ q: "", chatter: "", hours: "" });
              }}
            >
              {c("Clear filters", "Сбросить фильтры")}
            </Button>
          )}
          <label className="intentional-toggle">
            <input
              type="checkbox"
              role="switch"
              aria-describedby={liveStatusId}
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
            {c("Follow latest", "Следить за новыми")}
          </label>
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            {c("Refresh", "Обновить")}
          </Button>
        </div>
      </div>
      <div className="chat-live-status" data-paused={live && page > 0}>
        <span id={liveStatusId} role="status">
          {!live
            ? c(
                "Manual refresh · automatic updates are off",
                "Ручное обновление · автообновление выключено",
              )
            : page > 0
              ? c(
                  "Paused while reading older messages. Resumes on the latest page.",
                  "Пауза при чтении старых сообщений. Обновления продолжатся на последней странице.",
                )
              : c(
                  "Live · checks for new messages every 10 seconds",
                  "Включено · проверка новых сообщений каждые 10 секунд",
                )}
        </span>
        {live && page > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.delete("chatPage");
                return next;
              })
            }
          >
            {c("Return to latest", "К новым сообщениям")} ↑
          </Button>
        )}
      </div>
      {query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-48" />
      ) : !query.data.items.length ? (
        <EmptyState
          title={c("No messages in this view", "Сообщений не найдено")}
          description={c(
            "Try a wider period or clear the filters.",
            "Выберите больший период или сбросьте фильтры.",
          )}
        />
      ) : (
        <MessageStream
          groupConsecutive={!userId && !chatter && !q}
          messages={
            params.get("direction") === "asc"
              ? [...query.data.items].reverse()
              : query.data.items
          }
          search={q}
          onFilter={
            userId
              ? undefined
              : (value) => {
                  setLogin(value);
                  update({ chatter: value });
                }
          }
        />
      )}
      <div className="history-toolbar">
        <Button
          variant="outline"
          disabled={page === 0 || query.isFetching}
          onClick={() =>
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("chatPage", String(page - 1));
              return next;
            })
          }
        >
          {c("Newer", "Новее")}
        </Button>
        <span>
          {c("Page", "Страница")} {page + 1}
        </span>
        <Button
          variant="outline"
          disabled={
            query.isFetching ||
            !query.data ||
            (page + 1) * pageSize >= query.data.total
          }
          onClick={() =>
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("chatPage", String(page + 1));
              return next;
            })
          }
        >
          {c("Older", "Раньше")}
        </Button>
      </div>
    </section>
  );
}
