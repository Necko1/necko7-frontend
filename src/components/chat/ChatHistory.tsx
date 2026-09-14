import { useState } from "react";
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

export function MessageStream({
  messages,
  search = "",
  onFilter,
}: {
  messages: ChatMessage[];
  search?: string;
  onFilter?: (login: string) => void;
}) {
  const c = useCopy();
  return (
    <ol className="message-stream">
      {messages.map((message, index) => {
        const day = new Date(message.sent_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        const startDay =
          index === 0 ||
          new Date(messages[index - 1].sent_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) !== day;
        const previous = messages[index - 1];
        const continuation =
          !startDay &&
          previous?.chatter_user_id === message.chatter_user_id &&
          Math.abs(Date.parse(previous.sent_at) - Date.parse(message.sent_at)) <
            120_000;
        return (
          <li key={message.message_id || message.id}>
            {startDay && <div className="message-day">{day}</div>}
            <article className="message-entry" data-continuation={continuation}>
              <time title={new Date(message.sent_at).toLocaleString()}>
                {new Date(message.sent_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
              <div className="min-w-0">
                {!continuation && (
                  <div className="message-author">
                    <Link to={`/chat/users/${message.chatter_user_id}`}>
                      @{message.chatter_user_login}
                    </Link>
                    {message.chatter_user_id === message.broadcaster_id && (
                      <small>{c("Streamer", "Стример")}</small>
                    )}
                    {onFilter && (
                      <button
                        onClick={() => onFilter(message.chatter_user_login)}
                        aria-label={c(
                          `Filter messages by ${message.chatter_user_login}`,
                          `Сообщения ${message.chatter_user_login}`,
                        )}
                      >
                        ↳ {c("Only this viewer", "Только этот зритель")}
                      </button>
                    )}
                  </div>
                )}
                <p className="message-body">
                  {message.message_text ? (
                    <MessageText text={message.message_text} search={search} />
                  ) : (
                    c(
                      "Message content unavailable",
                      "Содержимое сообщения недоступно",
                    )
                  )}
                </p>
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
        <label>
          <span>{c("Period", "Период")}</span>
          <select
            value={hours || ""}
            onChange={(e) => update({ hours: e.target.value })}
          >
            <option value="">{c("All time", "За всё время")}</option>
            <option value="24">24h</option>
            <option value="168">7d</option>
            <option value="720">30d</option>
          </select>
        </label>
        <Button type="submit">{c("Search", "Найти")}</Button>
      </form>
      <div className="history-toolbar">
        <span>
          {query.data
            ? `${query.data.total.toLocaleString()} ${c("messages", "сообщений")}`
            : "…"}{" "}
          · {c("Newest first", "Сначала новые")}
          {q && <span className="ml-2">{c("Matching", "Поиск")}: “{q}”</span>}
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
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
            {page > 0 && live
              ? c(
                  "Updates paused on older pages",
                  "Обновления приостановлены на старых страницах",
                )
              : c("Follow latest", "Следить за новыми")}
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
          messages={query.data.items}
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
