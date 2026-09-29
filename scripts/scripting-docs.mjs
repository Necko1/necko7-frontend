import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = resolve(process.env.SCRIPTING_SOURCE_ROOT || resolve(root, '../necko7'), 'docs/scripting');
const mode = process.argv[2] || 'generate';
for (const file of ['api.json', 'recipes.json', 'events.json']) {
  const target = resolve(root, 'docs', file);
  const source = resolve(canonical, file);
  if (mode === 'sync') {
    if (!existsSync(source)) throw new Error(`Missing canonical catalog: ${source}`);
    writeFileSync(target, readFileSync(source));
  } else if (existsSync(source) && readFileSync(source, 'utf8').replaceAll('\r\n', '\n') !== readFileSync(target, 'utf8').replaceAll('\r\n', '\n')) {
    throw new Error(`${file} drifted from runtime repository. Run npm run api:sync.`);
  }
}
const api = JSON.parse(readFileSync(resolve(root, 'docs/api.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(resolve(root, 'docs/recipes.json'), 'utf8'));
const events = JSON.parse(readFileSync(resolve(root, 'docs/events.json'), 'utf8'));
const namespaces = [...new Set(api.functions.map(f => f.namespace))];
const slug = name => name.replaceAll('.', '-');
function relatedLinks(fn) {
  const related = fn.related.length ? fn.related : api.functions.filter(f => f.namespace === fn.namespace && f !== fn).map(f => `${f.namespace}.${f.id || f.name}`);
  return related.map(name => {
    const target = api.functions.find(f => `${f.namespace}.${f.id || f.name}` === name.replace('get_default', 'get-default'));
    if (!target) throw new Error(`Unknown related API: ${name}`);
    return `[${target.namespace}.${target.name}](./${slug(target.namespace)}#${target.id || target.name})`;
  }).join(', ');
}
function output(path, text) {
  const target = resolve(root, 'docs/site', path);
  const contents = text.trim() + '\n';
  if (mode === 'check') {
    if (!existsSync(target) || readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== contents) throw new Error(`Generated page drift: ${path}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}
for (const namespace of namespaces) {
  const fns = api.functions.filter(f => f.namespace === namespace);
  const sections = fns.map(f => `## ${f.name} {#${f.id || f.name}}

\`\`\`rhai
${f.signature}
\`\`\`

${f.description}

${f.parameters.length ? '| Parameter | Type | Meaning |\n| --- | --- | --- |\n' + f.parameters.map(p => `| \`${p.name}\` | \`${p.type.replaceAll('|', '\\|')}\` | ${p.description} |`).join('\n') : 'No parameters.'}

**Returns:** \`${f.returns.replaceAll('|', 'or')}\`.

**Behavior and effects:** ${f.behavior}

**Errors:** ${f.errors}

**Dry run:** ${f.dry_run}

**Budget:** ${namespace === 'random' || namespace === 'ctx.current_match' || ['Duration','UserFilter','RewardFilter'].includes(namespace) ? 'Local engine operation, no host-call admission. Engine limits still apply.' : '100 host calls total; ' + (f.name === 'trigger' || ['send','reply'].includes(f.name) ? '3 calls of this operation per execution.' : ['set_visible','set_paused','enable_for'].includes(f.name) ? '10 calls of this operation per execution.' : '50 calls of this operation per execution.') + (f.name === 'trigger' ? ' Also at most 10 admitted fulfillment rows per project in the preceding minute; the check is not a blanket Twitch rate limit.' : '')}

\`\`\`rhai
${f.example}
\`\`\`

${relatedLinks(f) ? `Related APIs: ${relatedLinks(f)}.\n\n` : ''}See [data shapes](./data), [limits](../limits), [dry run](../workflows#dry-run) and [cookbook](../cookbook/).`);
  output(`reference/${slug(namespace)}.md`, `<!-- Generated from docs/api.json. Edit the runtime catalog, then api:sync. -->\n# ${namespace}\n\n${sections.join('\n\n')}`);
}
output('reference/index.md', `# API reference\n\nRhai ${api.rhai_version}, necko7 scripting contract ${api.api_version}. All ${api.functions.length} host/type/helper signatures are listed here. Unknown JSON values become Rhai \`()\`, not zero.\n\n| Namespace / type | Reference |\n| --- | --- |\n${namespaces.map(n => `| \`${n}\` | [Functions and behavior](./${slug(n)}) |`).join('\n')}\n\nStart with [context and data shapes](./data), [semantic events](./events) or [structured failures](../errors). Use [official Rhai syntax](../language) for the language itself.`);
output('reference/data.md', `<!-- Generated from docs/api.json. -->\n# Context and data shapes\n\nAll fields described as optional may be absent, not merely unit. For maps use \`value.contains("field")\` before accessing a field that is not guaranteed. JSON null is Rhai \`()\`. Strings representing timestamps are UTC RFC3339 strings, not native date objects. Native host Duration/filter values are not JSON-safe.\n\nAn event context contains \`event\`, \`state\`, \`previous\`, \`current_match\`, \`source\`, \`meta\` and \`actor_type\`. **A live timer context contains only timer, source, meta and actor_type**: state/previous/current_match are not automatically refreshed or supplied. Put required JSON-safe values in the timer payload. A manual dry-run context may contain more fields; that does not establish a live timer guarantee.\n\n${Object.entries(api.properties).map(([group, fields]) => `## ${group}\n\n| Property | Meaning |\n| --- | --- |\n${Object.entries(fields).map(([field, detail]) => `| \`${field}\` | ${detail.replaceAll('|','or').replaceAll('<','&lt;').replaceAll('>','&gt;')} |`).join('\n')}`).join('\n\n')}\n\nSee [match observations](../matches), [events](./events) and [project workflows](../workflows).`);

const eventKinds = events.events.map(event => event.kind);
if (new Set(eventKinds).size !== eventKinds.length) throw new Error('Duplicate documented event kind');
const completeEvent = event => ({ ...events.envelope, ...event.envelope, ...event.payload });
const killEvent = events.events.find(event => event.kind === 'player_kill');
if (!killEvent) throw new Error('Missing introductory player_kill example');
const sections = events.events.map(event => {
  if (event.payload.kind !== event.kind || !event.handler.includes(`"${event.kind}"`)) throw new Error(`Invalid event example: ${event.kind}`);
  const payloadFields = Object.keys(event.payload).filter(key => key !== 'kind').sort();
  if (JSON.stringify(payloadFields) !== JSON.stringify(event.fields.map(field => field.name).sort())) throw new Error(`Undocumented payload field: ${event.kind}`);
  for (const kind of event.related) if (!eventKinds.includes(kind)) throw new Error(`Unknown related event: ${kind}`);
  return `## ${event.kind} {#${event.kind}}

${event.description}

**When emitted:** ${event.when}

**Payload fields** (in addition to the [common envelope](#common-envelope)):

- \`kind: string\` - always \`"${event.kind}"\`.
${event.fields.length ? event.fields.map(field => `- \`${field.name}: ${field.type}\` - ${field.description}`).join('\n') : '- No additional fields. Use the common match/round context and the retained match observation.'}

**Event-specific JSON:** This fragment is merged with the common envelope, not nested under a \`payload\` property.

\`\`\`json
${JSON.stringify(event.payload, null, 2)}
\`\`\`

::: details Full event payload for ${event.kind}
This is the complete \`ctx.event\` JSON for this illustrative example, including source, local identity, match and round. Identifiers are fictional; this is not a captured live match. JSON \`null\` becomes Rhai \`()\`.

\`\`\`json
${JSON.stringify(completeEvent(event), null, 2)}
\`\`\`
:::

**Handling in Rhai** (a complete \`main.rhai\`):

\`\`\`rhai
${event.handler}
\`\`\`

**Important:** ${event.notes}

Related events: ${event.related.map(kind => `[\`${kind}\`](#${kind})`).join(', ')}. [Shared types](#shared-types) explain nested fields; [comparison rules](#comparison-rules) explain suppressed events.`;
});
output('reference/events.md', `---
outline: 2
---
<!-- Generated from docs/events.json. Edit the backend catalog, then api:sync. -->
# CS2 events and payloads

Every currently implemented CS2 semantic event has its own section **on this page**. Find an event below, use the page outline, or search its exact name. Each section describes when it fires, every event-specific field, a full expandable JSON payload, a working Rhai handler and limitations. These are normalized necko7 events, not raw Valve GSI payloads.

${[...new Set(events.events.map(event => event.group))].map(group => `- **${group}:** ${events.events.filter(event => event.group === group).map(event => `[\`${event.kind}\`](#${event.kind})`).join(', ')}.`).join('\n')}

## Reading an event {#reading-an-event}

Enabled projects with a one-argument \`on_event(ctx)\` receive semantic CS2 events. Put the handler in \`main.rhai\`; filter on \`ctx.event.kind\` **before accessing kind-specific fields**. Different event kinds have different fields. Timer work calls \`on_timer(ctx)\` with \`ctx.timer\`, not a CS2 event; see [project workflows](../workflows).

\`\`\`rhai
${killEvent.handler}
\`\`\`

**What does "local" mean?** Your player on the paired CS2 client, verified against \`provider.steamid\`. Not a spectated teammate and not a Twitch viewer. If the viewed player's Steam ID differs, their stats are not used as yours. Match/round events can still occur with \`player: null\`.

**What period does a counter cover?**

- \`player_kill.count\`: kills added **between the two compared updates**. If your match kill total moves from 5 to 7, \`count\` is 2.
- \`player_kill.total\`: your player's CS2-reported kills **in the current match, across all rounds so far**. In that example, \`total\` is 7. It is not 7 kills this round, since connection, this stream or in your lifetime.
- \`player_died.total\` and \`match_stats\`: totals **for your player in the current match**. necko7 does not start them at zero when it connects halfway through a match.
- \`round_stats.kills\` / \`round_stats.headshot_kills\`: your player's totals **in this one real round**. For example, after that update you could have 3 round kills, 2 of them headshots, while your match kill total is 7.
- \`round.completed_rounds\`: how many game rounds have finished, **not** the current round number. Five completed rounds can mean the sixth round is being played.
- \`match.score\`: team score labelled **CT:T**, not your scoreboard points or fixed team identities. Sides swap at halftime.

Unknown JSON values are \`null\` and become Rhai \`()\`. Known zero is \`0\`; never replace unknown with zero. A first known value is not itself a change. In hand-entered dry-run contexts, optional fields may also be absent; check map membership before accessing them. See [context and data shapes](./data).

## Common envelope {#common-envelope}

Every full event has these top-level fields, alongside its kind-specific fields:

- \`kind: string\`: the event discriminator, such as \`player_kill\`.
- \`device_id: string\`: paired desktop UUID.
- \`channel_id: string\`: channel Twitch ID (a string, not a number).
- \`session_id: string\`: signed source-session UUID.
- \`source_seq: integer\`: signed source payload sequence. Several different events from one payload share this value; it is **not an event-unique ID**.
- \`timestamp: string\`: UTC RFC3339 observation time from the signed source envelope, not the exact time a shot or kill happened.
- \`reliability: string\`: currently \`RELIABLE\`; the derivation has supported evidence. This does not claim complete match coverage or exactly-once external script effects.
- \`player: PlayerContext | null\`: verified local \`{steam_id: string, team: "ct" | "t" | null}\`, or null if current local identity is unavailable. It is not the full player snapshot.
- \`match: MatchState | null\`: current observed map, mode, phase, CT:T score and team metadata. In Rhai use \`ctx.event["match"]\`, because \`match\` is reserved. See [MatchState fields](./data#ctx-state-match).
- \`round: RoundState\`: \`{completed_rounds: integer | null, phase: "freeze_time" | "live" | "over" | null, winner: "ct" | "t" | null}\`. A winner may arrive later or remain unknown.

For example, this is the **entire event**, not the entire execution context. It says two newly observed kills brought your match total to seven, with five completed rounds and CT:T score 3:2:

\`\`\`json
${JSON.stringify(completeEvent(killEvent), null, 2)}
\`\`\`

The execution context wraps it as \`ctx.event\`. \`ctx.state\` is the normalized state **after** the source payload; \`ctx.previous\` is the state **before** it, or unit. \`ctx.current_match\` is the retained recorder view, including earlier trustworthy round data. Every event from a source payload uses the same before/after states: callbacks are not intermediate snapshots after each individual kill. See [ctx](./data#ctx), [ctx.event](./data#ctx-event), [match observations](../matches) and [dry-run contexts](../getting-started#test-before-real-effects).

## Shared types {#shared-types}

**\`Change<T>\`** has \`previous: T\` and \`current: T\`. It has **no \`delta\`**. Strings and booleans use this shape.

**\`NumberChange\`** has \`previous: integer\`, \`current: integer\` and \`delta: integer\`. Previous/current are nonnegative known values; delta is signed and equals current minus previous. Example: \`{"previous":100,"current":73,"delta":-27}\`. A nullable NumberChange is null when a value is unchanged **or** cannot be compared; null alone does not tell you which.

**\`StatChange\`** is a flat map with \`stat: string\`, \`previous: integer\`, \`current: integer\`, \`delta: integer\`. There is no nested \`change\` property inside an item. \`match_stats_changed\` uses \`kills\`, \`deaths\`, \`assists\`, \`mvps\`, \`score\`; \`round_stats_changed\` uses \`round_kills\`, \`round_headshot_kills\`. The previous/current values cover the period of that stat: this match or this round, respectively.

**\`WeaponIdentity\`** has \`name: string\` (for example \`weapon_ak47\`), \`category: string\` (observed Valve type, for example \`Rifle\`) and \`finish: string | null\` (reported paintkit). Name/category are observed strings, not a guaranteed exhaustive enum. Null finish means unknown; it does not prove a default skin. There is no weapon entity ID, owner or ammo in this type.

**String vocabularies:** \`Team\` is \`ct\`/\`t\`; \`Activity\` is \`menu\`/\`playing\`/\`text_input\`; \`MatchPhase\` is \`warmup\`/\`live\`/\`intermission\`/\`game_over\`; \`RoundPhase\` is \`freeze_time\`/\`live\`/\`over\`; \`WeaponStatus\` is \`active\`/\`holstered\`/\`reloading\`. These are case-sensitive normalized strings.

## Comparison rules and missing events {#comparison-rules}

Sparse/no-op GSI payloads can legitimately produce no events. Missing semantic events do not by themselves prove a transport gap, death or zero kills. Unknown fields and raw Valve \`added\`/\`previously\` delta markers are not used to invent observations.

An initial baseline, source-session change, observation gap over 90 seconds (source or provider time), clock regression, changed/missing authoritative provider identity, non-CS2 app ID or changed provider build suppresses event comparisons for that update. Duplicate/out-of-order source sequences do not produce new events. A source-sequence gap is diagnostic evidence of discontinuous delivery, but is not by itself a blanket reset of all otherwise comparable values.

**Local-player comparison rules** used by health/equipment/effects/stat/weapon/ammo events:

1. Both snapshots identify the same authoritative local player. A spectator switch or identity restoration creates a new local baseline; missed kills are not inferred from a teammate's values.
2. Both snapshots retain the same known map and mode, with known match phases, and there is no match-start/restart baseline.
3. A known team switch emits \`team_changed\` and stops other local player-delta comparisons for that payload.
4. Round phases and completed counters must show a comparable round: unchanged completed count without entering a new freeze period or leaving an already-over round; or a count advance of exactly one from a live round into over/game_over. This preserves an ending round's final changes without comparing a new round's reset counters as combat.
5. The individual values being compared must be known in both snapshots. Health, money, ammo or counter values appearing for the first time are not fabricated deltas.

**Ordering:** Each event gets a separate project dispatch. Within one comparable update, derivation orders map/match changes before round/score changes, then activity/team, health/equipment/effects, match stats, player_kill/player_died, round stats, and weapon/ammo. Not every kind appears. Projects serialize their admitted executions, but scripts should use the shared state/recorder evidence instead of treating this order as intermediate game state. Project enable/revision/queue admission also matters; see [execution workflows](../workflows).

There is no semantic \`ace\`, \`headshot\`, \`player_hurt\`, \`damage_dealt\`, \`bomb_planted\`, \`bomb_defused\` or \`halftime\` callback in this contract. Derive supported multi-kill conditions from known round kills, and inspect side-swap metadata for halftime. Victim/killer IDs, damage dealt, unsupported per-round assists, exact MVP timing and a guaranteed surrender reason are not supplied. [Ace recipe](../cookbook/ace-secret-case) and [safe round streaks](../cookbook/safe-round-streaks) show evidence-based handling.

${sections.join('\n\n')}
`);
for (const recipe of recipes) {
  output(`cookbook/${recipe.id}.md`, `<!-- Generated from docs/recipes.json, exercised by runtime tests. -->\n# ${recipe.title}\n\n${recipe.description}\n\n${Object.entries(recipe.files).map(([path, code]) => `## ${path}\n\n\`\`\`rhai\n${code}\n\`\`\``).join('\n\n')}\n\nSave all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.`);
}
output('cookbook/index.md', `# Cookbook\n\nComplete native Rhai projects, compiled and exercised by the backend test suite. Reward names are aliases you must configure, not built-in rewards. Nothing executes until you publish and enable a project.\n\n${recipes.map(r => `- [${r.title}](./${r.id})`).join('\n')}\n\nStart with [the full delayed giveaway](./ace-secret-case), or [multi-file organization](../multi-file).`);
console.log(`Scripting ${mode}: ${api.functions.length} signatures, ${events.events.length} event sections, ${recipes.length} tested recipes.`);
