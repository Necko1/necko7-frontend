import { api } from "@/lib/api";
import type {
  UserResponse,
  LogoutResponse,
  BroadcasterListItem,
  BroadcasterSettingsResponse,
  UpdateBroadcasterSettingsBody,
  MarketBalanceResponse,
  ChatMessagesResponse,
  UpdateChatMessagesBody,
  PermissionResponse,
  GrantPermissionBody,
  RewardResponse,
  CreateRewardBody,
  UpdateRewardBody,
  BatchRewardBody,
  ListRewardsQuery,
  PreviewFilterBody,
  PreviewFilterResponse,
  PaginatedRedemptionsResponse,
  ListRedemptionsQuery,
  StatsResponse,
  StatsPeriod,
  // Chat Analytics (v0.4.0 & v0.4.3)
  LeaderboardQuery,
  PaginatedLeaderboardResponse,
  UserMessagesQuery,
  PaginatedUserMessagesResponse,
  UserRedemptionsQuery,
  UserStatsQuery,
  UserChatStatsResponse,
  UserChatSummary,
  ChatDashboardQuery,
  ChatDashboardData,
  ChannelMessagesQuery,
  PaginatedChannelMessagesResponse,
} from "@/types/api";
import { config } from "@/config";

// ===== Auth =====

export const authApi = {
  loginUrl: () => `${config.BACKEND_URL}/api/v1/auth/login`,
  connectUrl: () => `${config.BACKEND_URL}/api/v1/auth/connect`,
  initBotUrl: () => `${config.BACKEND_URL}/api/v1/auth/init/bot`,
  logout: () => api.post<LogoutResponse>("/api/v1/auth/logout"),
};

// ===== Users =====

export const usersApi = {
  me: () => api.get<UserResponse>("/api/v1/users/me"),
};

// ===== Broadcasters =====

export const broadcastersApi = {
  list: () => api.get<BroadcasterListItem[]>("/api/v1/broadcasters"),

  getSettings: (channelId: string) =>
    api.get<BroadcasterSettingsResponse>(`/api/v1/broadcasters/${channelId}`),

  updateSettings: (channelId: string, body: UpdateBroadcasterSettingsBody) =>
    api.put<BroadcasterSettingsResponse>(
      `/api/v1/broadcasters/${channelId}/settings`,
      body
    ),

  getBalance: (channelId: string) =>
    api.get<MarketBalanceResponse>(
      `/api/v1/broadcasters/${channelId}/market/balance`
    ),

  getChatMessages: (channelId: string) =>
    api.get<ChatMessagesResponse>(
      `/api/v1/broadcasters/${channelId}/messages`
    ),

  updateChatMessages: (channelId: string, body: UpdateChatMessagesBody) =>
    api.put<ChatMessagesResponse>(
      `/api/v1/broadcasters/${channelId}/messages`,
      body
    ),
};

// ===== Permissions =====

export const permissionsApi = {
  list: (channelId: string) =>
    api.get<PermissionResponse[]>(
      `/api/v1/broadcasters/${channelId}/permissions`
    ),

  grant: (channelId: string, body: GrantPermissionBody) =>
    api.post<PermissionResponse>(
      `/api/v1/broadcasters/${channelId}/permissions`,
      body
    ),

  revoke: (channelId: string, userId: string) =>
    api.delete(`/api/v1/broadcasters/${channelId}/permissions/${userId}`),
};

// ===== Rewards =====

