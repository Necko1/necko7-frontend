<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Choose a recent eligible chatter

Use query-time activity, not an event timestamp or guessed Twitch subscription state. random.pick returns () on empty arrays. user_stats redemptions covers the same window but does not prove completed Steam delivery.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_started" { return; }
    let filter = UserFilter::create().min_messages(5).min_characters(100);
    let candidates = users.recent_chatters(Duration::from_mins(5), filter);
    let winner = random.pick(candidates);
    if winner == () { log.info("Nobody meets the activity criteria."); return; }
    let activity = users.user_stats(winner.id, Duration::from_mins(5));
    log.info(`Picked ${winner.login}: ${activity.messages} messages.`);
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
