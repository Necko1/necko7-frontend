import { lazy, Suspense } from "react";
import i18n from "@/i18n";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import AuthLayout from "@/components/layout/AuthLayout";
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const InitBotPage = lazy(() => import("@/pages/auth/InitBotPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const RewardsPage = lazy(() => import("@/pages/RewardsPage"));
const RedemptionsPage = lazy(() => import("@/pages/RedemptionsPage"));
const ChannelsPage = lazy(() => import("@/pages/ChannelsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const ChatMessagesPage = lazy(() => import("@/pages/ChatMessagesPage"));
const ChatUserPage = lazy(() => import("@/pages/ChatUserPage"));
const LogsPage = lazy(() => import("@/pages/LogsPage"));
const PublicRewardsPage = lazy(() => import("@/pages/PublicRewardsPage"));
const ChannelProfilePage = lazy(() => import("@/pages/ChannelProfilePage"));
const GlobalProfilePage = lazy(() => import("@/pages/GlobalProfilePage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ShortRewardRedirect = lazy(() => import("@/pages/ShortRewardRedirect"));

const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: (_error, _variables, _context, mutation) => {
    if (!mutation.options.onError) toast.error(i18n.t("ops.saveError"));
  } }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<div role="status" className="page-shell text-muted-foreground">{i18n.t("common.loading")}</div>}>
            <Routes>
              {/* Public / auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Standalone — no layout, self-contained background */}
              <Route path="/init-bot" element={<InitBotPage />} />

              {/* Compact reward short link redirect: stateless, immediate client-side redirect */}
              <Route path="/r/:identifier/:shortRewardId" element={<ShortRewardRedirect />} />

              {/* App routes (handles both viewer and admin layouts) */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/channels" element={<ChannelsPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/redemptions" element={<RedemptionsPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/leaderboard" element={<ChatPage />} />
                <Route path="/chat/leaderboard" element={<Navigate to="/leaderboard" replace />} />
                <Route path="/chat" element={<ChatMessagesPage />} />
                <Route path="/chat/users/:userId" element={<ChatUserPage />} />
                <Route
                  path="/broadcasters/:channelId/settings"
                  element={<SettingsPage />}
                />

                {/* v0.6.0 Public showcase & viewer profile routes */}
                <Route path="/c/:identifier" element={<PublicRewardsPage />} />
                <Route path="/c/:identifier/rewards/:rewardId" element={<PublicRewardsPage />} />
                <Route path="/c/:identifier/profile" element={<ChannelProfilePage />} />
                <Route path="/me" element={<GlobalProfilePage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
