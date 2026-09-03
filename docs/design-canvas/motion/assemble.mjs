// Assembles <Name>.dc.html from _head.html + body-<Name>.html + optional
// script-<Name>.html + _foot.html — same split the parent design-canvas uses.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const head = readFileSync('_head.html', 'utf8');
const foot = readFileSync('_foot.html', 'utf8');

for (const f of readdirSync('.').filter((n) => n.startsWith('body-'))) {
  const name = f.slice(5, -5);
  const script = `script-${name}.html`;
  const parts = [head, readFileSync(f, 'utf8'), '</x-dc>'];
  if (existsSync(script)) parts.push(readFileSync(script, 'utf8'));
  parts.push(foot.replace('</x-dc>\n', ''));
  writeFileSync(`${name}.dc.html`, parts.join('\n'));
  console.log(`${name}.dc.html`);
}
