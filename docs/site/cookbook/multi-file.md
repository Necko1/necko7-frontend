<!-- Generated from docs/recipes.json, exercised by runtime tests. -->
# A project with event and timer modules

Imports resolve from the project root, including inside a module. Moving events/kills.rhai does not rewrite the main import. Save then Validate catches missing imports and even broken orphan files.

## main.rhai

```rhai
import "events/kills" as kills;
import "timers/reminder" as reminder;
fn on_event(ctx) { kills::handle(ctx); }
fn on_timer(ctx) { reminder::handle(ctx); }
```

## events/kills.rhai

```rhai
fn handle(ctx) {
    if ctx.event.kind == "player_kill" {
        storage.increment("kills", ctx.event.count);
        scheduler.after("reminder", Duration::from_mins(2), #{note: "Check your inventory"});
    }
}
```

## timers/reminder.rhai

```rhai
fn handle(ctx) {
    if ctx.timer.key == "reminder" { log.info(ctx.timer.payload.note); }
}
```

Save all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.
