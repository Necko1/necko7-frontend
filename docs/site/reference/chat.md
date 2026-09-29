<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# chat

## recent_chatters {#recent_chatters}

```rhai
chat.recent_chatters(window: Duration, filter: UserFilter) -> array<User>
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
chat.recent_chatters(Duration::from_mins(5), UserFilter::create().min_messages(2));
```

Related APIs: [chat.user_stats](./chat#user_stats), [chat.send](./chat#send), [chat.reply](./chat#reply).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## user_stats {#user_stats}

```rhai
chat.user_stats(user_id: string, window: Duration) -> UserStats
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
chat.user_stats("123", Duration::from_mins(5));
```

Related APIs: [chat.recent_chatters](./chat#recent_chatters), [chat.send](./chat#send), [chat.reply](./chat#reply).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## send {#send}

```rhai
chat.send(message: string) -> #{ok: bool, planned: bool}
```

Send to channel chat.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message` | `string` | Non-empty, at most 500 Unicode characters. |

**Returns:** `#{ok: bool, planned: bool}`.

**Behavior and effects:** 3 calls per execution. Network effects may already happen on a timeout; do not blindly retry.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. invalid_message.

**Dry run:** Records a planned action, sends nothing.

**Budget:** 100 host calls total; 3 calls of this operation per execution.

```rhai
chat.send("Nice round!");
```

Related APIs: [chat.recent_chatters](./chat#recent_chatters), [chat.user_stats](./chat#user_stats), [chat.reply](./chat#reply).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## reply {#reply}

```rhai
chat.reply(message_id: string, message: string) -> #{ok: bool, planned: bool}
```

Reply in channel chat.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message_id` | `string` | Twitch chat message ID to reply to; not a user ID. |
| `message` | `string` | Non-empty, at most 500 Unicode characters. |

**Returns:** `#{ok: bool, planned: bool}`.

**Behavior and effects:** 3 calls per execution, independently of chat.send. CS2 events do not contain a Twitch message ID.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. invalid_message.

**Dry run:** Records a planned reply, sends nothing.

**Budget:** 100 host calls total; 3 calls of this operation per execution.

```rhai
chat.reply("message-id", "Thanks!");
```

Related APIs: [chat.recent_chatters](./chat#recent_chatters), [chat.user_stats](./chat#user_stats), [chat.send](./chat#send).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
