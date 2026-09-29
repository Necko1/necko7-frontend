<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Filter by reward history

Both activity and redemption criteria must pass. min_count(0), the default, disables the redemption predicate. Empty statuses means all statuses; the redemption window is independent of the chat window.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_started" { return; }
    let reward_filter = RewardFilter::create().reward("entry_reward")
        .statuses(["COMPLETED"]).min_count(2).during(Duration::from_days(7));
    let filter = UserFilter::create().reward_redemptions(reward_filter);
    let viewers = chat.recent_chatters(Duration::from_mins(5), filter);
    log.info(`Eligible returning viewers: ${viewers.len}`);
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
