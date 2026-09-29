---
outline: 2
---
<!-- Generated from docs/events.json. Edit the backend catalog, then api:sync. -->
# CS2 events and payloads

Every currently implemented CS2 semantic event has its own section **on this page**. Find an event below, use the page outline, or search its exact name. Each section describes when it fires, every event-specific field, a full expandable JSON payload, a working Rhai handler and limitations. These are normalized necko7 events, not raw Valve GSI payloads.

- **Match and map:** [`map_changed`](#map_changed), [`map_phase_changed`](#map_phase_changed), [`match_started`](#match_started), [`match_ended`](#match_ended).
- **Rounds and score:** [`round_phase_changed`](#round_phase_changed), [`round_started`](#round_started), [`round_ended`](#round_ended), [`score_changed`](#score_changed).
- **Local player:** [`activity_changed`](#activity_changed), [`team_changed`](#team_changed), [`health_changed`](#health_changed), [`armor_changed`](#armor_changed), [`helmet_changed`](#helmet_changed), [`defuse_kit_changed`](#defuse_kit_changed), [`money_changed`](#money_changed), [`equipment_value_changed`](#equipment_value_changed), [`exposure_changed`](#exposure_changed).
- **Kills and statistics:** [`match_stats_changed`](#match_stats_changed), [`player_kill`](#player_kill), [`player_died`](#player_died), [`round_stats_changed`](#round_stats_changed).
- **Weapons and ammunition:** [`weapon_changed`](#weapon_changed), [`weapon_state_changed`](#weapon_state_changed), [`ammo_changed`](#ammo_changed).

## Reading an event {#reading-an-event}

Enabled projects with a one-argument `on_event(ctx)` receive semantic CS2 events. Put the handler in `main.rhai`; filter on `ctx.event.kind` **before accessing kind-specific fields**. Different event kinds have different fields. Timer work calls `on_timer(ctx)` with `ctx.timer`, not a CS2 event; see [project workflows](../workflows).

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "player_kill" { return; }
    let added = ctx.event.count;
    let total = ctx.event.total;
    log.info(`Added ${added} kills; ${total} kills in this match.`);
}
```

**What does "local" mean?** Your player on the paired CS2 client, verified against `provider.steamid`. Not a spectated teammate and not a Twitch viewer. If the viewed player's Steam ID differs, their stats are not used as yours. Match/round events can still occur with `player: null`.

**What period does a counter cover?**

- `player_kill.count`: kills added **between the two compared updates**. If your match kill total moves from 5 to 7, `count` is 2.
- `player_kill.total`: your player's CS2-reported kills **in the current match, across all rounds so far**. In that example, `total` is 7. It is not 7 kills this round, since connection, this stream or in your lifetime.
- `player_died.total` and `match_stats`: totals **for your player in the current match**. necko7 does not start them at zero when it connects halfway through a match.
- `round_stats.kills` / `round_stats.headshot_kills`: your player's totals **in this one real round**. For example, after that update you could have 3 round kills, 2 of them headshots, while your match kill total is 7.
- `round.completed_rounds`: how many game rounds have finished, **not** the current round number. Five completed rounds can mean the sixth round is being played.
- `match.score`: team score labelled **CT:T**, not your scoreboard points or fixed team identities. Sides swap at halftime.

Unknown JSON values are `null` and become Rhai `()`. Known zero is `0`; never replace unknown with zero. A first known value is not itself a change. In hand-entered dry-run contexts, optional fields may also be absent; check map membership before accessing them. See [context and data shapes](./data).

## Common envelope {#common-envelope}

Every full event has these top-level fields, alongside its kind-specific fields:

- `kind: string`: the event discriminator, such as `player_kill`.
- `device_id: string`: paired desktop UUID.
- `channel_id: string`: channel Twitch ID (a string, not a number).
- `session_id: string`: signed source-session UUID.
- `source_seq: integer`: signed source payload sequence. Several different events from one payload share this value; it is **not an event-unique ID**.
- `timestamp: string`: UTC RFC3339 observation time from the signed source envelope, not the exact time a shot or kill happened.
- `reliability: string`: currently `RELIABLE`; the derivation has supported evidence. This does not claim complete match coverage or exactly-once external script effects.
- `player: PlayerContext | null`: verified local `{steam_id: string, team: "ct" | "t" | null}`, or null if current local identity is unavailable. It is not the full player snapshot.
- `match: MatchState | null`: current observed map, mode, phase, CT:T score and team metadata. In Rhai use `ctx.event["match"]`, because `match` is reserved. See [MatchState fields](./data#ctx-state-match).
- `round: RoundState`: `{completed_rounds: integer | null, phase: "freeze_time" | "live" | "over" | null, winner: "ct" | "t" | null}`. A winner may arrive later or remain unknown.

For example, this is the **entire event**, not the entire execution context. It says two newly observed kills brought your match total to seven, with five completed rounds and CT:T score 3:2:

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 3,
      "t": 2
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 5,
    "phase": "live",
    "winner": null
  },
  "kind": "player_kill",
  "count": 2,
  "total": 7
}
```

The execution context wraps it as `ctx.event`. `ctx.state` is the normalized state **after** the source payload; `ctx.previous` is the state **before** it, or unit. `ctx.current_match` is the retained recorder view, including earlier trustworthy round data. Every event from a source payload uses the same before/after states: callbacks are not intermediate snapshots after each individual kill. See [ctx](./data#ctx), [ctx.event](./data#ctx-event), [match observations](../matches) and [dry-run contexts](../getting-started#test-before-real-effects).

## Shared types {#shared-types}

**`Change<T>`** has `previous: T` and `current: T`. It has **no `delta`**. Strings and booleans use this shape.

**`NumberChange`** has `previous: integer`, `current: integer` and `delta: integer`. Previous/current are nonnegative known values; delta is signed and equals current minus previous. Example: `{"previous":100,"current":73,"delta":-27}`. A nullable NumberChange is null when a value is unchanged **or** cannot be compared; null alone does not tell you which.

**`StatChange`** is a flat map with `stat: string`, `previous: integer`, `current: integer`, `delta: integer`. There is no nested `change` property inside an item. `match_stats_changed` uses `kills`, `deaths`, `assists`, `mvps`, `score`; `round_stats_changed` uses `round_kills`, `round_headshot_kills`. The previous/current values cover the period of that stat: this match or this round, respectively.

**`WeaponIdentity`** has `name: string` (for example `weapon_ak47`), `category: string` (observed Valve type, for example `Rifle`) and `finish: string | null` (reported paintkit). Name/category are observed strings, not a guaranteed exhaustive enum. Null finish means unknown; it does not prove a default skin. There is no weapon entity ID, owner or ammo in this type.

**String vocabularies:** `Team` is `ct`/`t`; `Activity` is `menu`/`playing`/`text_input`; `MatchPhase` is `warmup`/`live`/`intermission`/`game_over`; `RoundPhase` is `freeze_time`/`live`/`over`; `WeaponStatus` is `active`/`holstered`/`reloading`. These are case-sensitive normalized strings.

## Comparison rules and missing events {#comparison-rules}

Sparse/no-op GSI payloads can legitimately produce no events. Missing semantic events do not by themselves prove a transport gap, death or zero kills. Unknown fields and raw Valve `added`/`previously` delta markers are not used to invent observations.

An initial baseline, source-session change, observation gap over 90 seconds (source or provider time), clock regression, changed/missing authoritative provider identity, non-CS2 app ID or changed provider build suppresses event comparisons for that update. Duplicate/out-of-order source sequences do not produce new events. A source-sequence gap is diagnostic evidence of discontinuous delivery, but is not by itself a blanket reset of all otherwise comparable values.

**Local-player comparison rules** used by health/equipment/effects/stat/weapon/ammo events:

1. Both snapshots identify the same authoritative local player. A spectator switch or identity restoration creates a new local baseline; missed kills are not inferred from a teammate's values.
2. Both snapshots retain the same known map and mode, with known match phases, and there is no match-start/restart baseline.
3. A known team switch emits `team_changed` and stops other local player-delta comparisons for that payload.
4. Round phases and completed counters must show a comparable round: unchanged completed count without entering a new freeze period or leaving an already-over round; or a count advance of exactly one from a live round into over/game_over. This preserves an ending round's final changes without comparing a new round's reset counters as combat.
5. The individual values being compared must be known in both snapshots. Health, money, ammo or counter values appearing for the first time are not fabricated deltas.

**Ordering:** Each event gets a separate project dispatch. Within one comparable update, derivation orders map/match changes before round/score changes, then activity/team, health/equipment/effects, match stats, player_kill/player_died, round stats, and weapon/ammo. Not every kind appears. Projects serialize their admitted executions, but scripts should use the shared state/recorder evidence instead of treating this order as intermediate game state. Project enable/revision/queue admission also matters; see [execution workflows](../workflows).

There is no semantic `ace`, `headshot`, `player_hurt`, `damage_dealt`, `bomb_planted`, `bomb_defused` or `halftime` callback in this contract. Derive supported multi-kill conditions from known round kills, and inspect side-swap metadata for halftime. Victim/killer IDs, damage dealt, unsupported per-round assists, exact MVP timing and a guaranteed surrender reason are not supplied. [Ace recipe](../cookbook/ace-secret-case) and [safe round streaks](../cookbook/safe-round-streaks) show evidence-based handling.

## map_changed {#map_changed}

The observed map name changed between two known map snapshots.

**When emitted:** Both snapshots contain a map and their map names differ. A first map observation or disappearing map is not enough to produce this event. A map-context change establishes a new baseline for local gameplay deltas.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"map_changed"`.
- `change: Change<string>` - Previous and current observed map names, such as de_mirage and de_vertigo.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "map_changed",
  "change": {
    "previous": "de_mirage",
    "current": "de_vertigo"
  }
}
```

::: details Full event payload for map_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "map_changed",
  "change": {
    "previous": "de_mirage",
    "current": "de_vertigo"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "map_changed" { return; }
    log.info(`Map: ${ctx.event.change.previous} -> ${ctx.event.change.current}`);
}
```

**Important:** This is not match_started. Loading a map does not establish that a competitive match has begun.

Related events: [`map_phase_changed`](#map_phase_changed), [`match_started`](#match_started). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## map_phase_changed {#map_phase_changed}

The normalized match phase changed within the same known map and mode.

**When emitted:** Both map names and modes match, both phases are known, and the phase differs. The normalized vocabulary is warmup, live, intermission and game_over, not Valve's raw gameover spelling.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"map_phase_changed"`.
- `change: Change<MatchPhase>` - Previous and current phase: warmup, live, intermission or game_over.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "map_phase_changed",
  "change": {
    "previous": "warmup",
    "current": "live"
  }
}
```

::: details Full event payload for map_phase_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "map_phase_changed",
  "change": {
    "previous": "warmup",
    "current": "live"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "map_phase_changed" { return; }
    log.info(`Match phase: ${ctx.event.change.current}`);
}
```

**Important:** Intermission is a phase, not a match end. Changing map or losing map context does not guarantee a phase event. Match and round boundary events may accompany this event in the same source update.

Related events: [`match_started`](#match_started), [`match_ended`](#match_ended), [`round_ended`](#round_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## match_started {#match_started}

An observed warmup transitioned to live play.

**When emitted:** Within the same known map and mode, match phase changes from warmup to live. Joining an already-live match does not synthesize a match_started event.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"match_started"`.
- No additional fields. Use the common match/round context and the retained match observation.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "match_started"
}
```

::: details Full event payload for match_started
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "match_started"
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_started" { return; }
    log.info("Observed match start");
}
```

**Important:** No event-specific fields. The transition establishes a gameplay baseline; it does not manufacture kills or another round_started. Use ctx.current_match for the retained match observation, not an assumed complete history.

Related events: [`map_phase_changed`](#map_phase_changed), [`round_started`](#round_started), [`match_ended`](#match_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## match_ended {#match_ended}

Observed live play transitioned directly to game_over.

**When emitted:** Within the same known map and mode, match phase changes from live to game_over. A disconnect, map disappearance or intermission is not this semantic event.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"match_ended"`.
- No additional fields. Use the common match/round context and the retained match observation.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "match_ended"
}
```

::: details Full event payload for match_ended
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "t"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "game_over",
    "score": {
      "ct": 9,
      "t": 6
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 15,
    "phase": "freeze_time",
    "winner": "ct"
  },
  "kind": "match_ended"
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_ended" { return; }
    log.info("Observed game over; inspect the retained match summary");
}
```

**Important:** No event-specific fields. It can share a payload with the final round_ended, score_changed and local stat changes, even when round.phase is already freeze_time. It does not provide a surrender reason or prove all earlier rounds were observed. Read your retained totals for this match and their final/last-observed provenance in ctx.current_match.local_summary.

Related events: [`round_ended`](#round_ended), [`score_changed`](#score_changed), [`match_stats_changed`](#match_stats_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## round_phase_changed {#round_phase_changed}

The observed round phase changed in a comparable match context.

**When emitted:** The same known map/mode is retained, both round phases are known and different, and this is not a match-start/restart baseline. Values are freeze_time, live and over.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"round_phase_changed"`.
- `change: Change<RoundPhase>` - Previous and current normalized round phase: freeze_time, live or over.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "round_phase_changed",
  "change": {
    "previous": "freeze_time",
    "current": "live"
  }
}
```

::: details Full event payload for round_phase_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "round_phase_changed",
  "change": {
    "previous": "freeze_time",
    "current": "live"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_phase_changed" { return; }
    debug(log, `Round phase: ${ctx.event.change.current}`);
}
```

**Important:** A phase change alone is not a guaranteed round start or end. The stricter round_started/round_ended events verify match phase and completed-round evidence. Do not count every freeze_time transition as a new round, particularly at game over.

Related events: [`round_started`](#round_started), [`round_ended`](#round_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## round_started {#round_started}

An observed freeze period ended and the real round became live.

**When emitted:** Both match phases are live, round phase changes from freeze_time to live, and the known completed-round counter is unchanged. The same map/mode must be retained and this must not be a restart/start baseline.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"round_started"`.
- No additional fields. Use the common match/round context and the retained match observation.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "round_started"
}
```

::: details Full event payload for round_started
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "round_started"
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_started" { return; }
    let completed = ctx.event.round.completed_rounds;
    if completed != () {
        log.info(`Round live; ${completed} completed rounds observed`);
    }
}
```

**Important:** No event-specific fields. round.completed_rounds counts finished rounds, not the number of the round being played. A first observation already in live play does not fabricate a start event. Consult ctx.current_match.current_round for the recorder's round observation.

Related events: [`round_phase_changed`](#round_phase_changed), [`round_ended`](#round_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## round_ended {#round_ended}

A previously-live round has supported completion evidence.

**When emitted:** The previous match and round are live. The new match is live, intermission or game_over, and either (1) the new round phase is over with the known completed counter unchanged or advanced by one, or (2) the match becomes game_over and that counter advances by exactly one, even if the round phase is already freeze_time. The same map/mode must be retained without a restart/start baseline.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"round_ended"`.
- No additional fields. Use the common match/round context and the retained match observation.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "round_ended"
}
```

::: details Full event payload for round_ended
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 1,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 1,
    "phase": "over",
    "winner": "ct"
  },
  "kind": "round_ended"
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_ended" { return; }
    let winner = ctx.event.round.winner;
    if winner == () {
        log.info("Round ended; winner not yet known");
    } else {
        log.info(`Round ended; winning side: ${winner}`);
    }
}
```

**Important:** No event-specific fields. winner can still be unknown, and score/counter updates can arrive later. Do not require round.phase == over in your handler: the final game-over shape can use freeze_time. The recorder retains the correct round and accepts late boundary updates; no extra round is synthesized after game over. Local stats may come from earlier authoritative observations even if the boundary is spectating a teammate. Use the retained round, not an assumed local player at the boundary.

Related events: [`round_started`](#round_started), [`match_ended`](#match_ended), [`score_changed`](#score_changed), [`round_stats_changed`](#round_stats_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## score_changed {#score_changed}

At least one known CT/T score changed.

**When emitted:** The same known map/mode is retained without a match-start/restart baseline. At least one side has different numeric scores in both snapshots. Each side is compared independently.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"score_changed"`.
- `ct: NumberChange | null` - CT score change, or null if unchanged or not comparable.
- `t: NumberChange | null` - T score change, or null if unchanged or not comparable.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "score_changed",
  "ct": {
    "previous": 0,
    "current": 1,
    "delta": 1
  },
  "t": null
}
```

::: details Full event payload for score_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 1,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "score_changed",
  "ct": {
    "previous": 0,
    "current": 1,
    "delta": 1
  },
  "t": null
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "score_changed" { return; }
    if ctx.event.ct != () {
        log.info(`Observed CT score: ${ctx.event.ct.current}`);
    }
    if ctx.event.t != () {
        log.info(`Observed T score: ${ctx.event.t.current}`);
    }
}
```

**Important:** CT:T describes sides, not fixed rosters. A halftime relabel such as 2:6 -> 6:2 can produce positive and negative changes without awarding six points. This is not a standalone points-won event. Use retained rounds and side_swap_before for round progression. An unknown/unchanged side is null (Rhai unit), not a zero delta. Both sides may change in the same event.

Related events: [`round_ended`](#round_ended), [`team_changed`](#team_changed), [`match_ended`](#match_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## activity_changed {#activity_changed}

The verified local player's observed activity changed.

**When emitted:** The previous and current snapshots both identify the same authoritative local player, and both activities are known and different. Values are menu, playing and text_input (normalized from Valve textinput). This comparison can happen even when map context changes.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"activity_changed"`.
- `change: Change<Activity>` - Previous and current observed activity: menu, playing or text_input.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "activity_changed",
  "change": {
    "previous": "menu",
    "current": "playing"
  }
}
```

::: details Full event payload for activity_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "activity_changed",
  "change": {
    "previous": "menu",
    "current": "playing"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "activity_changed" { return; }
    debug(log, `Local activity: ${ctx.event.change.current}`);
}
```

**Important:** A spectator target's activity is not attributed to the local player. This is not a chat-message event; text_input does not provide typed text.

Related events: [`team_changed`](#team_changed), [`map_changed`](#map_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## team_changed {#team_changed}

The verified local player's side changed between CT and T.

**When emitted:** Comparable same-map/mode snapshots identify the same authoritative local player; both teams are known and differ. Match-start/restart baselines do not emit this event.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"team_changed"`.
- `change: Change<Team>` - Previous and current local side: ct or t.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "team_changed",
  "change": {
    "previous": "ct",
    "current": "t"
  }
}
```

::: details Full event payload for team_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "t"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "team_changed",
  "change": {
    "previous": "ct",
    "current": "t"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "team_changed" { return; }
    log.info(`Local side: ${ctx.event.change.previous} -> ${ctx.event.change.current}`);
}
```

**Important:** A side switch resets player-delta comparisons for this source update; health, ammo and stat changes are not inferred across it. Side switch is not evidence of a kill, death or awarded point. Match/round/score events may still accompany it. It does not describe teammate roster changes.

Related events: [`score_changed`](#score_changed), [`round_started`](#round_started). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## health_changed {#health_changed}

The local player's observed health changed within a comparable round.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both health values are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"health_changed"`.
- `change: NumberChange` - Previous/current health and signed delta. A decrease is not a damage-dealt event.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "health_changed",
  "change": {
    "previous": 100,
    "current": 73,
    "delta": -27
  }
}
```

::: details Full event payload for health_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "health_changed",
  "change": {
    "previous": 100,
    "current": 73,
    "delta": -27
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "health_changed" { return; }
    debug(log, `Local health: ${ctx.event.change.current}`);
}
```

**Important:** The event does not identify an attacker, damage source or damage dealt to another player. Reaching zero alone is not enough for player_died; death also needs a corroborating increment in your player's death counter for this match.

Related events: [`player_died`](#player_died), [`armor_changed`](#armor_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## armor_changed {#armor_changed}

The local player's observed armor changed within a comparable round.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both armor values are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"armor_changed"`.
- `change: NumberChange` - Previous/current armor and signed delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "armor_changed",
  "change": {
    "previous": 100,
    "current": 80,
    "delta": -20
  }
}
```

::: details Full event payload for armor_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "armor_changed",
  "change": {
    "previous": 100,
    "current": 80,
    "delta": -20
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "armor_changed" { return; }
    debug(log, `Local armor: ${ctx.event.change.current}`);
}
```

**Important:** An armor change does not establish whether damage, a purchase or another game mechanic caused it. Unknown armor is not known zero.

Related events: [`health_changed`](#health_changed), [`helmet_changed`](#helmet_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## helmet_changed {#helmet_changed}

The local player's known helmet flag changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both helmet flags are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"helmet_changed"`.
- `change: Change<bool>` - Previous/current helmet possession. There is no numeric delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "helmet_changed",
  "change": {
    "previous": true,
    "current": false
  }
}
```

::: details Full event payload for helmet_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "helmet_changed",
  "change": {
    "previous": true,
    "current": false
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "helmet_changed" { return; }
    debug(log, `Local helmet: ${ctx.event.change.current}`);
}
```

**Important:** The flag describes observed equipment, not an explicit purchase, sale or destruction event.

Related events: [`armor_changed`](#armor_changed), [`equipment_value_changed`](#equipment_value_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## defuse_kit_changed {#defuse_kit_changed}

The local player's known defuse-kit flag changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both defuse-kit flags are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"defuse_kit_changed"`.
- `change: Change<bool>` - Previous/current defuse-kit possession. There is no numeric delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "defuse_kit_changed",
  "change": {
    "previous": false,
    "current": true
  }
}
```

::: details Full event payload for defuse_kit_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "defuse_kit_changed",
  "change": {
    "previous": false,
    "current": true
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "defuse_kit_changed" { return; }
    debug(log, `Local defuse kit: ${ctx.event.change.current}`);
}
```

**Important:** This is equipment state, not a bomb-defuse event. No bomb planter, defuse progress or defuse result is included.

Related events: [`equipment_value_changed`](#equipment_value_changed), [`money_changed`](#money_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## money_changed {#money_changed}

The local player's observed in-game money changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both money values are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"money_changed"`.
- `change: NumberChange` - Previous/current CS2 money and signed delta; not Twitch points or necko7 inventory.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "money_changed",
  "change": {
    "previous": 1000,
    "current": 1300,
    "delta": 300
  }
}
```

::: details Full event payload for money_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "money_changed",
  "change": {
    "previous": 1000,
    "current": 1300,
    "delta": 300
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "money_changed" { return; }
    debug(log, `Local CS2 money: ${ctx.event.change.current}`);
}
```

**Important:** The delta does not identify its cause. Purchases, kill rewards and round economy can all affect money; do not infer a kill from money alone.

Related events: [`equipment_value_changed`](#equipment_value_changed), [`player_kill`](#player_kill). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## equipment_value_changed {#equipment_value_changed}

The local player's reported equipment value changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both equipment values are known and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"equipment_value_changed"`.
- `change: NumberChange` - Previous/current reported CS2 equipment value and signed delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "equipment_value_changed",
  "change": {
    "previous": 3700,
    "current": 2700,
    "delta": -1000
  }
}
```

::: details Full event payload for equipment_value_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "equipment_value_changed",
  "change": {
    "previous": 3700,
    "current": 2700,
    "delta": -1000
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "equipment_value_changed" { return; }
    debug(log, `Local equipment value: ${ctx.event.change.current}`);
}
```

**Important:** This is not a purchase list or inventory transaction. Missing weapons are not proof that items were dropped, and this value does not reveal which item changed.

Related events: [`money_changed`](#money_changed), [`weapon_changed`](#weapon_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## exposure_changed {#exposure_changed}

One reported local flash, smoke or burning exposure value changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and both values for the named effect are known and different. A payload changing several effects can emit several exposure_changed events.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"exposure_changed"`.
- `effect: string` - Exactly flash, smoke or burning.
- `change: NumberChange` - Previous/current reported exposure value for that effect and signed delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "exposure_changed",
  "effect": "flash",
  "change": {
    "previous": 0,
    "current": 80,
    "delta": 80
  }
}
```

::: details Full event payload for exposure_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "exposure_changed",
  "effect": "flash",
  "change": {
    "previous": 0,
    "current": 80,
    "delta": 80
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "exposure_changed" { return; }
    debug(log, `Local ${ctx.event.effect} exposure: ${ctx.event.change.current}`);
}
```

**Important:** Treat these as reported exposure units, not documented seconds, damage, a grenade entity or an attacker identity. A positive value is not a promise of any particular physical effect duration.

Related events: [`health_changed`](#health_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## match_stats_changed {#match_stats_changed}

One or more counters for your player in the current CS2 match changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold. Every changed counter known in both snapshots is included; unchanged/unknown counters are omitted from changes.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"match_stats_changed"`.
- `changes: array<StatChange>` - Non-empty changes for kills, deaths, assists, mvps and/or score accumulated by your player in this match (all rounds so far). Each entry contains stat, previous, current and signed delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "match_stats_changed",
  "changes": [
    {
      "stat": "kills",
      "previous": 0,
      "current": 2,
      "delta": 2
    },
    {
      "stat": "deaths",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "assists",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "mvps",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "score",
      "previous": 0,
      "current": 5,
      "delta": 5
    }
  ]
}
```

::: details Full event payload for match_stats_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "match_stats_changed",
  "changes": [
    {
      "stat": "kills",
      "previous": 0,
      "current": 2,
      "delta": 2
    },
    {
      "stat": "deaths",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "assists",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "mvps",
      "previous": 0,
      "current": 1,
      "delta": 1
    },
    {
      "stat": "score",
      "previous": 0,
      "current": 5,
      "delta": 5
    }
  ]
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "match_stats_changed" { return; }
    for item in ctx.event.changes {
        debug(log, `${item.stat}: ${item.previous} -> ${item.current} (${item.delta})`);
    }
}
```

**Important:** These are totals for this match, not this round, stream, project or lifetime. They are CS2-reported values, not counters starting when necko7 connected. Negative corrections are reported here; if any comparable match counter decreases, player_kill and player_died are suppressed for that update. There are no per-round assists or exact MVP-award timestamps. The last-authoritative/final match totals also live in the recorder's local_summary. Do not substitute spectator totals.

Related events: [`player_kill`](#player_kill), [`player_died`](#player_died), [`round_stats_changed`](#round_stats_changed), [`match_ended`](#match_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## player_kill {#player_kill}

CS2 reported an increase in your player's kill total for the current match.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold, known kills for this match increase, and no comparable match-stat counter decreases in the same update.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"player_kill"`.
- `count: integer` - How many kills were added between the two compared GSI updates. Always positive; can exceed one. If the match kill counter moves from 5 to 7, count is 2.
- `total: integer` - Your player's CS2-reported kill total for the current match, across all rounds so far. Not kills in this round, since necko7 connected, during this stream or over your lifetime. In the 5 -> 7 example, total is 7.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "player_kill",
  "count": 2,
  "total": 7
}
```

::: details Full event payload for player_kill
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 3,
      "t": 2
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 5,
    "phase": "live",
    "winner": null
  },
  "kind": "player_kill",
  "count": 2,
  "total": 7
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "player_kill" { return; }
    let added = ctx.event.count;
    let total = ctx.event.total;
    log.info(`Added ${added} kills; ${total} kills in this match.`);
}
```

**Important:** There is no victim, attacker object, weapon-at-kill or headshot flag. Use trustworthy round_stats_changed/current_match round data for headshot and multi-kill conditions. Do not assume one callback per victim, infer an ace from total, or add round_stats_changed to player_kill as if they were independent kills. Identity restoration or a new baseline does not infer missed kills.

Related events: [`round_stats_changed`](#round_stats_changed), [`match_stats_changed`](#match_stats_changed), [`player_died`](#player_died). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## player_died {#player_died}

Your player's death is corroborated by health and the death counter for the current match.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold, known health moves from a positive value to zero, deaths for this match increase by exactly one, and no comparable match-stat counter decreases.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"player_died"`.
- `total: integer` - Your player's CS2-reported death total for the current match, across all rounds so far. Not deaths this round, since necko7 connected or over your lifetime.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "player_died",
  "total": 1
}
```

::: details Full event payload for player_died
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "player_died",
  "total": 1
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "player_died" { return; }
    log.info(`Observed local death; match total ${ctx.event.total}`);
}
```

**Important:** Health zero alone, a death counter jump larger than one, or a switch to spectating does not generate this event. No killer, cause, weapon or death location is provided. Absence of an event does not prove survival when the relevant identity/boundary evidence is missing.

Related events: [`health_changed`](#health_changed), [`match_stats_changed`](#match_stats_changed), [`round_ended`](#round_ended). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## round_stats_changed {#round_stats_changed}

One or both authoritative local round kill counters changed.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold and known round kills/headshot kills differ. Every comparable changed counter is included.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"round_stats_changed"`.
- `changes: array<StatChange>` - Non-empty changes for round_kills and/or round_headshot_kills. Each entry contains stat, previous, current and signed delta.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "round_stats_changed",
  "changes": [
    {
      "stat": "round_kills",
      "previous": 0,
      "current": 2,
      "delta": 2
    },
    {
      "stat": "round_headshot_kills",
      "previous": 0,
      "current": 1,
      "delta": 1
    }
  ]
}
```

::: details Full event payload for round_stats_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "round_stats_changed",
  "changes": [
    {
      "stat": "round_kills",
      "previous": 0,
      "current": 2,
      "delta": 2
    },
    {
      "stat": "round_headshot_kills",
      "previous": 0,
      "current": 1,
      "delta": 1
    }
  ]
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "round_stats_changed" { return; }
    for item in ctx.event.changes {
        if item.stat == "round_kills" {
            log.info(`Local round kills: ${item.current}`);
        }
    }
}
```

**Important:** Names in this event are round_kills and round_headshot_kills; corresponding state fields are round_stats.kills and round_stats.headshot_kills. Negative observed corrections can appear. A next-round reset is not treated as combat. The recorder retains authoritative values seen before a spectator switch, so completed-round data can be known even when no local player is visible at the end. There are no per-round assists or damage fields.

Related events: [`player_kill`](#player_kill), [`round_ended`](#round_ended), [`match_stats_changed`](#match_stats_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## weapon_changed {#weapon_changed}

The unambiguously selected local weapon changed name or category.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold. Both inventories have exactly one non-holstered weapon (active or reloading), and the selected weapon name or category differs.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"weapon_changed"`.
- `change: Change<WeaponIdentity>` - Previous/current selected identities, each containing name, category and nullable finish.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "weapon_changed",
  "change": {
    "previous": {
      "name": "weapon_glock",
      "category": "Pistol",
      "finish": null
    },
    "current": {
      "name": "weapon_ak47",
      "category": "Rifle",
      "finish": null
    }
  }
}
```

::: details Full event payload for weapon_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "weapon_changed",
  "change": {
    "previous": {
      "name": "weapon_glock",
      "category": "Pistol",
      "finish": null
    },
    "current": {
      "name": "weapon_ak47",
      "category": "Rifle",
      "finish": null
    }
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "weapon_changed" { return; }
    debug(log, `Selected weapon: ${ctx.event.change.current.name}`);
}
```

