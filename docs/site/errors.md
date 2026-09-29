# Failures and structured results

## Host exceptions

Most host operations throw a Rhai runtime error on failure. Catch only when you can make a deliberate recovery decision. Log a concise explanation; do not blindly repeat external mutations after a timeout.

```rhai
try {
    rewards.set_visible("round_drop", false);
} catch (error) {
    log.warn(`Hide failed: ${error}`);
}
```

| Error / family | Meaning |
| --- | --- |
| invalid_key | Empty key/alias/user ID or over 128 UTF-8 bytes |
| Value exceeds 64 KiB / storage_value_limit | Serialized value too large |
| storage_project_limit | Persisted project exceeds 1 MiB or 1,024 keys; write rolls back |
| storage_not_integer / storage_integer_overflow | Counter is not integer or checked arithmetic overflow |
| invalid_job / invalid_duration | Invalid key, duration or payload |
| scheduler_project_limit / missing_on_timer | Live job quota exceeded / pinned revision has no timer handler |
| invalid_chat_window | Window outside 60..31,536,000 seconds or negative chat minimum |
| invalid_reward_filter | Invalid redemption window or negative minimum count |
| invalid_activity_filter | Negative message/character threshold or explicit ActivityFilter window outside 1..31,536,000 seconds |
| invalid_message_filter | Empty attached MessageFilter, more than 16 clauses, a pattern empty/containing NUL/over 256 Unicode scalar values, or explicit window outside 1..31,536,000 seconds |
| invalid_message | Empty message or more than 500 Unicode characters |
| log_message_limit | More than 2,048 UTF-8 bytes |
| reward_not_found / twitch_unavailable | Unknown channel alias / reward mutation could not complete through Twitch |
| service_unavailable | Internal host/database/downstream failure; detailed cause stays in server tracing |
| host_timeout | Host deadline reached; external effects may already exist |
| unknown_capability / Unsupported capability | Method is not implemented on that capability |
| Host call budget exceeded / Capability budget exceeded | Per-execution admission exhausted |
| Engine errors | Type mismatch, invalid import, reserved keyword, JSON serialization, instruction/depth/container/deadline limit; execution report includes diagnostics |

Unknown domain error strings can be forwarded from fulfillment; code is not a closed enum. Catch fallback cases and retain the result for investigation.

## Trigger results

`rewards.trigger(alias, user_id)` converts host/domain failures into a map with `ok=false` and `code`. Rhai type errors, JSON conversion failures and host-call-budget rejection happen before that wrapper and can still throw.

| Field | Presence / meaning |
| --- | --- |
| ok | Always boolean; true is admission/current state, not Steam delivery completed |
| code | Rejection/review reason when supplied; can be unit on admitted inventory result |
| fulfillment_id | Optional real internal UUID; can exist even when ok=false |
| inventory_item_id | Optional inventory UUID |
| selected_item | Optional selected item name |
| origin | SCRIPT when supplied |
| inventory_status | Optional current lifecycle status |
| retry_after | Optional seconds hint (60 for trigger-rate rejection) |
| planned / validation | Dry-run plan and explanation when supplied |

Check optional field membership before reading. The result never posts to chat automatically. A later delivery/reconciliation update also does not manufacture a script chat announcement.

| Common code | Interpretation / response |
| --- | --- |
| reward_not_found | Alias missing/deleted/wrong channel; fix configuration |
| user_not_found / invalid_user | No observed channel chat identity or known account / invalid ID argument |
| reward_paused / bot_or_reward_inactive | Operational state blocks processing; hiding and pausing are different |
| activity_requirement_failed | Reward's own chat requirements failed, even if your selection filter passed |
| purchase_limit_reached | Explicit necko7 global/user purchase limit rejected admission |
| trigger_rate_limit | At least 10 fulfillment rows for this project in preceding minute; hint retry_after=60; do not automatically repeat an ambiguous earlier attempt |
| price_limit | Reward's item-price rule rejected selection |
| trade_link_required | Inventory exists; viewer must configure delivery |
| market_unavailable / market_rejected | Current funds/market outcome prevents delivery; inspect inventory |
| fulfillment_pending | Selection/order is incomplete or reconciliation needed; inspect before triggering again |
| service_unavailable / host_timeout | May be ambiguous; inspect reports, fulfillment and inventory before deciding |

The earlier brief README described the project limit as attempts/minute; the actual service queries persisted fulfillment rows. Immediate pre-admission rejections do not all count as persisted rows. The per-execution trigger budget is independently three calls, including rejected calls.

## SCRIPT inventory

SCRIPT origin has no Twitch redemption ID and spends zero Twitch points. It bypasses Twitch cooldown/per-stream/per-user-stream limits, not necko7 operational checks, chat requirements, explicit purchase_limits, atomic admission, item selection, ownership, buyer/trade link and market restrictions.

An admitted item can wait for viewer/operator action. Viewer Discard in safe waiting/retry states records a terminal DISCARDED history with actor/time, never a points refund; unresolved order/trade blocks discard. Operator refund/penalty operations reject SCRIPT items. Existing inventory reconciliation handles ambiguous external purchases.

Use [safe hidden trigger](./cookbook/trigger-safely) or [the complete delayed giveaway](./cookbook/ace-secret-case). Do not solve delivery errors by spamming chat or automatic retrigger loops.
