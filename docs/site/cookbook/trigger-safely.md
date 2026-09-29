<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# Trigger a hidden reward without failure spam

Set script_alias=secret_case, visibility off, operational pause off, and ensure the bot/reward is active. Visibility does not prevent script-trigger. An unsuccessful result may include a fulfillment/inventory ID. Never retry an ambiguous result automatically.

## main.rhai

```rhai
fn on_timer(ctx) {
    let result = rewards.trigger("secret_case", ctx.timer.payload.user_id);
    if result.ok {
        log.info("Fulfillment admitted; inspect inventory for delivery.");
    } else {
        let code = if result.contains("code") { result.code } else { "unknown_result" };
        log.warn(`Trigger needs review: ${code}`);
        if result.contains("fulfillment_id") { log.info(result.fulfillment_id); }
    }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
