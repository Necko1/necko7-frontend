<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# users

## recent_chatters {#recent_chatters}

```rhai
users.recent_chatters(window: Duration, filter: UserFilter) -> array<User>
```

Query eligible recent channel chatters.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `window` | `Duration` | 60..31,536,000 seconds, evaluated relative to query time. |
| `filter` | `UserFilter` | Create with UserFilter::create(); chain criteria. |

**Returns:** `array<User>`.

**Behavior and effects:** At most 1,000 users, newest last_activity first, then ID. Activity must fall inside the chat window. Reward criteria are ANDed with message/character thresholds. Subscription/follower/role data is not available.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. invalid_chat_window, invalid_reward_filter.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
users.recent_chatters(Duration::from_mins(5), UserFilter::create().min_messages(2));
```

Related APIs: [users.user_stats](./users#user_stats).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## user_stats {#user_stats}

```rhai
users.user_stats(user_id: string, window: Duration) -> UserStats
```

Read channel activity for a user.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `user_id` | `string` | Twitch user ID, not @login. |
| `window` | `Duration` | 60..31,536,000 seconds. |

**Returns:** `UserStats`.

**Behavior and effects:** Returns messages, characters, first_activity, last_activity and redemptions {total, completed, script} in the window. No activity gives zero counts and () timestamps; login may be absent. Does not establish account eligibility.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. invalid_chat_window.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
users.user_stats("123", Duration::from_mins(5));
```

Related APIs: [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
