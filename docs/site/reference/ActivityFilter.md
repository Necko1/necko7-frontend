<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# ActivityFilter

## create {#create}

```rhai
ActivityFilter::create() -> ActivityFilter
```

Construct an independent activity-history filter.

No parameters.

**Returns:** `ActivityFilter`.

**Behavior and effects:** Defaults min_messages=0, min_characters=0, no window. Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window. Count recorded channel messages and their stored Unicode character counts; no text restriction. Thresholds are ANDed; zero is known zero and does not require a message in that nested window. No follower/subscriber/role criteria.

**Errors:** No host call; pure value.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
ActivityFilter::create();
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_messages {#min_messages}

```rhai
ActivityFilter.min_messages(minimum: integer) -> ActivityFilter
```

Require this many recorded channel messages in the activity filter's history.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Nonnegative minimum; zero imposes no threshold. |

**Returns:** `ActivityFilter`.

**Behavior and effects:** Returns an updated builder. Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window. Both activity thresholds are ANDed; content matching does not limit which messages contribute. Last call replaces this threshold.

**Errors:** Negative counts throw invalid_activity_filter. Service validates again before SQL.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
ActivityFilter::create().min_messages(3).during(Duration::from_mins(30));
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## min_characters {#min_characters}

```rhai
ActivityFilter.min_characters(minimum: integer) -> ActivityFilter
```

Require this many stored Unicode characters across recorded messages in the activity filter's history.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `minimum` | `integer` | Nonnegative minimum; zero imposes no threshold. |

**Returns:** `ActivityFilter`.

**Behavior and effects:** Returns an updated builder. Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window. Both activity thresholds are ANDed; content matching does not limit which messages contribute. Last call replaces this threshold.

**Errors:** Negative counts throw invalid_activity_filter. Service validates again before SQL.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
ActivityFilter::create().min_characters(3).during(Duration::from_mins(30));
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## during {#during}

```rhai
ActivityFilter.during(window: Duration) -> ActivityFilter
```

Set the activity filter's independent history window.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `window` | `Duration` | 1..31,536,000 seconds; relative to query time, not candidate selection. |

**Returns:** `ActivityFilter`.

**Behavior and effects:** Its .during(...) window is independent of recent_chatters' candidate window. Omit .during(...) to inspect all retained channel history up to query time, not lifetime data that was never recorded. It never inherits the candidate window. Repeating .during(...) replaces the window. Positive Duration required; future records and other channels never count.

**Errors:** Invalid Duration construction throws. Invalid serialized windows or negative thresholds throw invalid_activity_filter.

**Dry run:** Pure construction; querying uses the same real recorded history without side effects.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
ActivityFilter::create().min_messages(3).during(Duration::from_mins(30));
```

Related APIs: [UserFilter.activity](./UserFilter#activity), [users.recent_chatters](./users#recent_chatters).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
