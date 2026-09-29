# Getting started

## Before your first script

An Owner or Editor can operate Scripts for the selected channel. Only the Owner manages desktop pairing. Have the Owner open **Scripts > CS2 Integration**, install/open the companion, and pair using the five-minute code. Read [access and pairing](./access). No source event is required to edit, validate or dry-test a script.

If the automation uses rewards, create/configure those rewards in the normal reward editor. Set a unique channel-scoped `script_alias`, for example `secret_case`. Aliases match `[a-z][a-z0-9_]{0,63}`. Titles and Twitch UUIDs are not aliases. Configure a hidden secret reward with `is_visible=false`, `is_paused=false`, and operationally active bot/reward. Hidden presentation does not bypass necko7 validations.

## Create and validate

1. Open **Scripts > Editor** and create a project. New projects start disabled.
2. Put the entry handler in `main.rhai`. Save the draft.
3. Validate to compile every file and resolve imports. Validation is not a live execution and does not prove reward availability or chat eligibility.

```rhai
fn on_event(ctx) {
    if ctx.event.kind == "player_kill" {
        log.info(`Observed ${ctx.event.count} local kills.`);
    }
}
```

Only a one-argument `on_event(ctx)` or `on_timer(ctx)` in the entry script is detected as a handler. Define a main handler that calls imported module functions; a handler hidden inside a module does not subscribe the main project.

Find all supported event kinds, exact payload fields and runnable handlers in [CS2 events and payloads](./reference/events). For example, [player_kill](./reference/events#player_kill) explains why `count` is kills added between updates while `total` is your player's kill total for the current match, not this round or lifetime.

## Test before real effects

Expand **Test draft**, choose CS2 event or Timer, and load a recorded event or supply normalized JSON. For the code above:

```json
{"event":{"kind":"player_kill","count":1,"total":8},"state":{},"previous":null,"current_match":null}
```

Run the dry test. Inspect logs, actions and errors in the report. It uses the saved draft, not your unsaved editor buffer. A fabricated test context is a test input, not proof that live GSI provides those fields. [Dry run](./workflows#dry-run) explains simulation limits.

## Publish, then enable

Publish validates again, creates an immutable live revision and makes it active. Confirm Enable to admit new events. Save alone never changes live code. Existing timers stay pinned to the revision that created them. Multiple enabled projects receive the same semantic events; their storage and job keys are independent.

Inspect **Scripts > Logs** after the first real events. Normal execution records live there, not in the channel's operational INFO audit feed. [Project workflows](./workflows) explains conflicts, rollback, disable and timers.

Next: [complete ace giveaway](./cookbook/ace-secret-case), [API reference](./reference/), [multi-file projects](./multi-file).
