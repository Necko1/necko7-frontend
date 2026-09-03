import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import AuthLayout from "@/components/layout/AuthLayout";
import LoginPage from "@/pages/auth/LoginPage";
import InitBotPage from "@/pages/auth/InitBotPage";
import DashboardPage from "@/pages/DashboardPage";
import RewardsPage from "@/pages/RewardsPage";
import RedemptionsPage from "@/pages/RedemptionsPage";
import ChannelsPage from "@/pages/ChannelsPage";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient({
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
            <Routes>
              {/* Public / auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Standalone — no layout, self-contained background */}
              <Route path="/init-bot" element={<InitBotPage />} />

              {/* Protected app routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/channels" element={<ChannelsPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/redemptions" element={<RedemptionsPage />} />
                <Route
                  path="/broadcasters/:channelId/settings"
                  element={<SettingsPage />}
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
