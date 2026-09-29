<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# rewards

## get {#get}

```rhai
rewards.get(alias: string) -> Reward | ()
```

Find a reward by alias.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Reward script_alias in this channel; not its title or Twitch UUID. |

**Returns:** `Reward or ()`.

**Behavior and effects:** Returns only id, alias, title, is_visible and is_paused. Deleted/missing reward returns (). No inventory or pricing secrets.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
rewards.get("secret_case");
```

Related APIs: [rewards.set_visible](./rewards#set_visible), [rewards.set_paused](./rewards#set_paused), [rewards.enable_for](./rewards#enable_for), [rewards.trigger](./rewards#trigger).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## set_visible {#set_visible}

```rhai
rewards.set_visible(alias: string, visible: bool) -> #{ok: bool, planned: bool}
```

Change presentation visibility.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Reward script_alias in this channel; not its title or Twitch UUID. |
| `visible` | `bool` | Desired state. |

**Returns:** `#{ok: bool, planned: bool}`.

**Behavior and effects:** Maps to Twitch is_enabled and local is_visible. Does not pause operational processing, price updates or script triggering. Hidden storefront presentation depends separately on show_invisible_rewards.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. reward_not_found, twitch_unavailable.

**Dry run:** Checks alias and plans the mutation without contacting Twitch.

**Budget:** 100 host calls total; 10 calls of this operation per execution.

```rhai
rewards.set_visible("secret_case", false);
```

Related APIs: [rewards.get](./rewards#get), [rewards.set_paused](./rewards#set_paused), [rewards.enable_for](./rewards#enable_for), [rewards.trigger](./rewards#trigger).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## set_paused {#set_paused}

```rhai
rewards.set_paused(alias: string, paused: bool) -> #{ok: bool, planned: bool}
```

Change operational pause.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Reward script_alias in this channel; not its title or Twitch UUID. |
| `paused` | `bool` | Desired state. |

**Returns:** `#{ok: bool, planned: bool}`.

**Behavior and effects:** A paused reward cannot be script-triggered. Manual pause reason is set/cleared; this is not a way to hide a secret reward.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. reward_not_found, twitch_unavailable.

**Dry run:** Checks alias and plans the mutation without contacting Twitch.

**Budget:** 100 host calls total; 10 calls of this operation per execution.

```rhai
rewards.set_paused("secret_case", false);
```

Related APIs: [rewards.get](./rewards#get), [rewards.set_visible](./rewards#set_visible), [rewards.enable_for](./rewards#enable_for), [rewards.trigger](./rewards#trigger).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## enable_for {#enable_for}

```rhai
rewards.enable_for(alias: string, duration: Duration) -> JobResult
```

Show temporarily, then hide.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Reward script_alias in this channel; not its title or Twitch UUID. |
| `duration` | `Duration` | Positive duration, at most 31,536,000 seconds (365 days). |

**Returns:** `JobResult: #{ok: true, id: string} live; #{ok: true, planned: true} dry run`.

**Behavior and effects:** Persists an internal hide_reward job BEFORE opening visibility; needs no on_timer. Does not unpause. Key visibility:{reward UUID} is project-local. Persists across restart/publish; disable blocks the automatic hide and overdue work requires Run now or explicit hide. This is not atomic across Twitch and DB.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. reward_not_found, scheduler_project_limit, twitch_unavailable.

**Dry run:** Checks alias; returns #{ok: true, planned: true}. No visibility change/job.

**Budget:** 100 host calls total; 10 calls of this operation per execution.

```rhai
rewards.enable_for("round_drop", Duration::from_mins(2));
```

Related APIs: [rewards.get](./rewards#get), [rewards.set_visible](./rewards#set_visible), [rewards.set_paused](./rewards#set_paused), [rewards.trigger](./rewards#trigger).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## trigger {#trigger}

```rhai
rewards.trigger(alias: string, user_id: string) -> TriggerResult
```

Create a real SCRIPT fulfillment.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Reward script_alias in this channel; not its title or Twitch UUID. |
| `user_id` | `string` | Twitch user ID, not @login. |

**Returns:** `TriggerResult`.

**Behavior and effects:** No Twitch points or fake redemption. Bypasses Twitch-specific cooldown and per-stream/per-user-stream caps, NOT necko7 bot/reward operational state, chat requirements, purchase limits, inventory admission, buyer/trade-link or market constraints. ok means admission/known current state, never a guarantee of completed Steam delivery. Selection, inventory admission, waiting-mode and successful order announcements stay silent; use chat.send for the giveaway announcement. Pre-inventory validation/admission failures stay silent. Once an inventory item exists, normal fulfillment notices cover missing trade links, purchase errors/uncertain outcomes, trade offers with acceptance link/deadline, acceptance and delivery failures, including background tracking and manual attempts. All origins use the same channel-configured delivery templates and shared neutral defaults, without SCRIPT-specific text substitution; Twitch points/refund notices retain separate Twitch-only keys. Channel-authored delivery templates are honored.

**Errors:** Host/domain failures become #{ok: false, code: string}; pre-host Rhai type/serialization/call-budget errors still throw. Optional result fields are not guaranteed: test membership before reading. See [trigger results](../errors#trigger-results).

**Dry run:** Checks alias/user, pause, current rate/chat/purchase counts without reserving capacity. Success is planned; buyer/market/delivery are not simulated. No inventory or fulfillment mutation.

**Budget:** 100 host calls total; 3 calls of this operation per execution. Also at most 10 admitted fulfillment rows per project in the preceding minute; the check is not a blanket Twitch rate limit.

```rhai
rewards.trigger("secret_case", "123");
```

Related APIs: [rewards.get](./rewards#get), [chat.send](./chat#send).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
