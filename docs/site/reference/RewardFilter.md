<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# RewardFilter

## create {#create}

```rhai
RewardFilter::create() -> RewardFilter
```

Construct an empty filter.

No parameters.

**Returns:** `RewardFilter`.

**Behavior and effects:** Default min_count is zero, alias/window unset, statuses empty; empty statuses means all statuses. A reward predicate only filters eligibility when min_count > 0.

**Errors:** No host call; pure value.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
RewardFilter::create();
```

Related APIs: [RewardFilter.reward](./RewardFilter#reward), [RewardFilter.statuses](./RewardFilter#statuses), [RewardFilter.min_count](./RewardFilter#min_count), [RewardFilter.during](./RewardFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## reward {#reward}

```rhai
RewardFilter.reward(alias: string) -> RewardFilter
```

Return an updated reward filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `alias` | `string` | Restrict to this channel's reward alias; omitted means any reward. |

**Returns:** `RewardFilter`.

**Behavior and effects:** Builder returns a new value; counts and windows validated when queried. This queries channel fulfillment/redemption history, including SCRIPT origin. No delivery guarantee follows from a count.

**Errors:** statuses throws on non-string array items; invalid_reward_filter for negative counts or window < 60 at query.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
RewardFilter::create().reward("secret_case");
```

Related APIs: [RewardFilter.create](./RewardFilter#create), [RewardFilter.statuses](./RewardFilter#statuses), [RewardFilter.min_count](./RewardFilter#min_count), [RewardFilter.during](./RewardFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## statuses {#statuses}

```rhai
RewardFilter.statuses(statuses: array<string>) -> RewardFilter
```

Return an updated reward filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `statuses` | `array<string>` | Match any given domain status; empty means all. PENDING, MANUAL_HOLD, ORDER_CREATED, COMPLETED, FAILED_REFUND, FAILED_PENALTY. Unknown strings simply match nothing, no enum validation. |

**Returns:** `RewardFilter`.

**Behavior and effects:** Builder returns a new value; counts and windows validated when queried. This queries channel fulfillment/redemption history, including SCRIPT origin. No delivery guarantee follows from a count.

**Errors:** statuses throws on non-string array items; invalid_reward_filter for negative counts or window < 60 at query.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
RewardFilter::create().statuses(["COMPLETED"]);
```

Related APIs: [RewardFilter.create](./RewardFilter#create), [RewardFilter.reward](./RewardFilter#reward), [RewardFilter.min_count](./RewardFilter#min_count), [RewardFilter.during](./RewardFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_count {#min_count}

```rhai
RewardFilter.min_count(minimum: integer) -> RewardFilter
```

Return an updated reward filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | At least this many redemptions; nonnegative, zero disables reward-history predicate. |

**Returns:** `RewardFilter`.

**Behavior and effects:** Builder returns a new value; counts and windows validated when queried. This queries channel fulfillment/redemption history, including SCRIPT origin. No delivery guarantee follows from a count.

**Errors:** statuses throws on non-string array items; invalid_reward_filter for negative counts or window < 60 at query.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
RewardFilter::create().min_count(1);
```

Related APIs: [RewardFilter.create](./RewardFilter#create), [RewardFilter.reward](./RewardFilter#reward), [RewardFilter.statuses](./RewardFilter#statuses), [RewardFilter.during](./RewardFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## during {#during}

```rhai
RewardFilter.during(window: Duration) -> RewardFilter
```

Return an updated reward filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `window` | `Duration` | Separate redemption window, 60 seconds..365 days. Omitted means all stored history, not the outer chat window. |

**Returns:** `RewardFilter`.

**Behavior and effects:** Builder returns a new value; counts and windows validated when queried. This queries channel fulfillment/redemption history, including SCRIPT origin. No delivery guarantee follows from a count.

**Errors:** statuses throws on non-string array items; invalid_reward_filter for negative counts or window < 60 at query.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
RewardFilter::create().during(Duration::from_days(7));
```

Related APIs: [RewardFilter.create](./RewardFilter#create), [RewardFilter.reward](./RewardFilter#reward), [RewardFilter.statuses](./RewardFilter#statuses), [RewardFilter.min_count](./RewardFilter#min_count).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
