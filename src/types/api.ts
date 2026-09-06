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
  display_name?: string | null;
  profile_image_url?: string | null;
  role: ChannelRole;
}

export type ChatMessageCategory =
  | "orders"
  | "market_errors"
  | "trades"
  | "chat_requirements"
  | "limits"
  | (string & {});

export type CategorizedChatMessages = Record<string, Record<string, string>>;
export type CategorizedPlaceholders = Record<string, Record<string, string[]>>;

export interface BroadcasterSettingsResponse {
  channel_id: string;
  channel_login: string;
  display_name?: string | null;
  profile_image_url?: string | null;
  is_active: boolean;
  market_api_key_set: boolean;
  base_price_multiplier: number;
  update_prices_period: number;
  refund_on_buyer_fail: boolean;
  refund_if_no_money: boolean;
  pause_reward_if_no_money: boolean;
  market_chance_to_transfer: number;
  chat_messages: Record<string, Record<string, string>>;
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
  chat_messages?: Record<string, Record<string, string>> | null;
}

export interface MarketBalanceResponse {
  money: number;
  money_settlement: number;
  currency: string;
  updated_at: string;
}

export interface ChatMessagesResponse {
  channel_id: string;
  messages: Record<string, Record<string, string>>;
  custom_messages: Record<string, Record<string, string>>;
  default_messages: Record<string, Record<string, string>>;
  placeholders: Record<string, Record<string, string[]>>;
}

