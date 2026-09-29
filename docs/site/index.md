# necko7 scripting

Build channel automations from observed CS2 events, chat activity, rewards and durable timers. Scripts run native Rhai inside a bounded backend sandbox. The desktop companion supplies game observations; scripts never run on the streamer's computer.

## Start with an idea

| Your workflow | Where to begin |
| --- | --- |
| Announce a local kill | [Kill announcement](./cookbook/announce-kill) |
| Ace, wait two minutes, choose an eligible chatter, trigger a secret reward | [Complete delayed giveaway](./cookbook/ace-secret-case) |
| Open a reward for a short period | [Temporary reward](./cookbook/temporary-reward) |
| Remember a counter across streams | [Persistent storage](./cookbook/persistent-counters) |
| Organize a larger automation | [Multi-file guide](./multi-file) |

## Learn, look up, verify

- [Getting started](./getting-started): create, save, validate, test, publish, enable.
- [API reference](./reference/): every host function, builder, argument, return shape and constraint.
- [Rhai language](./language): the embedded version and official syntax resources.
- [Context and data shapes](./reference/data): event versus timer context, optional fields and unknown values.
- [CS2 events and payloads](./reference/events): every event, when it fires, exact fields, complete JSON and Rhai handlers.
- [Cookbook](./cookbook/): ten complete tested projects, including a multi-file example.
- [Access and pairing](./access): Owner and Editor responsibilities.

## A few important boundaries

Hidden rewards use a `script_alias` and **presentation visibility off**, not operational pause. A paused reward cannot be triggered. Unknown gameplay fields are not zero, and spectated teammate data is never local-player data. An admitted SCRIPT fulfillment can still require delivery or operator attention; a timeout is not proof that nothing happened.

Read [match observations](./matches), [failure handling](./errors) and [sandbox limits](./limits) before enabling an automation with real side effects.
