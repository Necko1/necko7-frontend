<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Inspect a recent round streak safely

An observed index is zero-based, not a guarantee that every real round was captured. Null sides/winners break the streak check rather than being filled with guesses; a CT/T relabel is not a score gain.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_ended" || ctx.current_match == () { return; }
    let recent = ctx.current_match.last_rounds(3);
    if recent.len != 3 { return; }
    let expected = recent[0].index;
    for r in recent {
        if r.index == () || r.index != expected { return; }
        if r.player.side == () || r.winner == () || r.player.side != r.winner { return; }
        expected += 1;
    }
    log.info("Three consecutive observed local-side wins.");
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
