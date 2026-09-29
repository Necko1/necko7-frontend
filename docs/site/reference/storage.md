<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# storage

## get {#get}

```rhai
storage.get(key: string) -> JSON value | ()
```

Read project storage.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |

**Returns:** `JSON value or ()`.

**Behavior and effects:** Missing key returns (). A stored JSON null also becomes ().

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
storage.get("counter");
```

Related APIs: [storage.get](./storage#get-default).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## get {#get-default}

```rhai
storage.get(key: string, default: JSON value) -> JSON value
```

Read with a default.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |
| `default` | `JSON value` | Used only when the key is absent/deleted, not when its stored value is null. |

**Returns:** `JSON value`.

**Behavior and effects:** Dry-run deleted keys use the default; reads see that run's storage overlay.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
storage.get("counter", 0);
```

Related APIs: [storage.get](./storage#get), [storage.set](./storage#set), [storage.delete](./storage#delete), [storage.increment](./storage#increment).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## set {#set}

```rhai
storage.set(key: string, value: JSON value) -> JSON value
```

Persist a value.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |
| `value` | `JSON value` | Unit/null, bool, integer/float, string, array or map; no native Duration/filter objects. |

**Returns:** `JSON value`.

**Behavior and effects:** Returns the written value. Each write is atomic, not a transaction spanning the entire handler. Project namespace survives publish/disable/restart; delete project removes live access. At most 64 KiB/value, 1 MiB and 1,024 keys/project. No TTL.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. storage_value_limit, storage_project_limit.

**Dry run:** Writes only to a private read-after-write overlay; project aggregate quotas are not fully simulated.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
storage.set("state", #{wins: 1});
```

Related APIs: [storage.get](./storage#get), [storage.get](./storage#get-default), [storage.delete](./storage#delete), [storage.increment](./storage#increment).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## delete {#delete}

```rhai
storage.delete(key: string) -> ()
```

Delete a key.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |

**Returns:** `()`.

**Behavior and effects:** Missing keys are safe. Does not affect other projects.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Deletes only in the dry-run overlay.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
storage.delete("state");
```

Related APIs: [storage.get](./storage#get), [storage.get](./storage#get-default), [storage.set](./storage#set), [storage.increment](./storage#increment).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## increment {#increment}

```rhai
storage.increment(key: string, amount: integer) -> integer
```

Atomically update a counter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |
| `amount` | `integer` | Signed increment, including negative or zero. |

**Returns:** `integer`.

**Behavior and effects:** Absent starts at zero. Existing value must be an integer. Checked 64-bit arithmetic, protected by a project quota lock; returns the new value.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. storage_not_integer, storage_integer_overflow.

**Dry run:** Checked update in the overlay, no persisted change.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
storage.increment("counter", 1);
```

Related APIs: [storage.get](./storage#get), [storage.get](./storage#get-default), [storage.set](./storage#set), [storage.delete](./storage#delete).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
