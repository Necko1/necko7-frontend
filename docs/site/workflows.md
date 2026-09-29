# Projects, tests and timers

## Draft versus live

Each channel supports up to 20 projects. A project owns a mutable draft, immutable revisions, enable state, storage, timers and logs. Shared channel data includes CS2 snapshots, match observations, rewards and chat history.

| Action | Effect |
| --- | --- |
| Save / Ctrl+S | Saves files to draft only, with optimistic version conflict protection |
| Validate | Compiles all saved files/imports, runs only pure module initialization, records diagnostics and handler detection |
| Publish | Validates under the project lock, creates an immutable revision, atomically activates it; failed publication preserves old live code |
| Activate an older version / rollback | Changes future event revision, leaves draft and existing timer pins unchanged |
| Enable | Admits future events for detected handlers; does not replay the past or auto-run overdue blocked jobs |
| Disable | Stops new event execution, preserves files/storage/history/jobs; overdue timers become blocked |
| Delete | Requires confirmation, hides live project access and cancels pending jobs; retained history is not a promise of automatic replay |

Stale draft versions produce a conflict rather than overwriting a concurrent Owner/Editor. At most 200 revisions/project. New projects are disabled. Validation compiles orphan files too. Host actions during module initialization are forbidden, even before live execution.

## Entrypoints and ordering

`fn on_event(ctx)` in the main entry receives each derived semantic CS2 event only when the project is enabled, not deleted, has an active revision and that revision declares the one-argument handler. There is no user subscription list. Zero-event sparse GSI payloads are normal and create no execution. Events from one payload share the same normalized before/after state; they are not separate per-event game snapshots.

Two bounded workers can execute different projects. A project lock serializes its admitted executions in durable sequence order. Different projects do not have a shared execution order or shared storage transaction. Source admission captures the revision; publishing afterward does not rewrite queued work. The pending queue cap is 1,000/project; overflow is logged and truncated, not replayed from guessed events.

## Durable timers

[`scheduler.after`](./reference/scheduler#after) persists a project-local key, payload, due time and creating revision. It invokes `on_timer(ctx)` from that exact revision once, including after restart or newer publication. Replacing the same scheduled/blocked key cancels the old job; already queued work cannot be replaced. `exists` includes scheduled, blocked and queued records. `cancel` affects scheduled/blocked records, not queued/running work.

Disable also blocks [`rewards.enable_for`](./reference/rewards#enable_for)'s internal hide-reward job. A reward can remain visible until manual action. Expired blocked jobs do not auto-run after re-enable; future unexpired scheduled jobs resume normally. **Run now** confirms `RUN`, can execute a disabled project's pinned version, and consumes that one-shot job. It is not a preview. **Cancel** keeps history. There is no recurring/sleep timer API.

A live timer context has `timer`, `source`, `meta`, `actor_type`, but **no automatic state, previous or current_match**. Copy required known values into a JSON-safe payload, or query available host data at execution time. See [context shapes](./reference/data).

## Dry run

Runs the saved **draft** for chosen `on_event` or `on_timer`, compiles all files, applies ordinary sandbox/host budgets, and records actions/logs/errors. It sends no chat, changes no live rewards, buys nothing, admits no fulfillment/inventory, persists no jobs and changes no stored keys.

Storage has a private read-after-write overlay including deletes/increments. Other reads still reflect live state: planned reward/scheduler mutations do not change later `get`/`exists` reads. Random choices remain nondeterministic. Chat eligibility and current purchase counts can be checked, but dry run reserves no capacity. Buyer, market and delivery results are not simulated or guaranteed. Aggregate storage/job/revision quota enforcement is not fully simulated; do not treat a planned action as proof of admission.

## Reports and failures

**Scripts > Logs** stores execution, Validate/Publish and dry-test reports with metadata, logs, planned/real actions, errors and duration. Search filters retained history before the bounded 200-result limit. Execution reports retain 30 days; unreferenced terminal jobs 30 days and unreferenced snapshots seven days, pruned hourly in bounded batches. Revisions are retained for rollback and pinned jobs. There is no unbounded paginated history API yet.

Operational channel logs retain project lifecycle, explicit manual scheduler actions, actual reward/chat/fulfillment/inventory effects, attribution and execution failures requiring attention. Ordinary successful event executions do not create INFO `script.execution` spam. `log.error` is a script log, not an exception by itself.

Durable running markers survive restart. Interrupted work is marked interrupted and not replayed automatically: external effects may already exist. Host timeouts are ambiguous. There is no distributed transaction across PostgreSQL, Twitch and Market. Inspect reports/inventory and reconcile before retrying. [Structured results](./errors) explains this distinction.
