// Nothing in site/ may name an account, a client, a project, a workstream or a skill.
// This is what keeps the core reusable as a template. It reads the names to forbid from the
// account folder itself, so the check works for any account, plus a fixed list of project words.
import fs from 'node:fs';
import path from 'node:path';
import { loadAccount, siteRoot, skillsDir } from './lib/account.mjs';
import { walk, toPosix, isTextFile } from './lib/files.mjs';

const account = loadAccount();
const c = account.config;

const forbidden = new Set();
// forbiddenTerms: project and product words from the account (system names, tool names) that must
// never creep into the core. They live in the account config so the core itself stays generic.
for (const v of [c.clientName, c.fullName, c.teamPhrase, c.fictionalName, ...(c.forbiddenTerms ?? []), ...(c.clientAliases ?? []), ...(c.workstreams ?? [])]) {
  if (v) forbidden.add(String(v));
}
// IBM leading is a brand rule, not an account name, so leadBrand is allowed in code but not as copy.
const skillNames = fs.existsSync(skillsDir()) ? fs.readdirSync(skillsDir(), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
for (const s of skillNames) forbidden.add(s);
// The repository names often equal the account's short name (the skills repository and the site repository).
for (const url of [c.repoUrl, c.siteRepoUrl]) {
  const name = (url ?? '').split('/').pop();
  if (name) forbidden.add(name.replace(/\.git$/, ''));
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', 'generated']);
const SKIP_FILES = new Set(['package-lock.json']);
const problems = [];
let scanned = 0;

for (const file of walk(siteRoot, (full, e) => e.isDirectory() && SKIP_DIRS.has(e.name))) {
  const base = path.basename(file);
  if (SKIP_FILES.has(base) || !isTextFile(file)) continue;
  // Generated files and the brand folder are build output, not source.
  const rel = toPosix(path.relative(siteRoot, file));
  if (rel.startsWith('public/brand/') || rel.startsWith('public/downloads/') || rel.endsWith('tokens.generated.css')) continue;
  scanned++;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const low = line.toLowerCase();
    for (const term of forbidden) {
      // Short or generic skill names would false-positive; only enforce terms of 4+ characters.
      if (term.length < 4) continue;
      if (low.includes(term.toLowerCase())) problems.push(`site/${rel}:${i + 1}  names "${term}"`);
    }
  });
}

if (problems.length) {
  console.error('Genericity check failed: the core (site/) must not name the account, client, a workstream or a skill.');
  console.error('Move that wording into account/ (config, skill-meta.yaml or copy.yaml) and use a token instead.');
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
  if (problems.length > 50) console.error(`  ... and ${problems.length - 50} more`);
  process.exit(1);
}
console.log(`check:genericity passed (${scanned} files in site/, ${forbidden.size} forbidden terms).`);
