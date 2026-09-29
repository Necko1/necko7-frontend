<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# users

## recent_chatters {#recent_chatters}

```rhai
users.recent_chatters(window: Duration, filter: UserFilter) -> array<User>
```

Select recent candidate chatters, then apply independent history filters.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `window` | `Duration` | 60..31,536,000 seconds. Select candidate users who authored recorded messages in this channel during this window, relative to query time. |
| `filter` | `UserFilter` | UserFilter criteria are ANDed after candidate selection; each nested filter has its own optional window. |

**Returns:** `array<User>`.

**Behavior and effects:** chat.recent_chatters and users.recent_chatters are aliases. The window selects candidates only: users with recorded channel messages between query time minus window and query time. ActivityFilter, MessageFilter and RewardFilter each use their own .during(...) window; without it they inspect all retained channel history, never implicitly the candidate window. All attached criteria are ANDed. Legacy UserFilter.min_messages/min_characters alone keep their released candidate-window semantics. Returned messages, characters, first_activity and last_activity always describe ALL messages in the candidate window, not the nested filters' windows or only text matches. One database query; at most 1,000 eligible users, newest last_activity first then ID; limit applies AFTER filtering. No qualifying candidates returns []. Future records, other channels and username/display-name text are excluded. No follower/subscriber/role filtering. See [user filtering](../user-filtering).

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. invalid_chat_window, invalid_reward_filter, invalid_activity_filter, invalid_message_filter.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
users.recent_chatters(Duration::from_mins(5), UserFilter::create().activity(ActivityFilter::create().min_messages(2).during(Duration::from_mins(30))));
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [UserFilter.messages](./UserFilter#messages), [UserFilter.reward_redemptions](./UserFilter#reward_redemptions).

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
