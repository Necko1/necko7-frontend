# Rhai language

necko7 embeds **Rhai 1.26.1**, pinned by the backend dependency and API catalog. Rhai is an embedded scripting language with Rust-like expression syntax, dynamic values, functions, arrays, object maps and imports. It is not JavaScript and not Rust.

## Official resources

- [The Rhai Book](https://rhai.rs/book/): language and embedding manual.
- [Variables](https://rhai.rs/book/language/variables.html), [functions](https://rhai.rs/book/language/functions.html), [arrays](https://rhai.rs/book/language/arrays.html) and [object maps](https://rhai.rs/book/language/object-maps.html).
- [Modules](https://rhai.rs/book/language/modules/index.html) and [imports](https://rhai.rs/book/language/modules/import.html).
- [Rhai 1.26.1 Rust API](https://docs.rs/rhai/1.26.1/rhai/): version-specific embedding details; not extra APIs available to your scripts.

The online Book may describe newer releases or embedding options that necko7 does not enable. For necko7 host functions use [our API reference](./reference/), not another application's Rhai bindings.

## Native syntax

```rhai
let filter = UserFilter::create().min_messages(3);
let viewers = chat.recent_chatters(Duration::from_mins(5), filter);
let winner = random.pick(viewers);
if winner != () { log.info(`Picked ${winner.login}`); }
```

Object maps use `#{key: value}`. JSON null becomes unit `()`. Optional map properties may be missing; guard with `map.contains("field")`. Standard map/array/string operations are Rhai language features, not new necko7 host capabilities.

`match` and `new` are reserved words. Use `ctx.current_match` and `UserFilter::create()` / `RewardFilter::create()`. The normalized game map is still named `match`, so use `ctx.state["match"]`. There is no pseudo-syntax preprocessor or token rewriting.

## necko7 restrictions

Imports resolve only from this project's stored files, relative to the **project root**, even inside a nested module. There is no filesystem, raw HTTP, process/shell, environment, raw database, eval or user-supplied native extension. Module initialization must be pure; call host capabilities inside functions/handlers.

Bare built-in `print` and `debug` output are suppressed; use `log.info/warn/error` and `debug(log, "message")` for script reports. Rhai 1.26.1 reserves `debug` in method position, so the logical log.debug operation must use that native function-call syntax; there is no token rewriting. There is no sleep: use `scheduler.after` and `on_timer`. Duration and filter objects are native host values and cannot be saved as JSON payloads/storage.

[Sandbox limits](./limits) apply to computation and host calls. Monaco offers lightweight completion/hover help, not a full Rhai language server with arbitrary variable type inference.
