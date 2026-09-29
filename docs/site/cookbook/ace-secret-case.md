<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Ace to delayed secret-case giveaway

For 5v5, an ace means at least five observed local round kills. In Wingman, choose a different threshold instead of claiming a two-kill round is a five-player ace. Configure secret_case with is_visible=false and is_paused=false. This example requires three messages and 15 characters in the previous five minutes plus one completed entry_reward redemption in seven days; remove the reward predicate for an open giveaway. Stable winner job key replaces an earlier pending giveaway, not already queued work. Reward triggers are never automatically announced or retried.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_ended" || ctx.current_match == () { return; }
    let rounds = ctx.current_match.last_rounds(1);
    if rounds.len == 0 { return; }
    let r = rounds[0];
    if r.player.kills == () || r.player.kills < 5 { return; }
    let key = ctx.event.session_id + ":" + r.index;
    if storage.get("last_ace", "") == key { return; }
    storage.set("last_ace", key);
    chat.send("Ace! A secret-case draw starts in two minutes.");
    scheduler.after("ace_giveaway", Duration::from_mins(2), #{alias: "secret_case"});
}

fn on_timer(ctx) {
    if ctx.timer.key != "ace_giveaway" { return; }
    let filter = UserFilter::create().min_messages(3).min_characters(15)
        .reward_redemptions(RewardFilter::create().reward("entry_reward")
            .statuses(["COMPLETED"]).min_count(1).during(Duration::from_days(7)));
    let viewers = chat.recent_chatters(Duration::from_mins(5), filter);
    let winner = random.pick(viewers);
    if winner == () {
        log.info("No eligible chatters; no reward triggered.");
        return;
    }
    let result = rewards.trigger(ctx.timer.payload.alias, winner.id);
    if result.ok {
        chat.send(`@${winner.login} won the secret case! Check your necko7 inventory.`);
    } else {
        let code = if result.contains("code") { result.code } else { "unknown_result" };
        log.warn(`Secret-case outcome: ${code}; inspect Scripts Logs and inventory before retrying.`);
        // One deliberate, neutral announcement; no per-error spam or automatic retrigger.
        chat.send("The draw finished, but the reward needs review. Check the channel inventory.");
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
