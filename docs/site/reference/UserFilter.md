<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# UserFilter

## create {#create}

```rhai
UserFilter::create() -> UserFilter
```

Construct an empty filter.

No parameters.

**Returns:** `UserFilter`.

**Behavior and effects:** Default message and character minima are zero; no reward restriction.

**Errors:** No host call; pure value.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create();
```

Related APIs: [UserFilter.min_messages](./UserFilter#min_messages), [UserFilter.min_characters](./UserFilter#min_characters), [UserFilter.reward_redemptions](./UserFilter#reward_redemptions).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_messages {#min_messages}

```rhai
UserFilter.min_messages(minimum: integer) -> UserFilter
```

Return an updated filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Minimum messages in the outer recent-chatters window. |

**Returns:** `UserFilter`.

**Behavior and effects:** Builder returns a new value; chain it or assign it. Counts must be nonnegative when queried. No follower/subscriber filter exists.

**Errors:** Negative counts fail at query, not construction.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().min_messages(2);
```

Related APIs: [UserFilter.create](./UserFilter#create), [UserFilter.min_characters](./UserFilter#min_characters), [UserFilter.reward_redemptions](./UserFilter#reward_redemptions).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_characters {#min_characters}

```rhai
UserFilter.min_characters(minimum: integer) -> UserFilter
```

Return an updated filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Minimum total recorded char_count in the outer window. |

**Returns:** `UserFilter`.

**Behavior and effects:** Builder returns a new value; chain it or assign it. Counts must be nonnegative when queried. No follower/subscriber filter exists.

**Errors:** Negative counts fail at query, not construction.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().min_characters(2);
```

Related APIs: [UserFilter.create](./UserFilter#create), [UserFilter.min_messages](./UserFilter#min_messages), [UserFilter.reward_redemptions](./UserFilter#reward_redemptions).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## reward_redemptions {#reward_redemptions}

```rhai
UserFilter.reward_redemptions(filter: RewardFilter) -> UserFilter
```

Return an updated filter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `filter` | `RewardFilter` | Reward-history restriction combined with chat activity. |

**Returns:** `UserFilter`.

**Behavior and effects:** Builder returns a new value; chain it or assign it. Counts must be nonnegative when queried. No follower/subscriber filter exists.

**Errors:** Negative counts fail at query, not construction.

**Dry run:** Identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
UserFilter::create().reward_redemptions(RewardFilter::create().min_count(1));
```

Related APIs: [UserFilter.create](./UserFilter#create), [UserFilter.min_messages](./UserFilter#min_messages), [UserFilter.min_characters](./UserFilter#min_characters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
