// Runs before `dev` and `build`: skill manifest, account demo data, zips, brand sync, Carbon tokens.
// Any failure stops the build. It never falls back to stale data.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { zipSync, strToU8 } from 'fflate';
import { loadAccount, brandMode, deriveHosting, repoRoot, siteRoot, skillsRepoRoot, skillsDir as getSkillsDir, examplesDir as getExamplesDir } from './lib/account.mjs';
import { ensureDir, rmrf, writeJson, walk, toPosix, lastChanged, gitShortSha } from './lib/files.mjs';
import { buildTokensCss } from './lib/build-tokens.mjs';
import { rewriteMarkdown } from './lib/rewrite-markdown.mjs';

const generated = path.join(siteRoot, 'src', 'generated');
const publicDir = path.join(siteRoot, 'public');
const warnings = [];
const warn = (m) => {
  warnings.push(m);
  console.warn(`  ! ${m}`);
};

const account = loadAccount();
const mode = brandMode(account.config);
console.log(`prep: account "${path.basename(account.dir)}", brand mode "${mode}"`);

// ---------- 1. skill manifest ----------
function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  return { data: YAML.parse(m[1]) ?? {}, body: text.slice(m[0].length) };
}

/** First module docstring of a Python file (CLI usage lives there). */
function docstring(src) {
  const m = /^(?:#!.*\r?\n)?\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/.exec(src);
  return m ? (m[1] ?? m[2]).replace(/\r\n/g, '\n').trim() : '';
}

function firstSentence(text) {
  return String(text ?? '').split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
}

const skillsDir = getSkillsDir();
const examplesDir = getExamplesDir();
if (!fs.existsSync(skillsDir)) {
  throw new Error(
    `Cannot find the skills folder at ${skillsDir}. If your skills live in a separate repository, check it out next to this one and set SKILLS_REPO_ROOT to its path (see docs/ADD-AN-ACCOUNT.md).`,
  );
}
// Paths shown on the site (GitHub links, "last changed") are relative to the repository that holds the skills.
const skillsRoot = skillsRepoRoot();
const rel = (p) => toPosix(path.relative(skillsRoot, p));
const skills = [];
for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  const dir = path.join(skillsDir, slug);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    warn(`skills/${slug} has no SKILL.md, so it is skipped.`);
    continue;
  }
  const { data, body } = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
  const overlay = account.skillMeta[slug];
  if (!overlay) warn(`skills/${slug} has no entry in ${path.basename(account.dir)}/skill-meta.yaml, so it shows under "Unsorted".`);

  const refDir = path.join(dir, 'references');
  const references = fs.existsSync(refDir)
    ? fs
        .readdirSync(refDir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => {
          const text = fs.readFileSync(path.join(refDir, f), 'utf8');
          const h1 = /^#\s+(.+)$/m.exec(text);
          return { file: f, slug: f.replace(/\.md$/, ''), title: h1 ? h1[1].trim() : f.replace(/\.md$/, '') };
        })
    : [];

  const scriptDir = path.join(dir, 'scripts');
  const scripts = fs.existsSync(scriptDir)
    ? fs
        .readdirSync(scriptDir)
        .filter((f) => f.endsWith('.py') && !f.startsWith('_'))
        .sort()
        .map((f) => ({ file: f, usage: docstring(fs.readFileSync(path.join(scriptDir, f), 'utf8')) }))
    : [];

  const exampleName = overlay?.example ?? slug;
  const hasExamples = fs.existsSync(path.join(examplesDir, exampleName));
  // Fictional template files in the skill's examples, offered as downloads (copied at build, never committed under site/).
  const fictionalFiles = hasExamples
    ? [...walk(path.join(examplesDir, exampleName))].filter((f) => /\.(pptx|potx)$/i.test(f)).map((f) => path.basename(f))
    : [];
  const title = (/^#\s+(.+)$/m.exec(body)?.[1] ?? slug).trim();

  skills.push({
    slug,
    name: data.name ?? slug,
    title,
    description: String(data.description ?? '').trim(),
    workstream: overlay?.workstream ?? 'Unsorted',
    tagline: overlay?.tagline ?? firstSentence(data.description),
    give: overlay?.give ?? null,
    get: overlay?.get ?? null,
    needs: overlay?.needs ?? null,
    pairsWith: overlay?.pairsWith ?? null,
    pairsWhy: overlay?.pairsWhy ?? null,
    pairsVia: overlay?.pairsVia ?? null,
    example: overlay?.example ?? null,
    status: overlay?.status ?? 'Live',
    references,
    scripts,
    hasExamples,
    fictionalFiles,
    exampleDir: hasExamples ? rel(path.join(examplesDir, exampleName)) : null,
    skillPath: rel(dir),
    lastChanged: lastChanged(rel(dir), skillsRoot),
  });
}
skills.sort((a, b) => a.slug.localeCompare(b.slug));

