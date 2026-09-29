<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# log

## debug {#debug}

```rhai
debug(log, message: string) -> ()
```

Script execution log at debug level. Rhai 1.26.1 reserves debug in method position: use native function syntax debug(log, message), not log.debug(message).

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message` | `string` | At most 2,048 UTF-8 bytes. |

**Returns:** `()`.

**Behavior and effects:** Script execution log in Scripts > Logs. Logging at error level does not throw or automatically mark a successful execution failed. Ordinary successful executions are not INFO operational audits.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. log_message_limit.

**Dry run:** Records the log in the dry-run report.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
debug(log, "Observed event");
```

Related APIs: [log.info](./log#info), [log.warn](./log#warn), [log.error](./log#error).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## info {#info}

```rhai
log.info(message: string) -> ()
```

Write a info script log.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message` | `string` | At most 2,048 UTF-8 bytes. |

**Returns:** `()`.

**Behavior and effects:** Script execution log in Scripts > Logs. Logging at error level does not throw or automatically mark a successful execution failed. Ordinary successful executions are not INFO operational audits.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. log_message_limit.

**Dry run:** Records the log in the dry-run report.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
log.info("Observed event");
```

Related APIs: [log.debug](./log#debug), [log.warn](./log#warn), [log.error](./log#error).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## warn {#warn}

```rhai
log.warn(message: string) -> ()
```

Write a warn script log.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message` | `string` | At most 2,048 UTF-8 bytes. |

**Returns:** `()`.

**Behavior and effects:** Script execution log in Scripts > Logs. Logging at error level does not throw or automatically mark a successful execution failed. Ordinary successful executions are not INFO operational audits.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. log_message_limit.

**Dry run:** Records the log in the dry-run report.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
log.warn("Observed event");
```

Related APIs: [log.debug](./log#debug), [log.info](./log#info), [log.error](./log#error).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## error {#error}

```rhai
log.error(message: string) -> ()
```

Write a error script log.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `message` | `string` | At most 2,048 UTF-8 bytes. |

**Returns:** `()`.

**Behavior and effects:** Script execution log in Scripts > Logs. Logging at error level does not throw or automatically mark a successful execution failed. Ordinary successful executions are not INFO operational audits.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. log_message_limit.

**Dry run:** Records the log in the dry-run report.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
log.error("Observed event");
```

Related APIs: [log.debug](./log#debug), [log.info](./log#info), [log.warn](./log#warn).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
