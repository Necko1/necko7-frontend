<!-- Generated from docs/api.json. -->
# Context and data shapes

All fields described as optional may be absent, not merely unit. For maps use `value.contains("field")` before accessing a field that is not guaranteed. JSON null is Rhai `()`. Strings representing timestamps are UTC RFC3339 strings, not native date objects. Native host Duration/filter values are not JSON-safe.

An event context contains `event`, `state`, `previous`, `current_match`, `source`, `meta` and `actor_type`. **A live timer context contains only timer, source, meta and actor_type**: state/previous/current_match are not automatically refreshed or supplied. Put required JSON-safe values in the timer payload. A manual dry-run context may contain more fields; that does not establish a live timer guarantee.

## ctx

| Property | Meaning |
| --- | --- |
| `event` | Event or (); on_event only. Not present in a live timer context. |
| `state` | CS2State; state AFTER the source payload, on_event only. |
| `previous` | CS2State or (); state BEFORE the payload, on_event only. |
| `current_match` | MatchContext or (); shared authoritative match observation, on_event only. |
| `meta` | Meta; execution/project/channel/revision/timestamp/source metadata. |
| `timer` | Timer; live on_timer only. No current game snapshot is implicitly added. |
| `source` | Source map for CS2, string 'timer' for timers. |
| `actor_type` | Execution actor: script or explicit scheduler/operator actor. |

## ctx.meta

| Property | Meaning |
| --- | --- |
| `project_id` | Project UUID. |
| `revision` | Pinned live revision, or draft test revision metadata. |
| `execution_id` | Execution UUID used for audit correlation. |
| `channel_id` | Channel Twitch ID. |
| `timestamp` | Execution-time UTC timestamp string. |
| `source` | Original source map for CS2; timer source string for timer work. |

## ctx.timer

| Property | Meaning |
| --- | --- |
| `id` | Job UUID. |
| `key` | Project-local job key. |
| `payload` | Your persisted JSON-safe payload. |
| `scheduled_for` | Original due-time UTC string. |
| `created_at` | Creation UTC string. |
| `creating_revision` | Immutable revision that created this job. |
| `host_action` | Internal host action or (); not a user callback selector. |

## ctx.state

| Property | Meaning |
| --- | --- |
| `game` | Provider metadata (not credentials). |
| `view` | Observed viewed identity; can be spectator. |
| `match` | MatchState or (). Native Rhai: ctx.state["match"]. |
| `round` | Normalized RoundState. |
| `player` | Player or (); only when player.steamid matches authoritative provider.steamid. |

## ctx.state.game

| Property | Meaning |
| --- | --- |
| `local_steam_id` | Authoritative provider Steam ID or (). |
| `app_id` | Observed application ID or (). |
| `build` | Provider build or (). |
| `name` | Provider name or (). |
| `observed_at` | Provider epoch timestamp or (). |

## ctx.state.view

| Property | Meaning |
| --- | --- |
| `identity` | local, spectator or unknown. |
| `steam_id` | Viewed Steam ID or (). |
| `display_name` | Viewed name or (). |
| `clan` | Viewed clan or (). |
| `observer_slot` | Observed slot or (). |
| `activity` | menu, playing, text_input or (). |

## ctx.state.match

| Property | Meaning |
| --- | --- |
| `map` | Observed map string. |
| `mode` | Observed mode or (). |
| `phase` | warmup, live, intermission, game_over or (). |
| `score` | Score {ct, t}; side labels, not fixed roster identity. |
| `ct` | TeamInfo. |
| `t` | TeamInfo. |
| `series_matches_to_win` | Observed series target or (). |

## team_info

| Property | Meaning |
| --- | --- |
| `consecutive_losses` | Observed count or (). |
| `series_wins` | Observed count or (). |
| `timeouts_remaining` | Observed count or (). |

## score

| Property | Meaning |
| --- | --- |
| `ct` | Known CT score integer, or (). |
| `t` | Known T score integer, or (). |

## ctx.state.round

| Property | Meaning |
| --- | --- |
| `completed_rounds` | Completed game-round counter, incremented at end, or (). |
| `phase` | freeze_time, live, over or (). |
| `winner` | ct, t or (). |

## ctx.state.player

| Property | Meaning |
| --- | --- |
| `steam_id` | Verified local Steam ID. |
| `team` | ct, t or (). |
| `health` | Observed health or (). |
| `armor` | Observed armor or (). |
| `helmet` | bool or (). |
| `defuse_kit` | bool or (). |
| `money` | Observed money or (). |
| `equipment_value` | Observed equipment value or (). |
| `flash` | Observed exposure or (). |
| `smoke` | Observed exposure or (). |
| `burning` | Observed exposure or (). |
| `match_stats` | Cumulative MatchStats (not round assists). |
| `round_stats` | RoundStats {kills, headshot_kills}. |
| `weapons` | Observed array&lt;Weapon&gt; or (); absence does not prove a dropped item. |

## match_stats

