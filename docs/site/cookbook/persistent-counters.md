<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Keep persistent counters

Project storage survives revisions and restarts. increment is atomic; multiple calls are not one transaction. Dry run changes only its private overlay.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind == "player_kill" {
        let total = storage.increment("observed_kills", ctx.event.count);
        log.info(`Project has observed ${total} kills.`);
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
