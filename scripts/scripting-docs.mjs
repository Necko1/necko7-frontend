import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = resolve(process.env.SCRIPTING_SOURCE_ROOT || resolve(root, '../necko7'), 'docs/scripting');
const mode = process.argv[2] || 'generate';
for (const file of ['api.json', 'recipes.json']) {
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
for (const recipe of recipes) {
  output(`cookbook/${recipe.id}.md`, `<!-- Generated from docs/recipes.json, exercised by runtime tests. -->\n# ${recipe.title}\n\n${recipe.description}\n\n${Object.entries(recipe.files).map(([path, code]) => `## ${path}\n\n\`\`\`rhai\n${code}\n\`\`\``).join('\n\n')}\n\nSave all files, Validate, run a dry test with a representative normalized context, Publish, then Enable. Configure named reward aliases before live use. [Dry-run limitations](../workflows#dry-run) apply. [API reference](../reference/) lists exact errors, result shapes and quotas.`);
}
output('cookbook/index.md', `# Cookbook\n\nComplete native Rhai projects, compiled and exercised by the backend test suite. Reward names are aliases you must configure, not built-in rewards. Nothing executes until you publish and enable a project.\n\n${recipes.map(r => `- [${r.title}](./${r.id})`).join('\n')}\n\nStart with [the full delayed giveaway](./ace-secret-case), or [multi-file organization](../multi-file).`);
console.log(`Scripting ${mode}: ${api.functions.length} signatures, ${recipes.length} tested recipes.`);
