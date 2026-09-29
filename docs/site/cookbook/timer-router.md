<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Schedule and route one-shot work

Jobs retain their creating revision. This explicit hide timer requires on_timer and is useful when you need to store your own payload. exists includes blocked/queued jobs; cancel cannot stop already queued/running work.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind == "match_started" && !scheduler.exists("hide_drop") {
        rewards.set_visible("round_drop", true);
        scheduler.after("hide_drop", Duration::from_mins(2), #{alias: "round_drop"});
    }
}
fn on_timer(ctx) {
    if ctx.timer.key == "hide_drop" {
        rewards.set_visible(ctx.timer.payload.alias, false);
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
