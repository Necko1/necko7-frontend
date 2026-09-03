// ===== Auth & User =====

export interface UserResponse {
  twitch_id: string;
  login: string;
  avatar_url: string | null;
}

export interface LogoutResponse {
  success: boolean;
}

// ===== Broadcasters =====

export type ChannelRole = "Owner" | "Editor";

export interface BroadcasterListItem {
  channel_id: string;
  channel_login: string;
  role: ChannelRole;
}

export interface BroadcasterSettingsResponse {
  channel_id: string;
  channel_login: string;
  is_active: boolean;
  market_api_key_set: boolean;
  base_price_multiplier: number;
  update_prices_period: number;
  refund_on_buyer_fail: boolean;
  refund_if_no_money: boolean;
  pause_reward_if_no_money: boolean;
  market_chance_to_transfer: number;
  chat_messages: Record<string, string>;
}

export interface UpdateBroadcasterSettingsBody {
  is_active?: boolean | null;
  market_api_key?: string | null;
  base_price_multiplier?: number | null;
  update_prices_period?: number | null;
  refund_on_buyer_fail?: boolean | null;
  refund_if_no_money?: boolean | null;
  pause_reward_if_no_money?: boolean | null;
  market_chance_to_transfer?: number | null;
  chat_messages?: Record<string, string> | null;
}

export interface MarketBalanceResponse {
  money: number;
  money_settlement: number;
  currency: string;
  updated_at: string;
}

export interface ChatMessagesResponse {
  channel_id: string;
  messages: Record<string, string>;
  custom_messages: Record<string, string>;
  default_messages: Record<string, string>;
  placeholders: Record<string, string[]>;
}

export interface UpdateChatMessagesBody {
  messages: Record<string, string>;
}

// ===== Permissions =====

export interface PermissionResponse {
  channel_id: string;
  user_id: string;
  role: ChannelRole;
  granted_by: string;
  user_login: string;
}

export interface GrantPermissionBody {
  login: string;
}

// ===== Rewards =====

export interface RewardResponse {
  twitch_id: string;
  is_paused: boolean;
  is_deleted: boolean;
  streamer_id: string;
  market_item_name: string;
  twitch_title: string;
  twitch_description: string;
  current_market_price: number;
  permissible_market_price_deviation: number;
  twitch_price_markup_percentage: number;
  global_cooldown_seconds: number;
  max_redemptions_per_stream: number;
  max_redemptions_per_user_per_stream: number;
  market_autobuy: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardBody {
  market_item_name: string;
  twitch_title: string;
  twitch_description: string;
  permissible_market_price_deviation: number;
  twitch_price_markup_percentage: number;
  global_cooldown_seconds: number;
  max_redemptions_per_stream: number;
  max_redemptions_per_user_per_stream: number;
  market_autobuy: boolean;
  is_paused: boolean;
}

export interface UpdateRewardBody {
  twitch_title?: string | null;
  twitch_description?: string | null;
  current_market_price?: number | null;
  permissible_market_price_deviation?: number | null;
  twitch_price_markup_percentage?: number | null;
  global_cooldown_seconds?: number | null;
  max_redemptions_per_stream?: number | null;
  max_redemptions_per_user_per_stream?: number | null;
  market_autobuy?: boolean | null;
  is_paused?: boolean | null;
}

export type BatchAction = "pause" | "unpause" | "delete";

export interface BatchRewardBody {
  action: BatchAction;
  reward_ids: string[];
}

// ===== Redemptions =====

export type RedemptionStatus =
  | "Pending"
  | "OrderCreated"
  | "FailedRefund"
  | "FailedPenalty"
  | "Completed";

export interface RedemptionResponse {
  twitch_redemption_id: string;
  twitch_reward_id: string;
  user_id: string;
  user_login: string;
  twitch_points_cost: number;
  currency: string;
  market_paid_price: number | null;
  fail_cause: string | null;
  fail_description: string | null;
  status: RedemptionStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRedemptionsResponse {
  items: RedemptionResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface ListRedemptionsQuery {
  status?: string | null;
  reward_id?: string | null;
  offset?: number | null;
  limit?: number | null;
}

// ===== Stats =====

export interface StatsResponse {
  total_redemptions: number;
  completed: number;
  failed: number;
  total_spent: number;
  total_points_earned: number;
}

export type StatsPeriod = "year" | "month" | "week" | "custom";
