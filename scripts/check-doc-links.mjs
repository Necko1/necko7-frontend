import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/docs/scripting');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)]);
}
const html = files(root).filter(p => p.endsWith('.html'));
const documents = new Map(html.map(path => [path, parseHTML(readFileSync(path, 'utf8')).document]));
const errors = [];
let checked = 0;
for (const [path, document] of documents) {
  const relative = path.slice(root.length).replaceAll('\\', '/');
  const base = new URL('/docs/scripting' + relative, 'https://docs.test');
  for (const anchor of document.querySelectorAll('a[href]')) {
    const target = new URL(anchor.getAttribute('href'), base);
    if (target.origin !== base.origin || !target.pathname.startsWith('/docs/scripting/')) continue;
    const candidate = resolve(root, decodeURIComponent(target.pathname.slice('/docs/scripting/'.length)));
    const found = [candidate, candidate + '.html', resolve(candidate, 'index.html')].find(p => documents.has(p));
    if (!found) { if (!existsSync(candidate)) errors.push(`${relative}: missing ${target.pathname}`); continue; }
    checked++;
    const fragment = decodeURIComponent(target.hash.slice(1));
    if (fragment && !documents.get(found).getElementById(fragment)) errors.push(`${relative}: missing ${target.pathname}#${fragment}`);
  }
}
if (errors.length) throw new Error([...new Set(errors)].join('\n'));
console.log(`Docs links: ${html.length} HTML pages, ${checked} internal links/anchors checked.`);
