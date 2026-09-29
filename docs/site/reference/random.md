<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# random

## pick {#pick}

```rhai
random.pick(items: array) -> value | ()
```

Choose a random element.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `items` | `array` | An array of any Rhai values. |

**Returns:** `value or ()`.

**Behavior and effects:** Empty array returns (). Nondeterministic both live and dry run. Local operation, not a host call; normal engine instruction/container limits still apply.

**Errors:** Throws if called on a capability other than random.

**Dry run:** Still random; a dry-run winner is not reserved for a live run.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
random.pick([#{id: "123", login: "viewer"}]);
```

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
