# Semantic CS2 events

`ctx.event` includes the common source/identity/match/round fields in [data shapes](./data#ctx-event), plus these kind-specific fields. All source timestamps describe observation time, not exact game action time. Sparse payloads may produce no events; missing data is not fabricated. All emitted events currently have reliability `RELIABLE`, meaning the event had supported derivation evidence, not that the full match is complete.

| kind | Additional fields |
| --- | --- |
| map_changed | change: {previous: string, current: string} |
| map_phase_changed | change: {previous, current}, warmup/live/intermission/game_over |
| match_started / match_ended | None |
| round_phase_changed | change: {previous, current}, freeze_time/live/over |
| round_started / round_ended | None; inspect current_match and state.round |
| score_changed | ct and t: NumberChange or () |
| activity_changed | change: {previous, current}, menu/playing/text_input |
| team_changed | change: {previous, current}, ct/t |
| health_changed / armor_changed / money_changed / equipment_value_changed | change: NumberChange |
| helmet_changed / defuse_kit_changed | change: {previous: bool, current: bool} |
| exposure_changed | effect: flash/smoke/burning; change: NumberChange |
| match_stats_changed / round_stats_changed | changes: array of {stat, previous, current, delta} |
| player_kill | count: positive observed increment, total: cumulative local kills |
| player_died | total: cumulative local deaths |
| weapon_changed | change: {previous: WeaponIdentity, current: WeaponIdentity} |
| weapon_state_changed | weapon: WeaponIdentity; change: {previous, current}, active/holstered/reloading |
| ammo_changed | weapon: WeaponIdentity; clip, capacity, reserve: NumberChange or () |

`NumberChange` contains integer previous/current and signed delta. `StatChange.stat` is kills, deaths, assists, mvps, score, round_kills or round_headshot_kills. WeaponIdentity has name/category/finish; finish can be unknown. These are normalized deltas, not Valve `added` or `previously` maps passed through to a script.

No victim ID, damage event, invented per-round assists, unsupported MVP timing or guaranteed surrender reason is provided. player_kill can aggregate several observed kills in one update; do not assume it fires once per victim. Reset/baseline and authoritative-local identity rules can suppress unsafe deltas. All events from one payload reference its same before/after states; use source_seq/session_id/device_id for correlation rather than timestamps alone.

See [kill announcement](../cookbook/announce-kill), [match observations](../matches) and [round streaks](../cookbook/safe-round-streaks).
