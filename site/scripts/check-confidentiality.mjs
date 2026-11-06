// Content guard for the repo's own rule: no real client content in tracked files.
// Fails if tracked content outside the account folder contains:
//   - a ticket-style key that is not the account's made-up prefix
//   - an e-mail address
//   - any term from local/brand/deny-terms.txt, or the DENY_TERMS environment variable
// With --dist it also searches the built site, and in ibm-only / neutral mode it looks for the
// client's name and logo file names there.
// On failure it prints the file and line number only, never the matched text: CI logs may be public.
import fs from 'node:fs';
import path from 'node:path';
import { loadAccount, brandMode, repoRoot, siteRoot, accountDir, skillsRepoRoot } from './lib/account.mjs';
import { trackedFiles, walk, toPosix, isTextFile } from './lib/files.mjs';

const wantDist = process.argv.includes('--dist');
const account = loadAccount();
const mode = brandMode(account.config);
const prefix = account.config.ticketPrefix;

// Key-shaped words that are not tickets.
const SAFE_PREFIXES = new Set([prefix, 'ISO', 'UTF', 'SHA', 'MD', 'RFC', 'TLS', 'AES', 'PEP', 'HTTP', 'UTC', 'CVE', 'WCAG', 'ARIA', 'ECMA', 'ANSI', 'IEEE']);
const TICKET = /\b[A-Z][A-Z0-9]{1,9}-\d+\b/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Addresses that are not people: the noreply identity used for commits, and the GitHub bot users.
const EMAIL_ALLOW = [/@users\.noreply\.github\.com$/i, /^noreply@/i, /^git@github\.com$/i, /@example\.(com|org|net)$/i];

function denyTerms() {
  const terms = [];
  const file = path.join(repoRoot, 'local', 'brand', 'deny-terms.txt');
  if (fs.existsSync(file)) terms.push(...fs.readFileSync(file, 'utf8').split(/\r?\n/));
  if (process.env.DENY_TERMS) terms.push(...process.env.DENY_TERMS.split(/[\r\n,]+/));
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

const accountRel = toPosix(path.relative(repoRoot, accountDir()));
const exampleRel = 'account.example';
const skip = (rel) =>
  rel.startsWith(`${accountRel}/`) ||
  rel.startsWith(`${exampleRel}/`) ||
  rel.startsWith('local/') ||
  rel.startsWith('node_modules/') ||
  rel.includes('/node_modules/') ||
  rel.endsWith('package-lock.json') ||
  rel.endsWith('.pptx') ||
  rel.endsWith('.potx') ||
  rel.endsWith('.zip') ||
  rel.endsWith('.woff2') ||
  rel.endsWith('.svg') ||
  // This file and its docs have to mention the rules they enforce.
  rel === 'site/scripts/check-confidentiality.mjs' ||
  rel === 'site/src/lib/skill-rules.ts' ||
  rel.startsWith('site/tests/');

const problems = [];
const add = (file, line, kind) => problems.push(`${file}:${line}  ${kind}`);

/** Ticket keys and e-mail addresses are only looked for in readable content, so minified bundles cannot false-positive. */
function scan(rel, text, terms, termsAvailable, contentRules = true) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (contentRules) {
      for (const m of line.matchAll(TICKET)) {
        const p = m[0].split('-')[0];
        if (!SAFE_PREFIXES.has(p)) add(rel, i + 1, 'ticket-style key that is not the made-up prefix');
      }
      for (const m of line.matchAll(EMAIL)) {
        if (!EMAIL_ALLOW.some((re) => re.test(m[0]))) add(rel, i + 1, 'e-mail address');
      }
    }
    if (termsAvailable) {
      const low = line.toLowerCase();
      if (terms.some((t) => low.includes(t.toLowerCase()))) add(rel, i + 1, 'term from the deny list');
    }
  });
}

const terms = denyTerms();
const termsAvailable = terms.length > 0;

