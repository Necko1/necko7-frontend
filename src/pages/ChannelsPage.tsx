import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { authApi, broadcastersApi, redemptionsApi } from "@/lib/apiClient";
import type { BroadcasterListItem } from "@/types/api";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, EmptyState, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function WorkspaceRow({ channel }: { channel: BroadcasterListItem }) {
  const c = useCopy();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { selectedBroadcasterId, setSelectedBroadcasterId } = useAppStore();
  const [inspect, setInspect] = useState(false);
  const viewer = channel.role.toUpperCase() === "VIEWER";
  const selected = channel.channel_id === selectedBroadcasterId;
  const settings = useQuery({
    queryKey: ["settings", channel.channel_id],
    queryFn: () =>
      broadcastersApi.getSettings(channel.channel_id).then((r) => r.data),
    enabled: inspect && !viewer,
    staleTime: 30_000,
  });
  const holds = useQuery({
    queryKey: ["redemptions", channel.channel_id, "workspace-holds"],
    queryFn: () =>
      redemptionsApi
        .list(channel.channel_id, { status: "MANUAL_HOLD", limit: 1 })
        .then((r) => r.data),
    enabled: inspect && !viewer,
    staleTime: 15_000,
  });
  const unpin = useMutation({
    mutationFn: () => broadcastersApi.unpin(channel.channel_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasters"] }),
  });
  const select = (path?: string) => {
    setSelectedBroadcasterId(channel.channel_id);
    navigate(path || (viewer ? `/c/${channel.channel_login}` : "/dashboard"));
  };
  return (
    <article className="workspace-row" data-current={selected}>
      <div className="workspace-row-main">
        <button
          className="workspace-choice"
          onClick={() => select()}
          aria-current={selected ? "true" : undefined}
        >
          <span className="workspace-avatar">
            {channel.profile_image_url ? (
              <img src={channel.profile_image_url} alt="" />
            ) : (
              channel.channel_login.slice(0, 2).toUpperCase()
            )}
          </span>
          <span className="min-w-0">
            <strong>{channel.display_name || channel.channel_login}</strong>
            <small>@{channel.channel_login}</small>
          </span>
          <span className="workspace-choice-action">
            {selected
              ? c("Current workspace", "Текущий канал")
              : viewer
                ? c("Open catalog", "Открыть каталог")
                : c("Switch workspace", "Перейти в канал")}{" "}
            →
          </span>
        </button>
        {viewer ? (
          <Button
            variant="ghost"
            disabled={unpin.isPending}
            onClick={() => unpin.mutate()}
          >
            {c("Unpin", "Открепить")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            aria-expanded={inspect}
            onClick={() => setInspect(!inspect)}
          >
            {c("Setup & attention", "Настройка и проверка")}
          </Button>
        )}
      </div>
      {inspect && !viewer && (
        <div className="workspace-inspect">
          {settings.isError || holds.isError ? (
            <QueryError
              onRetry={() => {
                settings.refetch();
                holds.refetch();
              }}
            />
          ) : settings.isPending || holds.isPending ? (
            <p>{c("Checking channel…", "Проверка канала…")}</p>
          ) : (
            <>
              <span>
                {settings.data.is_active
                  ? c("Bot enabled", "Бот включён")
                  : c("Bot disabled", "Бот выключен")}
              </span>
              <span>
                {settings.data.market_api_key_set
                  ? c("Market key stored", "Ключ маркета сохранён")
                  : c("Market key missing", "Ключ маркета не настроен")}
              </span>
              <button
                className="text-amber-300"
                onClick={() => select("/redemptions?status=MANUAL_HOLD")}
              >
                {holds.data.total} {c("need review", "требуют проверки")} →
              </button>
              <button
                onClick={() =>
                  select(`/broadcasters/${channel.channel_id}/settings`)
                }
              >
                {c("Open settings", "Настройки")} →
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function ChannelsPage() {
  const c = useCopy();
  const { broadcasters } = useAppStore();
  const [search, setSearch] = useState("");
  const groups = [
    {
      role: "OWNER",
      title: c("Your channel", "Ваш канал"),
      detail: c(
        "You manage the bot and editor access.",
        "Вы управляете ботом и доступом редакторов.",
      ),
    },
    {
      role: "EDITOR",
      title: c("Channels you operate", "Каналы под вашим управлением"),
      detail: c(
        "Editor access to rewards, purchases and bot settings.",
        "Доступ редактора к наградам, покупкам и настройкам.",
      ),
    },
    {
      role: "VIEWER",
      title: c("Pinned channels", "Закреплённые каналы"),
      detail: c(
        "Reward catalogs you follow as a viewer.",
        "Каталоги наград, которые вы просматриваете как зритель.",
      ),
    },
  ];
  const filtered = broadcasters.filter((b) =>
    `${b.channel_login} ${b.display_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <div className="page-shell space-y-7">
      <PageHeader
        eyebrow={c("Workspaces", "Каналы")}
        title={c("Choose your channel", "Выберите канал")}
        description={c(
          "Switch operational context or browse the channels you follow.",
          "Переключите рабочий канал или откройте каталог наград.",
        )}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = authApi.connectUrl();
            }}
          >
            {c("Connect your Twitch channel", "Подключить канал Twitch")}
          </Button>
        }
      />
      <Input
        type="search"
        aria-label={c("Find a channel", "Найти канал")}
        placeholder={c("Find a channel by name…", "Поиск канала по имени…")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-lg"
      />
      {groups.map((group) => {
        const items = filtered.filter(
          (b) => b.role.toUpperCase() === group.role,
        );
        if (!items.length) return null;
        return (
          <section key={group.role} className="workspace-group">
            <div>
              <h2 className="section-title">
                {group.title} <small>{items.length}</small>
              </h2>
              <p className="text-sm text-muted-foreground">{group.detail}</p>
            </div>
            <div>
              {items.map((channel) => (
                <WorkspaceRow channel={channel} key={channel.channel_id} />
              ))}
            </div>
          </section>
        );
      })}
      {!filtered.length && (
        <EmptyState
          title={c("No matching channels", "Каналы не найдены")}
          description={c(
            "Try another name or connect your Twitch channel.",
            "Попробуйте другое имя или подключите Twitch.",
          )}
          action={
            search ? (
              <Button variant="ghost" onClick={() => setSearch("")}>
                {c("Clear search", "Сбросить поиск")}
              </Button>
            ) : undefined
          }
        />
      )}
      <Link className="text-sm text-muted-foreground" to="/me">
        {c("Your profile across all channels", "Ваш профиль на всех каналах")} →
      </Link>
    </div>
  );
}
