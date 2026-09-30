export interface AttemptParameters {
  request_id: string;
  max_price: number;
  chance_to_transfer: number;
  trade_link: string;
}

export interface ManualAttempt extends AttemptParameters {
  custom_id: string;
  paid_price: number | null;
  market_order_id: string | null;
  status: string;
  outcome_kind: string | null;
  outcome_detail: string | null;
  last_market_stage: string | null;
  trade_id: string | null;
  send_until: string | null;
  receive_until: string | null;
  settlement: string | null;
  causer: string | null;
  cancellation_reason: string | null;
  market_refund: unknown;
  initiator_user_id: string | null;
  created_at: string;
  last_checked_at: string | null;
}

export interface ManualOrder {
  id: string;
  inventory_id: string;
  channel_id: string;
  origin: "MANUAL";
  item_name: string;
  currency: string;
  trade_link: string;
  steam_partner: string;
  initial_max_price: number;
  initial_chance_to_transfer: number;
  description: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  close_reason: string | null;
  status: string;
  can_retry: boolean;
  can_close: boolean;
  action_block_reason: string | null;
  attempts: ManualAttempt[];
}

export interface ManualAuditEvent {
  id: number;
  event_key: string;
  manual_order_id: string;
  event_type: string;
  actor_kind: string;
  actor_user_id: string | null;
  attempt_custom_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CreateManualOrder extends AttemptParameters {
  item_name: string;
  currency: string;
  description: string;
  tags: string[];
}

export interface ManualPreview {
  item_name: string;
  currency: string;
  min_price: number;
  max_price: number;
  chance_to_transfer: number;
  trade_link: string | null;
  steam_partner: string | null;
}

export interface CatalogResponse {
  items: { market_hash_name: string; price: number; volume: number }[];
  currency: string;
  total: number;
  limit: number;
  offset: number;
}

export interface ManualOrderList {
  items: ManualOrder[];
  total: number;
  limit: number;
  offset: number;
}