let scanned = 0;
// The site repository, and the skills repository too when the skills live in a separate checkout.
const roots = [{ root: repoRoot, label: '' }];
if (skillsRepoRoot() !== repoRoot && fs.existsSync(skillsRepoRoot())) roots.push({ root: skillsRepoRoot(), label: '(skills repo) ' });
for (const { root, label } of roots) {
  for (const rel of trackedFiles(root)) {
    if (skip(rel)) continue;
    const abs = path.join(root, rel);
    if (!isTextFile(abs)) continue;
    scan(`${label}${rel}`, fs.readFileSync(abs, 'utf8'), terms, termsAvailable);
    scanned++;
  }
}

// The built site: in ibm-only and neutral modes the client must not appear at all.
if (wantDist) {
  const dist = path.join(siteRoot, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('check:confidentiality --dist needs a built site in site/dist. Run `npm run build` first.');
    process.exit(1);
  }
  const clientTerms = [account.config.clientName, ...(account.config.clientAliases ?? [])].filter(Boolean);
  const clientFiles = [account.config.logos?.client, account.config.logos?.clientReversed].filter(Boolean).map((f) => path.basename(f));
  for (const file of walk(dist, (full, e) => e.isDirectory() && e.name === 'pagefind')) {
    const rel = `site/dist/${toPosix(path.relative(dist, file))}`;
    if (!isTextFile(file) && !file.endsWith('.xml')) {
      if (mode !== 'account' && clientFiles.includes(path.basename(file))) add(rel, 0, 'client logo file in a non-account build');
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    if (mode !== 'account') {
      text.split(/\r?\n/).forEach((line, i) => {
        const l = line.toLowerCase();
        if (clientTerms.some((t) => l.includes(t.toLowerCase()))) add(rel, i + 1, 'client name in a non-account build');
        if (clientFiles.some((f) => l.includes(f.toLowerCase()))) add(rel, i + 1, 'client logo file name in a non-account build');
      });
    }
    if (termsAvailable) scan(rel, text, terms, true, file.endsWith('.html'));
  }

  // In account mode the client may be named on the account pages only: the Library, each skill and
  // reference page, and the Roadmap. Everywhere else its name must not appear in the visible text, the page
  // title or the meta description. Logos and their alt text and aria-labels are not text and are left alone.
  if (mode === 'account') {
    const ACCOUNT_AREAS = ['skills/', 'roadmap/'];
    const hasClient = (s) => clientTerms.some((t) => s.toLowerCase().includes(t.toLowerCase()));
    // Replace everything that is not visible text with spaces, keeping newlines so line numbers still match.
    const blank = (m) => m.replace(/[^\r\n]/g, ' ');
    const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
    const BLOCK = /<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi;
    const META = /<meta\b[^>]*\bname=["']description["'][^>]*>/gi;
    for (const file of walk(dist, (full, e) => e.isDirectory() && e.name === 'pagefind')) {
      if (!file.endsWith('.html')) continue;
      const pageRel = toPosix(path.relative(dist, file));
      if (ACCOUNT_AREAS.some((a) => pageRel.startsWith(a))) continue;
      const html = fs.readFileSync(file, 'utf8');
      const rel = `site/dist/${pageRel}`;
      const visible = html.replace(BLOCK, blank).replace(TAG, blank).split(/\r?\n/);
      visible.forEach((line, i) => {
        if (hasClient(line)) add(rel, i + 1, 'client name in the visible text or title of a page that is not an account page');
      });
      html.split(/\r?\n/).forEach((line, i) => {
        for (const m of line.matchAll(META)) {
          if (hasClient(m[0].replace(/^[\s\S]*?content=/i, ''))) add(rel, i + 1, 'client name in the meta description of a page that is not an account page');
        }
      });
    }
  }
}

if (problems.length) {
  console.error('Confidentiality check failed. Matched text is not printed, so open the file at the line given:');
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
  if (problems.length > 50) console.error(`  ... and ${problems.length - 50} more`);
  process.exit(1);
}
console.log(
  `check:confidentiality passed (${scanned} files${wantDist ? ' plus dist' : ''}).` +
    (termsAvailable ? '' : ' The deny-term check was skipped: no local/brand/deny-terms.txt and no DENY_TERMS secret.'),
);
