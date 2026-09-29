<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# MessageFilter

## any {#any}

```rhai
MessageFilter::any() -> MessageFilter
```

Start a message-content builder with OR composition.

No parameters.

**Returns:** `MessageFilter`.

**Behavior and effects:** A chatter matches if at least one of their recorded messages in this channel during this builder's own window satisfies at least one clause. Default case_sensitive=false. Add 1..16 clauses before attaching through UserFilter.messages; an empty builder is not a match-all filter. Builders return new values: chain or assign them. No username/display-name matching, regex or access to raw history. See [message filtering](../message-filtering). Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window.

**Errors:** No error constructing the empty value. Attaching an empty builder throws invalid_message_filter.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().contains("динозавр").starts_with("зверь");
```

Related APIs: [MessageFilter.all](./MessageFilter#all), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive), [UserFilter.messages](./UserFilter#messages), [MessageFilter.during](./MessageFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## all {#all}

```rhai
MessageFilter::all() -> MessageFilter
```

Start a message-content builder with AND composition on a single message.

No parameters.

**Returns:** `MessageFilter`.

**Behavior and effects:** A chatter matches if at least one of their recorded messages in this channel during this builder's own window satisfies EVERY clause at once. Different messages cannot satisfy different clauses: messages 'beast here' and 'a dinosaur' do not satisfy starts_with('beast') AND contains('dinosaur'); 'beast dinosaur' does. Does not require every message by the user to match. Default case_sensitive=false. Add 1..16 clauses before UserFilter.messages; no clauses is an error, not vacuous truth. See [message filtering](../message-filtering). Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window.

**Errors:** No error constructing the empty value. Attaching an empty builder throws invalid_message_filter.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::all().starts_with("зверь").contains("динозавр");
```

