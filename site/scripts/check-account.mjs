// Validates an account folder with plain messages. Fails on:
//   - a missing required field
//   - an accent colour that is not a hex colour, or has under 3:1 contrast on white or on #161616
//   - a logo file listed in the config but missing
//   - a workstream used in skill-meta.yaml that is not in the config
//   - a repoUrl that is not an https://github.com/... link
//   - an empty ticketPrefix
// Run it on another folder with ACCOUNT_DIR=account.example.
import fs from 'node:fs';
import path from 'node:path';
import { loadAccount, REQUIRED_FIELDS, parseRepo, repoRoot } from './lib/account.mjs';
import { contrastRatio, isHex } from './lib/contrast.mjs';

const account = loadAccount();
const c = account.config;
const dir = account.dir;
const errors = [];
const fail = (msg) => errors.push(msg);

for (const f of REQUIRED_FIELDS) {
  const v = c[f];
  const empty = v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
  if (empty) fail(`account.config.yaml is missing "${f}". See docs/ADD-AN-ACCOUNT.md for what it does.`);
}

if (c.accentColour) {
  if (!isHex(c.accentColour)) {
    fail(`accentColour "${c.accentColour}" is not a hex colour. Use six digits, for example "#0d9ad2".`);
  } else {
    const onWhite = contrastRatio(c.accentColour, '#ffffff');
    const onInk = contrastRatio(c.accentColour, '#161616');
    if (onWhite < 3) fail(`accentColour ${c.accentColour} has ${onWhite.toFixed(2)}:1 contrast on white. It needs 3:1. Try a darker shade.`);
    if (onInk < 3) fail(`accentColour ${c.accentColour} has ${onInk.toFixed(2)}:1 contrast on #161616. It needs 3:1. Try a lighter shade.`);
  }
}

if (c.repoUrl && !parseRepo(c.repoUrl)) {
  fail(`repoUrl "${c.repoUrl}" must look like https://github.com/owner/repo.`);
}
if (c.ticketPrefix !== undefined && String(c.ticketPrefix).trim() === '') {
  fail('ticketPrefix is empty. Choose a made-up prefix of two to ten capital letters for the invented ticket keys in examples.');
}

for (const key of ['ibm', 'client']) {
  const rel = c.logos?.[key];
  if (!rel) {
    if (key === 'ibm' || (c.brandMode ?? 'neutral') === 'account') fail(`logos.${key} is not set in account.config.yaml.`);
    continue;
  }
  const committed = path.join(dir, rel);
  const local = path.join(repoRoot, 'local', 'brand', path.basename(rel));
  if (!fs.existsSync(committed) && !fs.existsSync(local)) {
    fail(`logos.${key} points to "${rel}", but that file is not in ${path.relative(repoRoot, dir)}/ or local/brand/.`);
  }
}
for (const key of ['ibmReversed', 'clientReversed']) {
  const rel = c.logos?.[key];
  if (rel && !fs.existsSync(path.join(dir, rel)) && !fs.existsSync(path.join(repoRoot, 'local', 'brand', path.basename(rel)))) {
    fail(`logos.${key} points to "${rel}", but that file does not exist. Remove the line or add the file.`);
  }
}

const listed = new Set(c.workstreams ?? []);
for (const [slug, meta] of Object.entries(account.skillMeta)) {
  const w = meta?.workstream;
  if (w && !listed.has(w)) fail(`skill-meta.yaml: "${slug}" uses workstream "${w}", which is not listed under workstreams in account.config.yaml.`);
}
for (const item of account.roadmap) {
  if (!item.title || !item.summary) fail(`roadmap.yaml: item "${item.id ?? '(no id)'}" needs a title and a summary.`);
  if (item.status && !['idea', 'in-progress'].includes(item.status)) {
    fail(`roadmap.yaml: item "${item.id}" has status "${item.status}". Use idea or in-progress. Live items come from skills/.`);
  }
}

if (errors.length) {
  console.error(`check:account found ${errors.length} problem(s) in ${path.relative(repoRoot, dir)}/:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check:account passed for ${path.relative(repoRoot, dir)}/.`);
