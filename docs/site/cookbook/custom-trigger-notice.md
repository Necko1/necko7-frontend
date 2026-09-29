<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Replace a missing-trade-link notice

Specify suppressible template keys before rewards.trigger, then branch on the returned code and send your own message. The key trade_link_required affects only this SCRIPT fulfillment; inventory status and later order/trade tracking stay unchanged. Replace the example dashboard URL for your installation. If custom chat fails, the suppressed standard notice is not restored.

## main.rhai

```rhai
fn on_timer(ctx) {
    let user = ctx.timer.payload;
    let result = rewards.trigger("secret_case", user.id, ["trade_link_required"]);
    if result.ok {
        log.info("Prize admitted; delivery status remains in inventory.");
    } else if result.contains("code") && result.code == "trade_link_required" {
        chat.send(`@${user.login} Your secret prize is in inventory, but add a Steam trade link before delivery: https://xyan.necko.moe/inventory`);
    } else {
        let code = if result.contains("code") { result.code } else { "unknown_result" };
        log.warn(`Secret prize needs review: ${code}`);
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
