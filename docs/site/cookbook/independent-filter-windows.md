<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Combine four independent eligibility windows

Candidates must have chatted in the last minute, authored at least three messages and 15 characters in 30 minutes, written динозавр in five minutes, and completed two entry_reward redemptions in seven days. All requirements are ANDed. Omitting during on any nested filter instead reads all retained history for that criterion, never the candidate window. Result messages/characters describe the candidate minute only. This example logs eligibility without triggering real rewards.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_started" { return; }
    let filter = UserFilter::create()
        .activity(ActivityFilter::create().min_messages(3).min_characters(15)
            .during(Duration::from_mins(30)))
        .messages(MessageFilter::any().contains("динозавр").case_sensitive(false)
            .during(Duration::from_mins(5)))
        .reward_redemptions(RewardFilter::create().reward("entry_reward")
            .statuses(["COMPLETED"]).min_count(2).during(Duration::from_days(7)));
    let viewers = users.recent_chatters(Duration::from_mins(1), filter);
    log.info(`Four-window eligible viewers: ${viewers.len}`);
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