| Property | Meaning |
| --- | --- |
| `kills` | Cumulative known local kills or (). |
| `assists` | Cumulative known local assists or (). |
| `deaths` | Cumulative known local deaths or (). |
| `mvps` | Cumulative known local MVP count or (). |
| `score` | Cumulative known local score or (). |

## round_stats

| Property | Meaning |
| --- | --- |
| `kills` | Known local kills in this real round or (). |
| `headshot_kills` | Known local headshot kills in this real round or (). |

## weapon

| Property | Meaning |
| --- | --- |
| `identity` | WeaponIdentity {name, category, finish}. |
| `status` | active, holstered or reloading. |
| `ammo` | Ammo {clip, capacity, reserve}; each field can be (). |

## weapon_identity

| Property | Meaning |
| --- | --- |
| `name` | Observed weapon name. |
| `category` | Observed type/category. |
| `finish` | Observed finish or (). |

## ammo

| Property | Meaning |
| --- | --- |
| `clip` | Observed clip units or (). |
| `capacity` | Observed capacity or (). |
| `reserve` | Reported reserve units or (); do not assume bullet units. |

## ctx.event

| Property | Meaning |
| --- | --- |
| `kind` | Semantic event kind, see Events. |
| `device_id` | Device UUID. |
| `channel_id` | Channel Twitch ID. |
| `session_id` | Signed GSI session UUID. |
| `source_seq` | Signed payload seq, same across events from one payload. |
| `timestamp` | Signed observation UTC timestamp; not exact game-event time. |
| `reliability` | RELIABLE: emitted from supported evidence; does not mean a complete match. |
| `player` | Verified local {steam_id, team} or (). |
| `match` | MatchState or (); access ctx.event["match"]. |
| `round` | RoundState; event-specific extra fields are listed in Events. |

## ctx.current_match

| Property | Meaning |
| --- | --- |
| `rounds` | Array of completed observed RoundRecords, capped at 256. |
| `current_round` | Latest observed RoundRecord or (); may be completed until next boundary. |
| `state` | Latest normalized state. |
| `updated_at` | Latest observation UTC string. |
| `partial` | true if evidence gaps/incomplete replacement found; absent until necessary, test membership. |
| `end_reason` | game_over or observation_reset when ended; may be absent. |
| `local_summary` | LocalSummary or (); cumulative stats with per-field authoritative provenance. May be absent before evidence. |

## r

| Property | Meaning |
| --- | --- |
| `index` | Zero-based observed completed-round counter or (). |
| `completed` | bool; incomplete observation is not a completed game round. |
| `started_at` | First observed time in this round. |
| `ended_at` | Round-end observation time when available. |
| `score_before` | Score or (). |
| `score_after` | Score or (). |
| `winner` | ct, t or (). |
| `player` | Retained authoritative LocalRoundStats. |
| `start` | First available verified Player or (). |
| `end` | Last available verified Player or (). |
| `side_swap_before` | Optional {before: Score, after: Score, seq} halftime relabel; not points. |
| `events` | Persisted event timeline under advanced inspection; omitted from execution snapshots. |

## r.player

| Property | Meaning |
| --- | --- |
| `kills` | Known local round kills or (); zero is known zero. |
| `headshot_kills` | Known local round headshot kills or (). |
| `side` | Retained ct/t local side or (). |
| `health` | Last observed local health, not guaranteed round-end health. |
| `match_stats` | Last-authoritative cumulative counters or (); not per-round assists. |

## local_summary

| Property | Meaning |
| --- | --- |
| `steam_id` | Verified local Steam ID. |
| `stats` | Retained known cumulative MatchStats. |
| `evidence` | Map per stat -&gt; {seq, at, final}. |
| `observed_at` | Latest local authoritative cumulative observation time. |
| `seq` | Its source sequence. |
| `final` | true only when all retained known fields observed at game over. Otherwise last observed. |

## result

| Property | Meaning |
| --- | --- |
| `ok` | bool; not a guarantee of completed trade. |
| `code` | Optional string or (); reason/result code. |
| `fulfillment_id` | Optional real internal fulfillment UUID. |
| `inventory_item_id` | Optional inventory UUID. |
| `selected_item` | Optional selected item name. |
| `origin` | SCRIPT when supplied. |
| `inventory_status` | Optional current domain lifecycle status. |
| `retry_after` | Optional seconds hint. |
| `planned` | Optional true for dry run. |
| `validation` | Optional explanation of dry-run checks not simulated. |

## user

| Property | Meaning |
| --- | --- |
| `id` | Twitch user ID string. |
| `login` | Observed login; can be absent in user_stats without chat. |
| `messages` | Known observed message count. |
| `characters` | Sum of recorded char_count. |
| `first_activity` | Earliest activity in requested window or (). |
| `last_activity` | Latest activity in window or (). |
| `redemptions` | user_stats only: {total, completed, script}. |

## reward

| Property | Meaning |
| --- | --- |
| `id` | Reward UUID. |
| `alias` | Channel-scoped script alias. |
| `title` | Reward title. |
| `is_visible` | Presentation visibility. |
| `is_paused` | Operational pause: prevents trigger. |

See [match observations](../matches), [events](./events) and [project workflows](../workflows).