**Important:** Inventory slot keys are not entity IDs. No weapon event is derived if selection is ambiguous or an inventory is unavailable. A finish-only change does not emit weapon_changed; ammo/status comparison is also suppressed when finishes differ. This is selection, not a pickup/drop/shot event.

Related events: [`weapon_state_changed`](#weapon_state_changed), [`ammo_changed`](#ammo_changed), [`equipment_value_changed`](#equipment_value_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## weapon_state_changed {#weapon_state_changed}

The selected local weapon's observed status changed without changing its identity.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold. Both snapshots have one unambiguous selected weapon; its name, category and finish match, but its status differs.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"weapon_state_changed"`.
- `weapon: WeaponIdentity` - Current selected identity: name, category and nullable finish.
- `change: Change<WeaponStatus>` - Previous/current normalized status. Vocabulary is active, holstered and reloading; see the selection limitation below.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "weapon_state_changed",
  "weapon": {
    "name": "weapon_ak47",
    "category": "Rifle",
    "finish": null
  },
  "change": {
    "previous": "active",
    "current": "reloading"
  }
}
```

::: details Full event payload for weapon_state_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "weapon_state_changed",
  "weapon": {
    "name": "weapon_ak47",
    "category": "Rifle",
    "finish": null
  },
  "change": {
    "previous": "active",
    "current": "reloading"
  }
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "weapon_state_changed" { return; }
    debug(log, `${ctx.event.weapon.name}: ${ctx.event.change.current}`);
}
```

