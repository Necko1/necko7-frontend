# Match observations

GSI is an observation stream, not a full authoritative game replay. `ctx.current_match` is shared across projects and may be `()` outside a known match. The recorded match inspector exposes the same normalized data under advanced inspection; execution snapshots omit repeated per-round event timelines for size.

## Local player identity

`provider.steamid` identifies the authoritative local player. The normalizer accepts `player` data only while the observed `player.steamid` matches it. After death, Valve may show a teammate's spectator data; this is never attributed to the local user. `ctx.state.player` then becomes `()` while match/round progression remains available.

The recorder retains previously observed authoritative local round values through sparse/spectator payloads. Confirmed semantic local events can corroborate known baselines. It does not invent a baseline when none was observed. A new real round resets the accumulator. Known zero kills/headshots are distinct from unknown `()`.

## Rounds and scores

`rounds` contains completed observed rounds, up to 256. `current_round` is the latest observation, possibly completed until the next real round starts. `last_rounds(n)` returns a suffix of completed observations, oldest first; guard `current_match != ()` and verify array length and consecutive `index` values. Indices are zero-based observed completed-round counters, not a filled list of every game round.

Scores are `#{ct, t}`. CT/T labels change at halftime: `2:6 -> 6:2` can be the same points relabelled, not points awarded. `side_swap_before` records that evidence separately. Compare each round's local side and winner, not a permanent CT roster. Counters advance on completion. Game over can arrive with `freeze_time` and still complete the final real round exactly once; it must not create a new fake round.

Round fields include index, observed start/end timestamps, completion, score_before/score_after, winner, start/end local snapshots and retained local player kills/headshot_kills/side/health/cumulative match_stats. Last observed health is not guaranteed end-of-round health. See [full shapes](./reference/data#r).

## Cumulative totals

`local_summary.stats` contains last-authoritative kills, assists, deaths, mvps and score when observed. `evidence` carries sequence, time and finality **per field**. `final=true` only when every retained known field was observed at game over. Otherwise the UI labels **Last observed**, not Final. A field never observed stays unknown/missing; no teammate fallback. Provider identity changes clear old local-summary evidence.

## Completeness and missing data

One active match per channel, up to 30 completed records. Device/session/map/restart changes can close an observation with `observation_reset`, not a claim of normal match completion. `partial` marks evidence gaps, starting midmatch or incomplete round replacement. Continuous transport does not prove complete semantics; no semantic event also does not prove transport loss.

Damage dealt, per-round assists, unsupported MVP timing, victim identity, a full opponent roster and surrender reason are **not invented**. Cumulative match assists/MVPs can be known without their timing. Do not subtract final totals to manufacture per-round data. A multi-kill recipe can use known local round kills; a five-kill ace requires actual five-kill evidence, not just a round win.

[Safe streak recipe](./cookbook/safe-round-streaks) demonstrates these guards. [Events](./reference/events) lists what the normalizer actually emits.