for (const s of skills) {
  if (s.workstream !== 'Unsorted' && !account.config.workstreams?.includes(s.workstream)) {
    warn(`skills/${s.slug}: workstream "${s.workstream}" is not listed in account.config.yaml.`);
  }
  if (s.pairsWith && !skills.some((o) => o.slug === s.pairsWith)) {
    warn(`skills/${s.slug}: pairsWith "${s.pairsWith}" is not a skill in skills/.`);
    s.pairsWith = null;
  }
}
writeJson(path.join(generated, 'skills.json'), skills);
console.log(`  skill manifest: ${skills.length} skills`);

// ---------- 1b. skill documents, with links and headings rewritten for the site ----------
const docsOut = path.join(generated, 'skill-docs');
rmrf(docsOut);
const { base } = deriveHosting(account.config);
// Link rewriting resolves relative links against the repository that holds the skills, which may be a
// separate checkout from this one (SKILLS_REPO_ROOT).
const rewriteCtx = { repoRoot: skillsRepoRoot(), repoUrl: account.config.repoUrl.replace(/\/+$/, '').replace(/\.git$/, ''), base };
let docCount = 0;
for (const s of skills) {
  const dir = path.join(skillsDir, s.slug);
  const files = [path.join(dir, 'SKILL.md'), ...s.references.map((r) => path.join(dir, 'references', r.file))];
  for (const file of files) {
    const out = path.join(docsOut, s.slug, path.relative(dir, file));
    ensureDir(path.dirname(out));
    fs.writeFileSync(out, rewriteMarkdown(fs.readFileSync(file, 'utf8'), { ...rewriteCtx, filePath: file }));
    docCount++;
  }
}
console.log(`  skill documents: ${docCount} rewritten`);

// ---------- 2. account demo data (worked examples) ----------
const demoScript = path.join(account.dir, 'build-demo-data.mjs');
let demo = { examples: {} };
if (fs.existsSync(demoScript)) {
  const mod = await import(pathToFileURL(demoScript).href);
  demo = await mod.default({ repoRoot: skillsRoot, account, skillsDir, examplesDir });
  console.log(`  demo data: ${Object.keys(demo.examples ?? {}).join(', ') || 'none'}`);
}
writeJson(path.join(generated, 'demo.json'), demo);

// ---------- 3. one zip per skill ----------
const SKIP = new Set(['__pycache__', '.DS_Store', 'Thumbs.db']);
const downloads = path.join(publicDir, 'downloads');
rmrf(downloads);
ensureDir(downloads);
for (const s of skills) {
  const root = path.join(skillsDir, s.slug);
  const files = {};
  for (const file of walk(root, (full, e) => SKIP.has(e.name))) {
    if (file.endsWith('.pyc')) continue;
    files[`${s.slug}/${toPosix(path.relative(root, file))}`] = new Uint8Array(fs.readFileSync(file));
  }
  fs.writeFileSync(path.join(downloads, `${s.slug}.zip`), zipSync(files, { level: 9, mtime: new Date(2026, 0, 1) }));
}
// Fictional template files, copied into the build output only. The repo's .gitignore blocks .pptx outside examples/.
for (const s of skills) {
  if (!s.exampleDir) continue;
  for (const file of walk(path.join(skillsRoot, s.exampleDir))) {
    if (/\.(pptx|potx)$/i.test(file)) fs.copyFileSync(file, path.join(downloads, path.basename(file)));
  }
}
console.log(`  zips: ${skills.length}`);

// ---------- 4. brand sync ----------
const brandOut = path.join(publicDir, 'brand');
rmrf(brandOut);
ensureDir(brandOut);
const logos = account.config.logos ?? {};
const wanted = new Set();
if (mode !== 'neutral') {
  for (const key of ['ibm', 'ibmReversed']) if (logos[key]) wanted.add(logos[key]);
  if (mode === 'account') for (const key of ['client', 'clientReversed']) if (logos[key]) wanted.add(logos[key]);
}
const localBrand = path.join(repoRoot, 'local', 'brand');
for (const rel of wanted) {
  const committed = path.join(account.dir, rel);
  const local = path.join(localBrand, path.basename(rel));
  const src = fs.existsSync(committed) ? committed : fs.existsSync(local) ? local : null;
  if (src) fs.copyFileSync(src, path.join(brandOut, path.basename(rel)));
  else if (process.env.NODE_ENV === 'production' || process.env.CI) {
    throw new Error(`Logo file "${rel}" is listed in account.config.yaml but missing from ${path.basename(account.dir)}/ and local/brand/.`);
  } else {
    warn(`Logo file "${rel}" is missing. Dev builds show a placeholder; production builds fail.`);
  }
}
console.log(`  brand: ${fs.readdirSync(brandOut).length} file(s) for mode "${mode}"`);

// ---------- 4b. build info, read by the pages (they cannot touch git or the file system themselves) ----------
writeJson(path.join(generated, 'build-info.json'), {
  sha: gitShortSha(repoRoot),
  date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
  brandFiles: fs.readdirSync(brandOut),
});

// ---------- 5. Carbon tokens ----------
ensureDir(path.join(siteRoot, 'src', 'styles'));
fs.writeFileSync(path.join(siteRoot, 'src', 'styles', 'tokens.generated.css'), await buildTokensCss());
console.log('  tokens: written from @carbon/themes and @carbon/colors');

console.log(warnings.length ? `prep done with ${warnings.length} warning(s).` : 'prep done.');