**Important:** The selected-weapon comparison excludes holstered weapons. Although holstered is a valid normalized inventory status, this event currently derives active <-> reloading transitions; it is not a general event for every inventory status change. Reload status is observed, not a promise that a reload will complete.

Related events: [`weapon_changed`](#weapon_changed), [`ammo_changed`](#ammo_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.

## ammo_changed {#ammo_changed}

At least one ammo value changed for the same selected local weapon.

**When emitted:** The [local-player comparison rules](#comparison-rules) hold, both snapshots have one unambiguous selected weapon with matching name/category/finish, and at least one ammo value is known in both snapshots and different.

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- `kind: string` - always `"ammo_changed"`.
- `weapon: WeaponIdentity` - Current selected identity: name, category and nullable finish.
- `clip: NumberChange | null` - Clip change, or null if unchanged/not comparable.
- `capacity: NumberChange | null` - Clip-capacity change, or null if unchanged/not comparable.
- `reserve: NumberChange | null` - Reported reserve change, or null if unchanged/not comparable.

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a `payload` property.

```json
{
  "kind": "ammo_changed",
  "weapon": {
    "name": "weapon_ak47",
    "category": "Rifle",
    "finish": null
  },
  "clip": {
    "previous": 30,
    "current": 29,
    "delta": -1
  },
  "capacity": null,
  "reserve": null
}
```

::: details Full event payload for ammo_changed
This is the complete `ctx.event` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON `null` becomes Rhai `()`.

```json
{
  "device_id": "00000000-0000-0000-0000-000000000001",
  "channel_id": "123456789",
  "session_id": "00000000-0000-0000-0000-000000000002",
  "source_seq": 101,
  "timestamp": "2026-09-28T19:45:01Z",
  "reliability": "RELIABLE",
  "player": {
    "steam_id": "76561198000000001",
    "team": "ct"
  },
  "match": {
    "map": "de_vertigo",
    "mode": "competitive",
    "phase": "live",
    "score": {
      "ct": 0,
      "t": 0
    },
    "ct": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "t": {
      "consecutive_losses": null,
      "series_wins": null,
      "timeouts_remaining": null
    },
    "series_matches_to_win": null
  },
  "round": {
    "completed_rounds": 0,
    "phase": "live",
    "winner": null
  },
  "kind": "ammo_changed",
  "weapon": {
    "name": "weapon_ak47",
    "category": "Rifle",
    "finish": null
  },
  "clip": {
    "previous": 30,
    "current": 29,
    "delta": -1
  },
  "capacity": null,
  "reserve": null
}
```
:::

**Handling in Rhai** (a complete `main.rhai`):

```rhai
fn on_event(ctx) {
    if ctx.event.kind != "ammo_changed" { return; }
    if ctx.event.clip != () {
        debug(log, `${ctx.event.weapon.name} clip: ${ctx.event.clip.current}`);
    }
}
```

**Important:** Ammo deltas are not shot events. Reloads and other changes affect ammo, and reserve units are whatever CS2 reports; do not assume bullets (some captures use magazine-like units). A weapon/finish switch or ambiguous selection suppresses the comparison. Check each nullable change before reading its members.

Related events: [`weapon_changed`](#weapon_changed), [`weapon_state_changed`](#weapon_state_changed). [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.