Related APIs: [MessageFilter.any](./MessageFilter#any), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive), [UserFilter.messages](./UserFilter#messages), [MessageFilter.during](./MessageFilter#during).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## contains {#contains}

```rhai
MessageFilter.contains(text: string) -> MessageFilter
```

Add a literal substring clause for message text.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `text` | `string` | Literal substring, 1..256 Unicode scalar values; NUL is forbidden. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Return an updated builder. Match text anywhere within ONE message. Whitespace is not trimmed; %, _ and backslash are literal, not wildcards. No regex. Default case-insensitive Unicode comparison uses PostgreSQL ILIKE with deterministic ICU und-x-icu collation; case_sensitive(true) uses exact, case-sensitive text comparison. No accent removal, Unicode normalization or general equivalence of different spellings. At most 16 clauses. User eligibility follows any()/all() composition, not username/display name.

**Errors:** Throws invalid_message_filter for an empty/NUL/over-256-character pattern or a seventeenth clause.

**Dry run:** Pure construction. Query semantics are identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().contains("динозавр");
```

Related APIs: [MessageFilter.starts_with](./MessageFilter#starts_with), [MessageFilter.equals](./MessageFilter#equals), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## starts_with {#starts_with}

```rhai
MessageFilter.starts_with(text: string) -> MessageFilter
```

Add a literal prefix clause anchored to the beginning of a message.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `text` | `string` | Literal prefix, 1..256 Unicode scalar values; NUL is forbidden. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Return an updated builder. 'зверь здесь' matches 'зверь'; 'это зверь' and ' зверь' do not. Whitespace is not trimmed; %, _ and backslash are literal. Default case-insensitive Unicode comparison is controlled for all clauses by case_sensitive(bool). No regex, accent removal or Unicode normalization. At most 16 clauses; any()/all() apply to one message at a time.

**Errors:** Throws invalid_message_filter for an empty/NUL/over-256-character pattern or a seventeenth clause.

**Dry run:** Pure construction. Query semantics are identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().starts_with("зверь");
```

Related APIs: [MessageFilter.ends_with](./MessageFilter#ends_with), [MessageFilter.contains](./MessageFilter#contains), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## ends_with {#ends_with}

```rhai
MessageFilter.ends_with(text: string) -> MessageFilter
```

Add a literal suffix clause anchored to the end of a message.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `text` | `string` | Literal suffix, 1..256 Unicode scalar values; NUL is forbidden. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Return an updated builder. 'это зверь' matches 'зверь'; 'зверь здесь' and 'зверь ' do not. Whitespace is not trimmed; %, _ and backslash are literal. Default case-insensitive Unicode comparison is controlled for all clauses by case_sensitive(bool). No regex, accent removal or Unicode normalization. At most 16 clauses; any()/all() apply to one message at a time.

**Errors:** Throws invalid_message_filter for an empty/NUL/over-256-character pattern or a seventeenth clause.

**Dry run:** Pure construction. Query semantics are identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().ends_with("динозавр");
```

Related APIs: [MessageFilter.starts_with](./MessageFilter#starts_with), [MessageFilter.equals](./MessageFilter#equals), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## equals {#equals}

```rhai
MessageFilter.equals(text: string) -> MessageFilter
```

Add a whole-message equality clause.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `text` | `string` | Literal whole message, 1..256 Unicode scalar values; NUL is forbidden. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Return an updated builder. No substring/prefix/suffix match: 'динозавр' matches, 'динозавр!' and ' динозавр' do not. Whitespace is not trimmed; %, _ and backslash are literal. Default case-insensitive Unicode comparison is controlled for all clauses by case_sensitive(bool). No regex, accent removal or Unicode normalization. At most 16 clauses; any()/all() apply to one message at a time.

**Errors:** Throws invalid_message_filter for an empty/NUL/over-256-character pattern or a seventeenth clause.

**Dry run:** Pure construction. Query semantics are identical.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().equals("динозавр");
```

Related APIs: [MessageFilter.contains](./MessageFilter#contains), [MessageFilter.case_sensitive](./MessageFilter#case_sensitive), [UserFilter.messages](./UserFilter#messages).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## case_sensitive {#case_sensitive}

```rhai
MessageFilter.case_sensitive(enabled: bool) -> MessageFilter
```

Set the case mode for EVERY clause in this MessageFilter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `enabled` | `bool` | false (default): ignore case; true: preserve case in every text clause. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Return an updated builder; chain or assign it. Applies to clauses added both BEFORE and AFTER this call, not just the next clause; the last call wins. false is the default and uses PostgreSQL ILIKE with deterministic, locale-neutral ICU und-x-icu collation for Unicode case conversion: 'ДИНОЗАВР' matches 'динозавр', 'ЁЖ' matches 'ёж'. true uses LIKE under C collation for exact case-sensitive matching: those differently-cased pairs do not match. Text is retained as UTF-8, with no transliteration, accent removal, trimming or Unicode normalization; this is PostgreSQL ILIKE behavior, not a promise of full Unicode case-fold equivalence such as ß=ss. Patterns remain literal. Supported PostgreSQL deployments must provide the standard und-x-icu collation; the project's PostgreSQL Docker image does. See [message filtering](../message-filtering).

**Errors:** No error for a boolean. A non-boolean causes a Rhai type error. Empty builders still cannot be attached.

**Dry run:** Pure construction. Queries use the same real recorded chat data and case mode.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::all().contains("динозавр").case_sensitive(true).starts_with("зверь");
```

Related APIs: [MessageFilter.any](./MessageFilter#any), [MessageFilter.all](./MessageFilter#all), [MessageFilter.contains](./MessageFilter#contains).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## during {#during}

```rhai
MessageFilter.during(window: Duration) -> MessageFilter
```

Set the message-content filter's independent history window.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `window` | `Duration` | 1..31,536,000 seconds; relative to query time independently of candidate selection. |

**Returns:** `MessageFilter`.

**Behavior and effects:** Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window. any()/all() test authored text within this window. No change to composition, case_sensitive mode or returned candidate-window statistics. No matches without a relevant message.

**Errors:** Invalid Duration construction throws. Invalid serialized windows throw invalid_message_filter; empty/oversized/invalid clauses remain errors when attaching.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
MessageFilter::any().contains("динозавр").during(Duration::from_mins(10));
```

Related APIs: [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
