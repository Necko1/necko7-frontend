<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Announce a local kill

Route the normalized event. count may be greater than one when several kills arrive in one update; it is not a victim list.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind == "player_kill" {
        chat.send(`Local kills this update: ${ctx.event.count}`);
        debug(log, `Cumulative kills: ${ctx.event.total}`);
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
