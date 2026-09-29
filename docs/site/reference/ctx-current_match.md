<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# ctx.current_match

## last_rounds {#last_rounds}

```rhai
ctx.current_match.last_rounds(count: integer) -> array<RoundRecord>
```

Read the most recent completed observed rounds.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `count` | `integer` | 0..256, zero returns []. |

**Returns:** `array<RoundRecord>`.

**Behavior and effects:** Oldest to newest within the returned suffix. Missing observations are not invented. Check indices for consecutiveness. current_match may be () and must be guarded before calling.

**Errors:** Throws: Round count must be 0..256.

**Dry run:** Reads supplied test context.

**Budget:** Local engine operation, no host-call admission. Engine limits still apply.

```rhai
ctx.current_match.last_rounds(3);
```

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
