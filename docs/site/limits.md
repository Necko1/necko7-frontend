# Sandbox and limits

Scripts have no filesystem, network/raw HTTP, process/shell, raw database handle, environment variables, eval or native extension. Project-only imports do not grant filesystem access. The runtime is in-process with bounded workers, not an isolated OS process or a strict OS heap ceiling.

## Runtime limits

| Resource | Limit |
| --- | --- |
| Instructions / operations | 100,000 |
| Call levels | 32 |
| Expression depth | 64 global, 32 function |
| String size | 65,536 bytes |
| Array elements / map properties | 2,048 / 512 |
| Modules / import nesting | 64 / 16; circular imports rejected |
| Execution deadline | Project setting: 1..120 seconds; default 30, including validation and external waits |
| Host operation timeout | Project setting: 1..60 seconds; default 10, capped by remaining execution time |
| Compiler validation deadline | 3 seconds per validation engine; project settings do not raise compiler limits |
| Host calls | 100 total; 50 for each general operation |
| rewards.trigger | 3 calls/execution, also persisted-fulfillment rate check described below |
| chat.send / chat.reply | 3 calls each/execution |
| set_visible / set_paused / enable_for | 10 calls each/execution |
| Script log message | 2,048 bytes; counts toward host budgets |
| Chat message | 1..500 Unicode characters |

Local Duration/filter construction, random.pick and last_rounds do not use the host-call counter, but remain bounded by Rhai's engine limits. The trigger project rate check is at most ten existing fulfillment rows in the preceding minute; an eleventh admitted attempt is rejected while those rows remain recent. This is independent of per-execution budgets.

## Configure execution time

In **Scripts > Editor**, open the project's three-dot menu and choose **Execution limits**. Owner and Editor can save two whole-number values: maximum time for one `on_event`/`on_timer` invocation and maximum time for an individual external call (Twitch, Market or a database-backed host API). The call limit cannot exceed the execution limit.

For example, 30 seconds per execution and 10 seconds per call allow several network operations in one handler. A call started with only three seconds left gets at most those three seconds, not another ten. Raising time limits does not raise instructions, call counts, containers or any other quota. Underlying clients may still have their own shorter timeout; Market HTTP requests retain their 30-second client timeout.

Saving applies to executions that **start afterward**, including already queued events/jobs and Dry Run. A running execution keeps the values it started with. These are project settings, not source variables or revision content: no Publish is required, and publishing/rollback does not reset them. New and existing projects default to 30/10 seconds after the migration. Older reports do not retroactively acquire new limits. New execution reports and `ctx.meta.execution_limits` record the values actually used.

Execution time includes wall-clock waiting, not just computation. Longer runs delay the project's following events and occupy one bounded worker. Use [`scheduler.after`](./reference/scheduler#after) for a deliberate delay such as a two-minute giveaway instead of raising a handler deadline to wait. A timeout stops waiting, but cannot prove that Twitch/Market did not already receive a request; inspect the result before retrying. Earlier storage writes or other completed effects remain committed.

## Persistent and input quotas

| Resource | Limit |
| --- | --- |
| Projects/channel / revisions/project | 20 / 200 |
| Source files / combined source | 64 / 256 KiB |
| Stored path | 180 bytes, project-relative ASCII .rhai |
| Storage key / job key | Non-empty, at most 128 UTF-8 bytes |
| JSON-safe value / job payload | 64 KiB serialized |
| Storage/project | 1 MiB persisted JSON text, 1,024 keys |
| Live jobs/project | 256, including scheduled/blocked/queued |
| Pending event queue/project | 1,000; overflow diagnostic and truncation |
| Duration | 1..31,536,000 seconds; positive integer constructors only |
| Candidate chat / user_stats window | 60..31,536,000 seconds |
| ActivityFilter / MessageFilter explicit window | 1..31,536,000 seconds; omitted means all retained channel history |
| RewardFilter explicit window | 60..31,536,000 seconds; omitted means all retained channel history |
| Returned chat users | At most 1,000 |
| MessageFilter clauses / pattern | 1..16 clauses when attached; 1..256 Unicode scalar values per literal pattern; no NUL or regex |
| last_rounds argument | 0..256 |
| Match records | One active/channel, up to 30 completed matches |
| Round storage | Up to 256 completed observed rounds, 512 timeline events/round |
| Editor overview recent windows | 200 reports, 500 jobs/revisions, 2,000 keys, 30 snapshots |
| Logs / job attempt history pages | 50 reports/page in UI; API accepts 1..100; all predicates before cursor/limit |
| Execution search text | At most 128 characters, literal substring, not SQL wildcard syntax |
| Compiler/test workers / execution workers | 2 / 2 |

There is no whole-handler transaction across host operations. Storage writes/increments are atomic individual operations; an exception later in the handler does not undo prior live effects. Host timeout cancellation cannot guarantee that an external service stopped processing. Interrupted executions are not replayed automatically. Inspect evidence before retrying an ambiguous side effect.

Dry run has no real side effects but does not fully simulate all aggregate persistent quotas or market/buyer behavior. [Dry-run guide](./workflows#dry-run) explains those limits.
