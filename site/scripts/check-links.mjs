// Checks every internal link, asset and anchor in dist/ resolves under the base path.
// A missed withBase() only shows up as a 404 on Pages, so this runs in build:ci after the build.
import fs from 'node:fs';
import path from 'node:path';
import { loadAccount, deriveHosting, siteRoot } from './lib/account.mjs';
import { walk, toPosix } from './lib/files.mjs';

const dist = path.join(siteRoot, 'dist');
if (!fs.existsSync(dist)) {
  console.error('check:links needs a built site in site/dist. Run `npm run build` first.');
  process.exit(1);
}
const { base } = deriveHosting(loadAccount().config);
const prefix = base === '/' ? '' : base;

const htmlFiles = [...walk(dist, (full, e) => e.isDirectory() && e.name === 'pagefind')].filter((f) => f.endsWith('.html'));
const idCache = new Map();

function idsIn(file) {
  if (idCache.has(file)) return idCache.get(file);
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  idCache.set(file, ids);
  return ids;
}

/** Maps a site path ("/base/skills/x/") to a file in dist, or null. */
function resolve(urlPath) {
  if (!urlPath.startsWith(`${prefix}/`) && urlPath !== prefix) return undefined; // not under the base path
  const rel = decodeURIComponent(urlPath.slice(prefix.length)).replace(/^\/+/, '');
  const candidates = [path.join(dist, rel), path.join(dist, rel, 'index.html'), path.join(dist, `${rel}.html`)];
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}

const problems = [];
let checked = 0;

for (const file of htmlFiles) {
  const rel = toPosix(path.relative(dist, file));
  const html = fs.readFileSync(file, 'utf8');
  const here = `/${rel.replace(/index\.html$/, '')}`;

  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1];
    if (!url || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || url.startsWith('data:')) continue;
    checked++;
    const [pathAndQuery, hash = ''] = url.split('#');
    const pathOnly = pathAndQuery.split('?')[0];

    if (!pathOnly) {
      // Same-page anchor.
      if (hash && !idsIn(file).has(decodeURIComponent(hash))) problems.push(`${rel}: anchor #${hash} does not exist on this page`);
      continue;
    }
    if (!pathOnly.startsWith('/')) {
      problems.push(`${rel}: relative link "${url}" (use withBase)`);
      continue;
    }
    const target = resolve(pathOnly);
    if (target === undefined) {
      problems.push(`${rel}: "${url}" is not under the base path ${prefix || '/'}`);
    } else if (target === null) {
      problems.push(`${rel}: "${url}" does not exist in dist`);
    } else if (hash && target.endsWith('.html') && !idsIn(target).has(decodeURIComponent(hash))) {
      problems.push(`${rel}: "${url}" points to an anchor that does not exist`);
    }
  }
  void here;
}

if (problems.length) {
  console.error(`check:links found ${problems.length} broken link(s) under base "${prefix || '/'}":`);
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`);
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`);
  process.exit(1);
}
console.log(`check:links passed (${checked} internal links across ${htmlFiles.length} pages, base "${prefix || '/'}").`);
