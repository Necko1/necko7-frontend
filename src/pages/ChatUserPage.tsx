import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { chatApi, redemptionsApi } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { useCopy } from "@/lib/useCopy";
import { PageHeader, QueryError } from "@/components/common/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ViewerLimits } from "@/components/profiles/ViewerHistory";
import RedemptionList from "@/components/redemptions/RedemptionList";
import ChatHistory from "@/components/chat/ChatHistory";
export default function ChatUserPage() {
  const c = useCopy();
  const { userId = "" } = useParams();
  const channel = useAppStore((s) => s.getSelectedBroadcaster());
  const id = channel?.channel_id || "";
  const [params, setParams] = useSearchParams();
  const tab = params.get("view") || "redemptions";
  const status = params.get("state") || "";
  const identity = useQuery({
    queryKey: ["userStats", id, userId, null],
    queryFn: () => chatApi.getUserStats(id, userId).then((r) => r.data),
    enabled: !!id && !!userId,
  });
  const context = useQuery({
    queryKey: ["viewer-context", id, userId],
    queryFn: () => chatApi.getViewerContext(id, userId).then((r) => r.data),
    enabled: !!id && !!userId,
    refetchInterval: 30_000,
  });
  const holds = useQuery({
    queryKey: ["redemptions", id, "viewer-holds", userId],
    queryFn: () =>
      redemptionsApi
        .list(id, { user_id: userId, status: "MANUAL_HOLD", limit: 1 })
        .then((r) => r.data),
    enabled: !!id && !!userId,
    refetchInterval: 15_000,
  });
  const user = identity.data;
  const profile = context.data;
  const select = (view: string, state = "") =>
    setParams({ view, ...(state ? { state } : {}) });
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow={c(
          `Viewer casebook · ${channel?.channel_login || ""}`,
          `Профиль зрителя · ${channel?.channel_login || ""}`,
        )}
        title={user?.display_name || user?.user_login || userId}
        description={c(
          "Review this viewer's activity, eligibility and unresolved purchases on the current channel.",
          "Проверьте активность зрителя, ограничения и нерешённые покупки на текущем канале.",
        )}
        actions={<Link to="/chat">{c("Channel chat", "Чат канала")} →</Link>}
      />
      {identity.isError && <QueryError onRetry={() => identity.refetch()} />}
      <div className="viewer-context-bar">
        <span className="text-xs text-muted-foreground">
          Twitch ID: {userId}
        </span>
        {user?.user_login && (
          <a
            href={`https://www.twitch.tv/${user.user_login}`}
            target="_blank"
            rel="noreferrer"
          >
            @{user.user_login} ↗
          </a>
        )}
        {holds.isError ? (
          <QueryError onRetry={() => holds.refetch()} />
        ) : (
          <Button
            variant={holds.data?.total ? "default" : "outline"}
            disabled={holds.isPending}
            onClick={() => select("redemptions", "MANUAL_HOLD")}
          >
            {holds.data?.total ?? "…"} {c("need review", "требуют проверки")}
          </Button>
        )}
      </div>
      {context.isError ? (
        <QueryError onRetry={() => context.refetch()} />
      ) : !profile ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="profile-totals">
          <div>
            <strong>{profile.redemption_stats.total_redemptions}</strong>
            <span>{c("Redemptions", "Активации")}</span>
          </div>
          <div>
            <strong>{profile.redemption_stats.failed}</strong>
            <span>{c("Failed", "С ошибкой")}</span>
          </div>
          <div>
            <strong>
              {profile.chat_stats.total_messages.toLocaleString()}
            </strong>
            <span>
              {c("Chat messages · all time", "Сообщения · всё время")}
            </span>
          </div>
          <div>
            <strong>
              {profile.limits.filter((rule) => rule.is_limit_reached).length}
            </strong>
            <span>{c("Limits reached", "Достигнуто лимитов")}</span>
          </div>
        </div>
      )}
      <nav
        className="context-tabs"
        aria-label={c("Viewer activity", "Активность зрителя")}
      >
        {[
          ["redemptions", c("Purchases & cases", "Покупки и проверки")],
          ["chat", c("Chat history", "История чата")],
          ["eligibility", c("Eligibility & limits", "Требования и лимиты")],
        ].map(([key, title]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => select(key)}
          >
            {title}
          </button>
        ))}
      </nav>
      {tab === "chat" ? (
        <ChatHistory
          key={`${id}:${userId}`}
          channelId={id}
          userId={userId}
          compact
        />
      ) : tab === "eligibility" ? (
        profile && (
          <ViewerLimits
            limits={profile.limits}
            channelLogin={channel?.channel_login || id}
          />
        )
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              aria-pressed={!status}
              onClick={() => select("redemptions")}
            >
              {c("All purchases", "Все покупки")}
            </Button>
            <Button
              variant="ghost"
              aria-pressed={status === "MANUAL_HOLD"}
              onClick={() => select("redemptions", "MANUAL_HOLD")}
            >
              {c("Held cases", "Удержанные активации")}
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              {c(
                "Trade links belong to individual redemptions; open a case to inspect the submitted link.",
                "Ссылки обмена относятся к конкретным активациям; откройте запись для проверки.",
              )}
            </p>
          </div>
          <RedemptionList
            channelId={id}
            userIdFilter={userId}
            statusFilter={status === "MANUAL_HOLD" ? "MANUAL_HOLD" : undefined}
            pageSize={10}
          />
        </section>
      )}
    </div>
  );
}
