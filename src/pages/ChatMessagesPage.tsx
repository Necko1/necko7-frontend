import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/Page";
import ChatHistory from "@/components/chat/ChatHistory";
import { useAppStore } from "@/store/useAppStore";
import { useCopy } from "@/lib/useCopy";
export default function ChatMessagesPage() {
  const c = useCopy();
  const channelId = useAppStore((s) => s.selectedBroadcasterId);
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow={c("Channel history", "История канала")}
        title={c("Chat history", "История чата")}
        description={c(
          "Find a conversation, inspect a viewer, or follow incoming messages.",
          "Найдите разговор, откройте профиль зрителя или следите за новыми сообщениями.",
        )}
        actions={
          <Link to="/leaderboard">
            {c("Activity & leaderboard", "Активность и рейтинг")} →
          </Link>
        }
      />
      {channelId && <ChatHistory key={channelId} channelId={channelId} />}
    </div>
  );
}
