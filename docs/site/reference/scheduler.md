<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->
# scheduler

## after {#after}

```rhai
scheduler.after(key: string, duration: Duration, payload: JSON value) -> JobResult
```

Schedule a durable one-shot timer.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |
| `duration` | `Duration` | Positive duration, at most 31,536,000 seconds (365 days). |
| `payload` | `JSON value` | Persisted JSON-safe payload, maximum 64 KiB. |

**Returns:** `JobResult: #{ok: true, id: string} live; #{ok: true, planned: true} dry run`.

**Behavior and effects:** Needs on_timer in the creating published revision. Key is project-local; replaces scheduled/blocked same-key jobs, preserving cancelled history. Queued work cannot be replaced. 256 live jobs/project including scheduled, blocked and queued. Job retains the exact creating revision across publish/rollback. No sleep in a worker.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry. missing_on_timer, invalid_job, scheduler_project_limit.

**Dry run:** Returns #{ok: true, planned: true}; does not persist a job or fully validate live revision/job quota.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
scheduler.after("winner", Duration::from_mins(2), #{reward: "secret_case"});
```

Related APIs: [scheduler.exists](./scheduler#exists), [scheduler.cancel](./scheduler#cancel).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## exists {#exists}

```rhai
scheduler.exists(key: string) -> bool
```

Check for a live job.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |

**Returns:** `bool`.

**Behavior and effects:** True for scheduled, blocked or queued; false for running/terminal records. Not a claim that the callback is safe to repeat.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Reads current channel/project data even in dry run.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
scheduler.exists("winner");
```

Related APIs: [scheduler.after](./scheduler#after), [scheduler.cancel](./scheduler#cancel).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).

## cancel {#cancel}

```rhai
scheduler.cancel(key: string) -> #{ok: bool}
```

Cancel a pending timer.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Non-empty project-local key, at most 128 UTF-8 bytes. |

**Returns:** `#{ok: bool}`.

**Behavior and effects:** Cancels scheduled/blocked jobs only. Queued/running work is not revoked. Returns ok even if nothing was changed; retains history.

**Errors:** Throws a Rhai runtime error on invalid arguments, host failures or exhausted budgets; see [errors](../errors). No automatic retry.

**Dry run:** Plans cancellation; live reads still see the original job.

**Budget:** 100 host calls total; 50 calls of this operation per execution.

```rhai
scheduler.cancel("winner");
```

Related APIs: [scheduler.after](./scheduler#after), [scheduler.exists](./scheduler#exists).

See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).
