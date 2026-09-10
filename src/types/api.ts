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

export type ChannelRole =
  | "OWNER"
  | "EDITOR"
  | "VIEWER"
  | "Owner"
  | "Editor"
  | "Viewer";


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

export interface PublicRewardsConfig {
  enabled?: boolean;
  show_chat_requirements?: boolean;
  show_cooldown_and_limits?: boolean;
  show_cost_points?: boolean;
  show_description?: boolean;
  show_filter_details?: boolean;
  show_market_price?: boolean;
  show_pause_reason?: boolean;
  show_paused_rewards?: boolean;
  show_pool_chances?: boolean;
  show_pool_item_prices?: boolean;
  show_pool_items?: boolean;
  show_price_deviation?: boolean;
  show_purchase_limits?: boolean;
}

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
  add_bot_badge: boolean;
  public_rewards_config?: PublicRewardsConfig | null;
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
  add_bot_badge?: boolean | null;
  public_rewards_config?: PublicRewardsConfig | null;
  chat_messages?: Record<string, Record<string, string>> | null;
}

export interface PinBroadcasterResponse {
  success: boolean;
  message: string;
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
  custom_message?: string | null;
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
  // Public showcase (v0.6.0)
  is_public?: boolean;
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
  // Public showcase (v0.6.0)
  is_public?: boolean;
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
  // Public showcase (v0.6.0)
  is_public?: boolean | null;
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
  | "MANUAL_HOLD"
  | "COMPLETED"
  | "FAILED_REFUND"
  | "FAILED_PENALTY"
  | "Pending"
  | "OrderCreated"
  | "ManualHold"
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

// ===== Channel Logs (v0.5.4) =====

export type ChannelLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type ChannelLogCategory =
  | "REDEMPTION"
  | "REWARD"
  | "MARKET"
  | "BOT"
  | "AUTH"
  | "SYSTEM";

export interface ChannelLogResponse {
  id: number;
  broadcaster_id: string;
  level: ChannelLogLevel;
  category: ChannelLogCategory;
  event_type: string;
  message: string;
  details?: Record<string, unknown> | null;
  solution_hint?: string | null;
  created_at: string;
}

export interface ChannelLogsSummaryResponse {
  errors_last_24h: number;
  warnings_last_24h: number;
  info_last_24h: number;
  total_last_24h: number;
}

export interface ListChannelLogsQuery {
  level?: ChannelLogLevel | null;
  category?: ChannelLogCategory | null;
  search?: string | null;
  from?: string | null;
  to?: string | null;
  offset?: number | null;
  limit?: number | null;
}

export interface PaginatedChannelLogsResponse {
  items: ChannelLogResponse[];
  total: number;
  offset: number;
  limit: number;
}

// ===== Public Rewards Showcase (v0.6.0) =====

export interface PublicBroadcasterInfo {
  channel_id: string;
  channel_login: string;
  display_name?: string | null;
  profile_image_url?: string | null;
  public_rewards_enabled: boolean;
}

export interface PublicChatRequirements {
  logical_operator?: string | null;
  min_characters?: number | null;
  min_messages?: number | null;
  time_window_hours?: number | null;
}

export interface PublicFilterDetails {
  max_price?: number | null;
  min_price?: number | null;
  name_contains?: string | null;
  name_prefix?: string | null;
  name_suffix?: string | null;
}

export interface PublicPoolItem {
  market_hash_name: string;
  chance_percentage?: number | null;
  current_market_price?: number | null;
  permissible_market_price_deviation?: number | null;
}

export interface PublicRewardResponse {
  twitch_id: string;
  twitch_title: string;
  reward_type: RewardType;
  pricing_mode: PricingMode;
  is_paused: boolean;
  twitch_description?: string | null;
  cost_points?: number | null;
  currency?: string | null;
  market_price?: number | null;
  market_item_name?: string | null;
  permissible_market_price_deviation?: number | null;
  pool_items?: PublicPoolItem[] | null;
  filter_details?: PublicFilterDetails | null;
  pause_reason?: string | null;
  global_cooldown_seconds?: number | null;
  max_redemptions_per_stream?: number | null;
  max_redemptions_per_user_per_stream?: number | null;
  chat_requirements?: PublicChatRequirements | null;
  purchase_limits?: RewardPurchaseLimitsConfig | null;
}

// ===== Viewer Profile (v0.6.0) =====

export interface ViewerRewardLimitStatus {
  twitch_reward_id: string;
  reward_title: string;
  max_redemptions: number;
  used_redemptions: number;
  remaining_redemptions: number;
  is_limit_reached: boolean;
  window_hours?: number | null;
}

export interface ViewerRedemptionStats {
  total_redemptions: number;
  completed: number;
  failed: number;
  pending: number;
  total_points_spent: number;
  total_market_value: number;
}

export interface ViewerChannelChatStats {
  total_messages: number;
  total_characters: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  leaderboard_rank?: number | null;
}

export interface ViewerChannelProfileResponse {
  channel_id: string;
  channel_login: string;
  display_name?: string | null;
  profile_image_url?: string | null;
  chat_stats: ViewerChannelChatStats;
  redemption_stats: ViewerRedemptionStats;
  limits: ViewerRewardLimitStatus[];
}

export interface ViewerChannelRedemption {
  twitch_redemption_id: string;
  twitch_reward_id: string;
  reward_title: string;
  twitch_points_cost: number;
  currency: string;
  status: RedemptionStatus;
  market_item_name?: string | null;
  market_paid_price?: number | null;
  fail_cause?: string | null;
  fail_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewerGlobalChannelSummary {
  channel_id: string;
  channel_login: string;
  display_name?: string | null;
  profile_image_url?: string | null;
  messages_count: number;
  redemptions_count: number;
}

export interface ViewerGlobalProfileResponse {
  user_id: string;
  total_chat_messages: number;
  total_chat_characters: number;
  redemption_stats: ViewerRedemptionStats;
  channels: ViewerGlobalChannelSummary[];
}

export interface ViewerGlobalRedemption {
  twitch_redemption_id: string;
  twitch_reward_id: string;
  channel_id: string;
  channel_login: string;
  reward_title: string;
  twitch_points_cost: number;
  currency: string;
  status: RedemptionStatus;
  market_item_name?: string | null;
  market_paid_price?: number | null;
  fail_cause?: string | null;
  fail_description?: string | null;
  created_at: string;
  updated_at: string;
}


