<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Open a reward temporarily

enable_for persists an internal reversal and needs no on_timer. Disabling the project blocks the hide, so review outstanding jobs before disabling. This only changes visibility, not pause.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind == "match_started" {
        rewards.enable_for("round_drop", Duration::from_mins(2));
        log.info("Reward visibility window requested.");
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
