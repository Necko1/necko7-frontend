<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# Duration

## from_secs {#from_secs}

```rhai
Duration::from_secs(amount: integer) -> Duration
```

Create an explicit duration.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `amount` | `integer` | Positive integer multiplied by 1; checked overflow. |

**Returns:** `Duration`.

**Behavior and effects:** Result must be 1..31,536,000 seconds. Fractional input, zero, negative and excessive values fail. Chat/reward-filter windows must be at least 60 seconds; scheduler supports 1 second.

**Errors:** Throws: Duration must be positive and at most one year.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
Duration::from_secs(1);
```

Related APIs: [Duration.from_mins](./Duration#from_mins), [Duration.from_hours](./Duration#from_hours), [Duration.from_days](./Duration#from_days), [Duration.from_weeks](./Duration#from_weeks).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## from_mins {#from_mins}

```rhai
Duration::from_mins(amount: integer) -> Duration
```

Create an explicit duration.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `amount` | `integer` | Positive integer multiplied by 60; checked overflow. |

**Returns:** `Duration`.

**Behavior and effects:** Result must be 1..31,536,000 seconds. Fractional input, zero, negative and excessive values fail. Chat/reward-filter windows must be at least 60 seconds; scheduler supports 1 second.

**Errors:** Throws: Duration must be positive and at most one year.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
Duration::from_mins(1);
```

Related APIs: [Duration.from_secs](./Duration#from_secs), [Duration.from_hours](./Duration#from_hours), [Duration.from_days](./Duration#from_days), [Duration.from_weeks](./Duration#from_weeks).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## from_hours {#from_hours}

```rhai
Duration::from_hours(amount: integer) -> Duration
```

Create an explicit duration.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `amount` | `integer` | Positive integer multiplied by 3600; checked overflow. |

**Returns:** `Duration`.

**Behavior and effects:** Result must be 1..31,536,000 seconds. Fractional input, zero, negative and excessive values fail. Chat/reward-filter windows must be at least 60 seconds; scheduler supports 1 second.

**Errors:** Throws: Duration must be positive and at most one year.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
Duration::from_hours(1);
```

Related APIs: [Duration.from_secs](./Duration#from_secs), [Duration.from_mins](./Duration#from_mins), [Duration.from_days](./Duration#from_days), [Duration.from_weeks](./Duration#from_weeks).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## from_days {#from_days}

```rhai
Duration::from_days(amount: integer) -> Duration
```

Create an explicit duration.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `amount` | `integer` | Positive integer multiplied by 86400; checked overflow. |

**Returns:** `Duration`.

**Behavior and effects:** Result must be 1..31,536,000 seconds. Fractional input, zero, negative and excessive values fail. Chat/reward-filter windows must be at least 60 seconds; scheduler supports 1 second.

**Errors:** Throws: Duration must be positive and at most one year.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
Duration::from_days(1);
```

Related APIs: [Duration.from_secs](./Duration#from_secs), [Duration.from_mins](./Duration#from_mins), [Duration.from_hours](./Duration#from_hours), [Duration.from_weeks](./Duration#from_weeks).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## from_weeks {#from_weeks}

```rhai
Duration::from_weeks(amount: integer) -> Duration
```

Create an explicit duration.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `amount` | `integer` | Positive integer multiplied by 604800; checked overflow. |

**Returns:** `Duration`.

**Behavior and effects:** Result must be 1..31,536,000 seconds. Fractional input, zero, negative and excessive values fail. Chat/reward-filter windows must be at least 60 seconds; scheduler supports 1 second.

**Errors:** Throws: Duration must be positive and at most one year.

**Dry run:** Pure construction, identical behavior.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
Duration::from_weeks(1);
```

Related APIs: [Duration.from_secs](./Duration#from_secs), [Duration.from_mins](./Duration#from_mins), [Duration.from_hours](./Duration#from_hours), [Duration.from_days](./Duration#from_days).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
