# Filter chatters by message content

Use a dedicated `MessageFilter` inside `UserFilter.messages(...)`. It checks **recorded message text authored by a chatter in this channel within its own optional `.during(...)` window**, never usernames, display names, user IDs or other metadata. Without `.during(...)`, it checks **all retained channel history**, not the candidate window. It is a query over stored chat, not a new chat-message event or a live message listener.

```rhai
let filter = UserFilter::create()
    .messages(
        MessageFilter::any()
            .contains("динозавр")
            .starts_with("зверь")
            .during(Duration::from_mins(10))
    );
let users = chat.recent_chatters(Duration::from_mins(2), filter);
```

This selects candidates who chatted in the **last two minutes**, then requires a message containing `динозавр` **or** starting with `зверь` in the **last ten minutes**. The windows are independent. It also matches `ДИНОЗАВР` and `ЗВЕРЬ`: matching ignores case by default. See [user filtering and independent windows](./user-filtering).

## OR and AND mean conditions on one message

- **`MessageFilter::any()`**: at least one relevant message must satisfy **at least one** clause (OR).
- **`MessageFilter::all()`**: at least one relevant message must satisfy **every** clause **in that same message** (AND). Other messages by that user do not have to match.

```rhai
let filter = UserFilter::create().messages(
    MessageFilter::all()
        .starts_with("зверь")
        .contains("динозавр")
        .during(Duration::from_mins(10))
);
```

`зверь динозавр` passes. A user who wrote `зверь здесь` and, separately, `это динозавр` does **not** pass: no single message satisfies both clauses. A user with no messages in the filter's own window never passes. Records older than an explicit window, future-dated records and another channel's messages do not participate. Without `.during(...)`, older retained messages do participate.

There is no nesting or mixed AND/OR grouping in this API. Choose `any()` or `all()` for the entire builder. Calling `.messages(...)` again replaces the previously attached message filter.

## Literal text operations

- **`contains(text)`**: text anywhere in the message.
- **`starts_with(text)`**: text at the very beginning, including any leading whitespace.
- **`ends_with(text)`**: text at the very end, including any trailing whitespace.
- **`equals(text)`**: the entire message; extra punctuation or spaces do not match.

Patterns are literal: `%`, `_`, `\` and punctuation have no special matching meaning. Regex is not supported. Neither pattern nor message is trimmed, transliterated or Unicode-normalized. `equals("динозавр")` does not match ` динозавр` or `динозавр!`. Whitespace-only patterns are allowed and are literal whitespace.

## Case sensitivity and Unicode

**`case_sensitive(false)` is the default.** It applies to **every** clause, including clauses added before the call. `case_sensitive(true)` preserves case for every clause. Builders return updated values: chain them or assign the result. If the setting is repeated, the last setting wins.

```rhai
let sensitive = MessageFilter::all()
    .contains("динозавр")
    .case_sensitive(true)
    .starts_with("зверь");

// Both clauses ignore case again, including the earlier contains clause.
let insensitive = sensitive.case_sensitive(false);
```

In insensitive mode, `ДИНОЗАВР` matches `динозавр`, and `ЁЖ` matches `ёж`. In sensitive mode these differently-cased pairs do not match. UTF-8 text, including Cyrillic and emoji, is preserved.

Insensitive mode uses PostgreSQL `ILIKE` with the deterministic, locale-neutral ICU `und-x-icu` collation, rather than the database's potentially ASCII-only default locale. Sensitive mode uses `LIKE` with `C` collation and escaped literal patterns. This is PostgreSQL's case-insensitive matching, **not** a promise of full Unicode case-fold equivalence (`ß` is not generally interchangeable with `ss`), accent removal or equivalence between composed/decomposed Unicode sequences. See [PostgreSQL pattern matching](https://www.postgresql.org/docs/18/functions-matching.html).

For operators: the backend's PostgreSQL must provide the standard `und-x-icu` collation. The project's `postgres:18-alpine3.22` image includes it. A custom PostgreSQL installation without ICU is not supported for insensitive message filters; it fails the query rather than silently falling back to ASCII-only matching.

## Compose with activity and reward eligibility

```rhai
let filter = UserFilter::create()
    .activity(ActivityFilter::create().min_messages(3).min_characters(15)
        .during(Duration::from_mins(30)))
    .messages(MessageFilter::any().contains("динозавр")
        .during(Duration::from_mins(5)))
    .reward_redemptions(
        RewardFilter::create().reward("entry_reward")
            .statuses(["COMPLETED"]).min_count(1)
            .during(Duration::from_days(7))
    );
let users = chat.recent_chatters(Duration::from_mins(1), filter);
```

All user-level criteria are ANDed. Candidates chatted in one minute; activity thresholds count all messages in 30 minutes; content is checked over five minutes; reward history over seven days. Returned `messages`, `characters`, `first_activity` and `last_activity` describe **all messages in the candidate window**, not the nested filter windows or only matching content. Without `.during(...)`, each nested filter independently uses all retained channel history. Legacy `UserFilter.min_messages/min_characters` still use the candidate window; [migration details](./user-filtering#legacy-convenience-methods).

The query returns each user once, up to 1,000 users, newest `last_activity` first and then ID. It never exposes unbounded raw chat history to Rhai. `users.recent_chatters` is an alias with the same semantics. Dry run reads real recorded chat and applies the same filters, without sending messages or changing rewards.

## Limits and failures

Attach **1–16 clauses**. Each text pattern must contain **1–256 Unicode scalar values** (characters, not UTF-8 bytes or grapheme clusters). Empty text, NUL and a seventeenth clause throw `invalid_message_filter`. An empty `any()` or `all()` may be constructed, but cannot be attached to a `UserFilter`; it is not a match-all filter. To query without content restrictions, omit `.messages(...)`.

Patterns are validated at construction/attachment and again in the service before SQL. Values are SQL parameters, never interpolated SQL. MessageFilter's explicit window accepts 1 second to one year; omitted means all retained history. The candidate window remains 60 seconds to one year. Repeating `.during(...)` replaces only this filter's window. Existing execution/host timeouts still apply; all-history scans do not mean unbounded script memory. Catch errors only when you have a useful recovery action; see [failures](./errors) and [limits](./limits).

Continue with the [MessageFilter API](./reference/MessageFilter), [UserFilter API](./reference/UserFilter), [chat query](./reference/chat#recent_chatters) or [complete keyword giveaway recipe](./cookbook/message-keyword-draw).
