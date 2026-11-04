// Exports the generic template: the core (site/, .github/, docs/) plus the sample account folder.
// It leaves out account/, skills/, examples/ and local/, then checks the output for any trace of
// this account and fails if it finds one.
//
//   npm run make-template                 writes to ../template-out
//   npm run make-template -- --out <dir>  writes somewhere else
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadAccount, repoRoot, siteRoot, parseRepo, skillsDir } from './lib/account.mjs';
import { ensureDir, rmrf, walk, toPosix, isTextFile } from './lib/files.mjs';

const argOut = process.argv.indexOf('--out');
const out = path.resolve(argOut > -1 ? process.argv[argOut + 1] : path.join(repoRoot, 'template-out'));
if (out === repoRoot || repoRoot.startsWith(`${out}${path.sep}`)) {
  console.error('make-template: the output folder cannot be the repo itself or one of its parents.');
  process.exit(1);
}

const source = loadAccount();
const exampleDir = path.join(repoRoot, 'account.example');
if (!fs.existsSync(path.join(exampleDir, 'account.config.yaml'))) {
  console.error('make-template: account.example/ is missing, so there is no sample account folder to ship.');
  process.exit(1);
}

// ---------- copy ----------
const SKIP_NAMES = new Set(['node_modules', 'dist', '.astro', '.git', '__pycache__', '.DS_Store', 'Thumbs.db', 'template-out', 'template-verify', 'shots', '.playwright-mcp']);
const SITE_SKIP = new Set([
  'src/generated', // rebuilt by prep
  'public/brand', // synced from the account
  'public/downloads', // built zips
  'public/build.json', // written by prep
  'src/styles/tokens.generated.css', // rebuilt by prep
  'template', // the template's own README and CLAUDE.md live here
]);

function copyTree(from, to, skip = () => false) {
  if (!fs.existsSync(from)) return;
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (skip(src, entry)) continue;
    if (entry.isDirectory()) copyTree(src, dst, skip);
    else fs.copyFileSync(src, dst);
  }
}

console.log(`make-template: writing to ${out}`);
rmrf(out);
ensureDir(out);

copyTree(path.join(repoRoot, 'site'), path.join(out, 'site'), (src) => SITE_SKIP.has(toPosix(path.relative(siteRoot, src))));
copyTree(path.join(repoRoot, '.github'), path.join(out, '.github'));
copyTree(path.join(repoRoot, 'docs'), path.join(out, 'docs'));
// The sample folder becomes `account/`; its sample skill and made-up samples become `skills/` and `examples/`.
copyTree(exampleDir, path.join(out, 'account'), (src, e) => e.isDirectory() && ['skills', 'examples'].includes(path.basename(src)) && path.dirname(src) === exampleDir);
copyTree(path.join(exampleDir, 'skills'), path.join(out, 'skills'));
copyTree(path.join(exampleDir, 'examples'), path.join(out, 'examples'));

const tpl = (name) => fs.readFileSync(path.join(siteRoot, 'template', name), 'utf8');
fs.writeFileSync(path.join(out, 'README.md'), tpl('README.md'));
fs.writeFileSync(path.join(out, 'CLAUDE.md'), tpl('CLAUDE.md'));
fs.writeFileSync(path.join(out, '.gitignore'), tpl('gitignore.txt'));

// ---------- check: no trace of this account in the output ----------
const c = source.config;
const repo = parseRepo(c.repoUrl);
const siteRepo = c.siteRepoUrl ? parseRepo(c.siteRepoUrl) : null;
const skillNames = fs.existsSync(skillsDir()) ? fs.readdirSync(skillsDir(), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
const wordTerms = new Set();
// The team phrase is shared wording and must not name the client. When it is exactly what the shipped
// sample folder says, it is generic and not a trace of this account, so it is left out of the list.
// Any other phrase is still treated as specific to this account.
const exampleTeamPhrase = loadAccount(exampleDir).config.teamPhrase;
const teamPhrase = c.teamPhrase === exampleTeamPhrase ? null : c.teamPhrase;
for (const v of [c.clientName, c.fullName, teamPhrase, c.fictionalName, ...(c.forbiddenTerms ?? []), ...(c.clientAliases ?? []), ...(c.workstreams ?? []), ...skillNames, repo?.repo, repo?.owner, siteRepo?.repo, siteRepo?.owner]) {
  if (v && String(v).trim().length >= 3) wordTerms.add(String(v).trim());
}
// The made-up ticket prefix is matched as a key (prefix, hyphen, digits), not as a bare substring.
const prefix = c.ticketPrefix ? new RegExp(`\\b${c.ticketPrefix}-\\d`) : null;

const SKIP_CHECK = new Set(['package-lock.json']);
const problems = [];
let scanned = 0;
for (const file of walk(out, (full, e) => e.isDirectory() && e.name === 'node_modules')) {
  if (SKIP_CHECK.has(path.basename(file)) || !isTextFile(file)) continue;
  scanned++;
  const rel = toPosix(path.relative(out, file));
  fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      const low = line.toLowerCase();
      for (const term of wordTerms) if (low.includes(term.toLowerCase())) problems.push(`${rel}:${i + 1}`);
      if (prefix?.test(line)) problems.push(`${rel}:${i + 1}`);
    });
}

// The exported account must be the neutral example, not this account.
const exported = loadAccount(path.join(out, 'account'));
if (exported.config.clientName === c.clientName) problems.push('account/account.config.yaml:1 (still names this account)');
if ((exported.config.brandMode ?? 'neutral') !== 'neutral') problems.push('account/account.config.yaml:1 (brandMode must be neutral in the template)');

if (problems.length) {
  console.error('make-template FAILED: the export still contains traces of this account. Open the files at these lines (matched text is not printed):');
  for (const p of [...new Set(problems)].slice(0, 60)) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`  genericity: no trace of this account in ${scanned} exported files.`);

// ---------- check: the exported account passes check:account ----------
const r = spawnSync(process.execPath, [path.join(siteRoot, 'scripts', 'check-account.mjs')], {
  cwd: siteRoot,
  encoding: 'utf8',
  env: { ...process.env, SITE_ROOT: path.join(out, 'site'), ACCOUNT_DIR: 'account', SKILLS_DIR: 'skills', EXAMPLES_DIR: 'examples' },
});
process.stdout.write(r.stdout.replace(/^/gm, '  '));
if (r.status !== 0) {
  process.stderr.write(r.stderr);
  console.error('make-template FAILED: the exported account folder does not pass check:account.');
  process.exit(1);
}

console.log('\nTemplate written. Next steps:');
console.log('  1. cd into the output folder, run `git init`, and push it to a new repository.');
console.log('  2. In GitHub, turn on Settings > Template repository so other teams can use "Use this template".');
console.log('  3. Share docs/ADD-AN-ACCOUNT.md with the first team that adopts it.');