export interface UpdateChatMessagesBody {
  messages: Record<string, Record<string, string>>;
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

export type PauseReason = "MANUAL" | "NO_MONEY" | "PRICE_LIMIT";
export type RewardType = "FIXED" | "POOL" | "FILTER";
export type PricingMode = "AUTO" | "MANUAL";
export type PriceStrategy = "AVERAGE" | "MEDIAN" | "MAX";
export type ChatLogicalOperator = "AND" | "OR";

export interface FilterConfig {
  min_price: number;
  max_price: number;
  min_volume?: number | null;
  name_contains?: string | null;
  name_prefix?: string | null;
  name_suffix?: string | null;
}

export interface PoolItemConfig {
  market_hash_name: string;
  weight: number;
  permissible_market_price_deviation: number;
  current_market_price?: number;
}

export interface MarketPriceItem {
  market_hash_name: string;
  price: number;
  volume?: number;
}

export interface PreviewFilterBody {
  filter_config: FilterConfig;
  currency?: string | null;
  price_strategy?: PriceStrategy | null;
  twitch_price_markup_percentage?: number | null;
}

export interface PreviewFilterResponse {
  total_matching_items: number;
  min_price: number;
  max_price: number;
  average_price: number;
  median_price: number;
  calculated_market_price: number;
  estimated_twitch_points: number;
  currency: string;
  sample_items: MarketPriceItem[];
}

export interface ImageProxyParams {
  url: string;
}

export interface PurchaseLimitRule {
  max_redemptions: number;
  window_hours?: number | null;
}

export interface RewardPurchaseLimitsConfig {
  global?: PurchaseLimitRule[];
  user?: PurchaseLimitRule[];
}

export interface RewardResponse {
  id: string;
  twitch_id: string;
  is_paused: boolean;
  pause_reason: PauseReason | null;
  is_deleted: boolean;
  streamer_id: string;
  reward_type: RewardType;
  pricing_mode: PricingMode;
  price_strategy?: PriceStrategy | null;
  manual_twitch_points?: number | null;
  market_item_name?: string | null;
  pool_items?: PoolItemConfig[] | null;
  filter_config?: FilterConfig | null;
  twitch_title: string;
  twitch_description: string;
  current_market_price: number;
  min_market_price?: number | null;
  max_market_price?: number | null;
  permissible_market_price_deviation: number;
  twitch_price_markup_percentage: number;
  global_cooldown_seconds: number;
  max_redemptions_per_stream: number;
  max_redemptions_per_user_per_stream: number;
  market_autobuy: boolean;
  currency: string;
  // Chat activity requirements (v0.4.0)
  chat_min_messages?: number | null;
  chat_min_characters?: number | null;
  chat_time_window_hours?: number | null;
  chat_logical_operator?: ChatLogicalOperator | null;
  refund_if_chat_req_failed?: boolean;
  // Purchase limits (v0.4.3)
  purchase_limits?: RewardPurchaseLimitsConfig | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardBody {
  reward_type?: RewardType;
  pricing_mode?: PricingMode;
  price_strategy?: PriceStrategy | null;
  manual_twitch_points?: number | null;
  market_item_name?: string | null;
  pool_items?: PoolItemConfig[] | null;
  filter_config?: FilterConfig | null;
  twitch_title: string;
  twitch_description: string;
  min_market_price?: number | null;
  max_market_price?: number | null;
  permissible_market_price_deviation: number;
  twitch_price_markup_percentage: number;
  global_cooldown_seconds: number;
  max_redemptions_per_stream: number;
  max_redemptions_per_user_per_stream: number;
  market_autobuy: boolean;
  is_paused: boolean;
  // Chat activity requirements (v0.4.0)
  chat_min_messages?: number | null;
  chat_min_characters?: number | null;
  chat_time_window_hours?: number | null;
  chat_logical_operator?: ChatLogicalOperator | null;
  refund_if_chat_req_failed?: boolean;
  // Purchase limits (v0.4.3)
  purchase_limits?: RewardPurchaseLimitsConfig | null;
}

export interface UpdateRewardBody {
  reward_type?: RewardType | null;
  pricing_mode?: PricingMode | null;
  price_strategy?: PriceStrategy | null;
  manual_twitch_points?: number | null;
  market_item_name?: string | null;
  pool_items?: PoolItemConfig[] | null;
  filter_config?: FilterConfig | null;
  twitch_title?: string | null;
  twitch_description?: string | null;
  current_market_price?: number | null;
  min_market_price?: number | null;
  max_market_price?: number | null;
  permissible_market_price_deviation?: number | null;
  twitch_price_markup_percentage?: number | null;
  global_cooldown_seconds?: number | null;
  max_redemptions_per_stream?: number | null;
  max_redemptions_per_user_per_stream?: number | null;
  market_autobuy?: boolean | null;
  is_paused?: boolean | null;
  pause_reason?: PauseReason | null;
  // Chat activity requirements (v0.4.0)
  chat_min_messages?: number | null;
  chat_min_characters?: number | null;
  chat_time_window_hours?: number | null;
  chat_logical_operator?: ChatLogicalOperator | null;
  refund_if_chat_req_failed?: boolean | null;
  // Purchase limits (v0.4.3)
  purchase_limits?: RewardPurchaseLimitsConfig | null;
}

export interface ListRewardsQuery {
  is_paused?: boolean | null;
  is_deleted?: boolean | null;
  pause_reason?: PauseReason | null;
}

export type BatchAction = "pause" | "unpause" | "delete";

export interface BatchRewardBody {
  action: BatchAction;
  reward_ids: string[];
}

// ===== Redemptions =====

export type RedemptionStatus =
  | "PENDING"
  | "ORDER_CREATED"
  | "COMPLETED"
  | "FAILED_REFUND"
  | "FAILED_PENALTY"
  | "Pending"
  | "OrderCreated"
  | "Completed"
  | "FailedRefund"
  | "FailedPenalty";

export interface RedemptionResponse {
  twitch_redemption_id: string;
  twitch_reward_id: string;
  user_id: string;
  user_login: string;
  user_trade_link: string; // added in v0.4.0
  twitch_points_cost: number;
  currency: string;
  market_paid_price: number | null;
  market_item_name?: string | null;
  retry_count: number;
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
  user_id?: string | null; // added in v0.4.0
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

// ===== Chat Analytics (v0.4.0) =====

export interface LeaderboardQuery {
  time_window_hours?: number | null;
  sort_by?: string | null;
  order?: string | null;
  search?: string | null;
  offset?: number | null;
  limit?: number | null;
}

export interface LeaderboardUserItem {
  chatter_user_id: string;
  chatter_user_login: string;
  message_count: number;
  char_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface PaginatedLeaderboardResponse {
  items: LeaderboardUserItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface ChatMessage {
  id: number;
  message_id: string;
  broadcaster_id: string;
  chatter_user_id: string;
  chatter_user_login: string;
  message_text: string;
  char_count: number;
  sent_at: string;
  created_at: string;
}

export interface PaginatedUserMessagesResponse {
  items: ChatMessage[];
  total: number;
  offset: number;
  limit: number;
}

export interface UserMessagesQuery {
  time_window_hours?: number | null;
  search?: string | null;
  offset?: number | null;
  limit?: number | null;
}

export interface UserRedemptionsQuery {
  offset?: number | null;
  limit?: number | null;
}

export interface UserChatStatsResponse {
  user_id: string;
  user_login?: string | null;
  display_name?: string | null;
  profile_image_url?: string | null;
  message_count: number;
  char_count: number;
  time_window_hours?: number | null;
}

export interface UserStatsQuery {
  time_window_hours?: number | null;
}

export interface UserChatSummary {
  chatter_user_id: string;
  chatter_user_login: string;
  total_messages: number;
  total_chars: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
}

// ===== Chat Analytics & Dashboard (v0.4.3) =====

export interface ChatDashboardQuery {
  time_window_hours?: number | null;
  bucket_hours?: number | null;
}

export interface ChatDashboardSummary {
  total_messages: number;
  total_characters: number;
  unique_chatters: number;
  avg_characters_per_message: number;
}

export interface ChatTimelinePoint {
  bucket_start: string;
  message_count: number;
  char_count: number;
  unique_chatters: number;
}

export interface ChatTopUserItem {
  chatter_user_id: string;
  chatter_user_login: string;
  message_count: number;
  char_count: number;
}

export interface ChatDashboardData {
  summary: ChatDashboardSummary;
  timeline: ChatTimelinePoint[];
  top_chatters: ChatTopUserItem[];
}

export interface ChannelMessagesQuery {
  chatter_login?: string | null;
  user_id?: string | null;
  search?: string | null;
  time_window_hours?: number | null;
  offset?: number | null;
  limit?: number | null;
}

export interface PaginatedChannelMessagesResponse {
  items: ChatMessage[];
  total: number;
  offset: number;
  limit: number;
}
