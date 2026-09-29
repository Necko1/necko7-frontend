<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Choose a chatter by message content

After an observed round ends, wait two minutes and choose one chatter who wrote a message containing динозавр OR starting with зверь in this channel's previous ten minutes, among candidates who chatted in the last two minutes. Matching ignores case, including Cyrillic. Configure secret_case with is_visible=false and is_paused=false. This is a recorded-history filter, not a new chat-message event. Use MessageFilter::all() if one message must satisfy both clauses; separate messages cannot satisfy separate AND clauses. No matches means no trigger. One stable job key replaces a still-scheduled earlier draw. Failures are logged, not automatically retried or spammed to chat.

## main.rhai

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_ended" { return; }
    scheduler.after("keyword_draw", Duration::from_mins(2), #{alias: "secret_case"});
}

fn on_timer(ctx) {
    if ctx.timer.key != "keyword_draw" { return; }
    let filter = UserFilter::create()
        .messages(MessageFilter::any()
            .contains("динозавр")
            .starts_with("зверь")
            .case_sensitive(false)
            .during(Duration::from_mins(10)));
    let users = chat.recent_chatters(Duration::from_mins(2), filter);
    let winner = random.pick(users);
    if winner == () {
        log.info("No in-window message matched; no reward triggered.");
        return;
    }
    let result = rewards.trigger(ctx.timer.payload.alias, winner.id);
    if result.ok {
        chat.send(`@${winner.login} won the keyword draw! Check your necko7 inventory.`);
    } else {
        let code = if result.contains("code") { result.code } else { "unknown_result" };
        log.warn(`Keyword-draw reward needs review: ${code}. Inspect inventory before retrying.`);
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