export const rewardsApi = {
  list: (channelId: string, params?: ListRewardsQuery) =>
    api.get<RewardResponse[]>(`/api/v1/broadcasters/${channelId}/rewards`, {
      params,
    }),

  create: (channelId: string, body: CreateRewardBody) =>
    api.post<RewardResponse>(
      `/api/v1/broadcasters/${channelId}/rewards`,
      body
    ),

  update: (channelId: string, rewardId: string, body: UpdateRewardBody) =>
    api.put<RewardResponse>(
      `/api/v1/broadcasters/${channelId}/rewards/${rewardId}`,
      body
    ),

  delete: (channelId: string, rewardId: string) =>
    api.delete(`/api/v1/broadcasters/${channelId}/rewards/${rewardId}`),

  batch: (channelId: string, body: BatchRewardBody) =>
    api.post<{ affected: number }>(
      `/api/v1/broadcasters/${channelId}/rewards/batch`,
      body
    ),

  updatePrice: (channelId: string, rewardId: string) =>
    api.post(
      `/api/v1/broadcasters/${channelId}/rewards/${rewardId}/update-price`
    ),

  previewFilter: (channelId: string, body: PreviewFilterBody) =>
    api.post<PreviewFilterResponse>(
      `/api/v1/broadcasters/${channelId}/rewards/preview-filter`,
      body
    ),
};

// ===== Proxy =====

export const proxyApi = {
  imageUrl: (externalUrl: string): string => {
    const base = config.API_BASE_URL.replace(/\/$/, "");
    return `${base}/api/v1/proxy/image?url=${encodeURIComponent(externalUrl)}`;
  },
};

// ===== Redemptions =====

export const redemptionsApi = {
  list: (channelId: string, query: ListRedemptionsQuery = {}) =>
    api.get<PaginatedRedemptionsResponse>(
      `/api/v1/broadcasters/${channelId}/redemptions`,
      { params: query }
    ),

  penalty: (channelId: string, redemptionId: string) =>
    api.post(`/api/v1/broadcasters/${channelId}/redemptions/${redemptionId}/penalty`),

  refund: (channelId: string, redemptionId: string) =>
    api.post(`/api/v1/broadcasters/${channelId}/redemptions/${redemptionId}/refund`),

  retry: (channelId: string, redemptionId: string) =>
    api.post(`/api/v1/broadcasters/${channelId}/redemptions/${redemptionId}/retry`),
};

// ===== Stats =====

export const statsApi = {
  get: (
    channelId: string,
    period: StatsPeriod,
    from?: string | null,
    to?: string | null
  ) =>
    api.get<StatsResponse>(`/api/v1/broadcasters/${channelId}/stats`, {
      params: { period, from, to },
    }),
};

// ===== Chat Analytics (v0.4.0) =====

export const chatApi = {
  getDashboard: (channelId: string, params?: ChatDashboardQuery) =>
    api.get<ChatDashboardData>(
      `/api/v1/broadcasters/${channelId}/chat/dashboard`,
      { params }
    ),

  getChannelMessages: (channelId: string, params?: ChannelMessagesQuery) =>
    api.get<PaginatedChannelMessagesResponse>(
      `/api/v1/broadcasters/${channelId}/chat/messages`,
      { params }
    ),

  getLeaderboard: (channelId: string, params?: LeaderboardQuery) =>
    api.get<PaginatedLeaderboardResponse>(
      `/api/v1/broadcasters/${channelId}/chat/leaderboard`,
      { params }
    ),

  getUserMessages: (
    channelId: string,
    userId: string,
    params?: UserMessagesQuery
  ) =>
    api.get<PaginatedUserMessagesResponse>(
      `/api/v1/broadcasters/${channelId}/chat/users/${userId}/messages`,
      { params }
    ),

  getUserRedemptions: (
    channelId: string,
    userId: string,
    params?: UserRedemptionsQuery
  ) =>
    api.get<PaginatedRedemptionsResponse>(
      `/api/v1/broadcasters/${channelId}/chat/users/${userId}/redemptions`,
      { params }
    ),

  getUserStats: (
    channelId: string,
    userId: string,
    params?: UserStatsQuery
  ) =>
    api.get<UserChatStatsResponse>(
      `/api/v1/broadcasters/${channelId}/chat/users/${userId}/stats`,
      { params }
    ),

  getUserSummary: (channelId: string, userId: string) =>
    api.get<UserChatSummary | null>(
      `/api/v1/broadcasters/${channelId}/chat/users/${userId}/summary`
    ),
};
