<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# UserFilter

## create {#create}

```rhai
UserFilter::create() -> UserFilter
```

Construct an empty filter.

No parameters.

**Returns:** `UserFilter`.

**Behavior and effects:** No activity, reward or message-content restriction. All nested criteria are ANDed. Use .activity(...), .messages(...) and .reward_redemptions(...); each nested filter has its own optional .during(...), defaulting to all retained channel history. Legacy .min_messages/.min_characters keep their original candidate-window behavior. See [user filtering](../user-filtering).

**Errors:** No host call; pure value.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create();
```

Related APIs: [UserFilter.messages](./UserFilter#messages), [UserFilter.min_messages](./UserFilter#min_messages), [UserFilter.min_characters](./UserFilter#min_characters), [UserFilter.reward_redemptions](./UserFilter#reward_redemptions), [UserFilter.activity](./UserFilter#activity).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## messages {#messages}

```rhai
UserFilter.messages(filter: MessageFilter) -> UserFilter
```

Require one authored message to match content in its own history window.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `filter` | `MessageFilter` | A nonempty any()/all() builder with 1..16 text clauses. |

**Returns:** `UserFilter`.

**Behavior and effects:** Return an updated UserFilter; chain or assign. Replaces the previous MessageFilter. ANDed with ActivityFilter, reward_redemptions and legacy candidate-window thresholds. Checks only this user's recorded message text in this channel. MessageFilter.during sets its own independent window; omitted means ALL retained channel history up to query time, never the recent_chatters window. Never checks username/display name or metadata. any() means one message satisfies at least one clause; all() means one message satisfies every clause, not separate messages satisfying separate clauses. No relevant messages means no match. Returned user activity statistics still describe the candidate window. See [message filtering](../message-filtering).

**Errors:** Throws invalid_message_filter if the builder is empty, has more than 16 clauses, or a pattern is empty, contains NUL or exceeds 256 Unicode scalar values. Service validates again before querying. Explicit window must be 1..31,536,000 seconds; invalid values throw invalid_message_filter.

**Dry run:** Construction is pure; querying reads real recorded chat data, with identical filtering and no side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().messages(MessageFilter::any().contains("динозавр").starts_with("зверь").during(Duration::from_mins(10)));
```

Related APIs: [MessageFilter.any](./MessageFilter#any), [MessageFilter.all](./MessageFilter#all), [MessageFilter.during](./MessageFilter#during), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_messages {#min_messages}

```rhai
UserFilter.min_messages(minimum: integer) -> UserFilter
```

Compatibility shorthand: require activity in the candidate recent-chatters window.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Minimum messages in the outer recent-chatters window. |

**Returns:** `UserFilter`.

**Behavior and effects:** Preserved released behavior: this threshold counts ALL messages/recorded character counts in recent_chatters' candidate window. It does NOT use ActivityFilter's window. Prefer UserFilter.activity(ActivityFilter::create()...) for independent history windows. Combining this convenience method with .activity(...) ANDs both thresholds; the latter does not override it. Negative counts fail when querying. Builders return updated values: chain or assign. See [migration](../user-filtering#legacy-convenience-methods).

**Errors:** Negative counts fail at query, not construction.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().min_messages(2);
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [ActivityFilter.min_messages](./ActivityFilter#min_messages).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_characters {#min_characters}

```rhai
UserFilter.min_characters(minimum: integer) -> UserFilter
```

Compatibility shorthand: require activity in the candidate recent-chatters window.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Compatibility threshold: total recorded char_count in the candidate recent-chatters window. |

**Returns:** `UserFilter`.

**Behavior and effects:** Preserved released behavior: this threshold counts ALL messages/recorded character counts in recent_chatters' candidate window. It does NOT use ActivityFilter's window. Prefer UserFilter.activity(ActivityFilter::create()...) for independent history windows. Combining this convenience method with .activity(...) ANDs both thresholds; the latter does not override it. Negative counts fail when querying. Builders return updated values: chain or assign. See [migration](../user-filtering#legacy-convenience-methods).

**Errors:** Negative counts fail at query, not construction.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().min_characters(2);
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [ActivityFilter.min_characters](./ActivityFilter#min_characters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## reward_redemptions {#reward_redemptions}

```rhai
UserFilter.reward_redemptions(filter: RewardFilter) -> UserFilter
```

Attach an independent reward-history predicate.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `filter` | `RewardFilter` | Reward-history restriction combined with chat activity. |

**Returns:** `UserFilter`.

**Behavior and effects:** Returns an updated UserFilter; replaces its previous RewardFilter. ANDed with other user criteria. Uses RewardFilter.during when present; omitted means all retained history for this channel, preserving existing behavior, not the recent_chatters window. Zero min_count disables this predicate. Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window.

**Errors:** Negative min_count or an explicit window outside 60..31,536,000 seconds throws invalid_reward_filter at attachment/query.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().reward_redemptions(RewardFilter::create().min_count(1));
```

Related APIs: [RewardFilter.during](./RewardFilter#during), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## activity {#activity}

```rhai
UserFilter.activity(filter: ActivityFilter) -> UserFilter
```

Attach an independent activity-history predicate.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `filter` | `ActivityFilter` | Message/character thresholds with an optional independent during window. |

**Returns:** `UserFilter`.

**Behavior and effects:** Returns an updated UserFilter; replaces the previous ActivityFilter only. Does NOT replace legacy UserFilter.min_messages/min_characters; all criteria remain ANDed. ActivityFilter.during controls its own history window; omitted means all retained channel history. Returned user statistics still describe the candidate window. See [user filtering](../user-filtering).

**Errors:** Negative thresholds or explicit windows outside 1..31,536,000 seconds throw invalid_activity_filter.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().activity(ActivityFilter::create().min_messages(5).min_characters(500).during(Duration::from_mins(30)));
```

Related APIs: [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
