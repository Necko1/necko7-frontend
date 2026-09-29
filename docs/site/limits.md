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
| Execution deadline | 3 seconds, including validation in execution |
| Host operation timeout | At most 2 seconds and remaining execution budget |
| Host calls | 100 total; 50 for each general operation |
| rewards.trigger | 3 calls/execution, also persisted-fulfillment rate check described below |
| chat.send / chat.reply | 3 calls each/execution |
| set_visible / set_paused / enable_for | 10 calls each/execution |
| Script log message | 2,048 bytes; counts toward host budgets |
| Chat message | 1..500 Unicode characters |

Local Duration/filter construction, random.pick and last_rounds do not use the host-call counter, but remain bounded by Rhai's engine limits. The trigger project rate check is at most ten existing fulfillment rows in the preceding minute; an eleventh admitted attempt is rejected while those rows remain recent. This is independent of per-execution budgets.

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
| Overview recent windows | 200 reports, 500 jobs/revisions, 2,000 keys, 30 snapshots; not an unlimited paginated browser |
| Execution search text | At most 128 characters, literal substring, not SQL wildcard syntax |
| Compiler/test workers / execution workers | 2 / 2 |

There is no whole-handler transaction across host operations. Storage writes/increments are atomic individual operations; an exception later in the handler does not undo prior live effects. Host timeout cancellation cannot guarantee that an external service stopped processing. Interrupted executions are not replayed automatically. Inspect evidence before retrying an ambiguous side effect.

Dry run has no real side effects but does not fully simulate all aggregate persistent quotas or market/buyer behavior. [Dry-run guide](./workflows#dry-run) explains those limits.
