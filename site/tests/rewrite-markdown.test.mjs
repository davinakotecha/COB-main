// The skill names below are invented for the test ("alpha", "beta"). Nothing here names a real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { rewriteHref, rewriteMarkdown } from '../scripts/lib/rewrite-markdown.mjs';

const repoRoot = path.resolve('/repo');
const repoUrl = 'https://github.com/owner/repo';
const ctxFor = (rel, base = '/repo') => ({ filePath: path.join(repoRoot, rel), repoRoot, repoUrl, base });

test('links between skills and references become site routes, anchors kept', () => {
  const c = ctxFor('skills/alpha/SKILL.md');
  assert.equal(rewriteHref('references/contract.md', c), '/repo/skills/alpha/contract/');
  assert.equal(rewriteHref('references/contract.md#6-built', c), '/repo/skills/alpha/contract/#6-built');
  assert.equal(rewriteHref('../beta/SKILL.md', c), '/repo/skills/beta/');
});

test('links from a reference page', () => {
  const c = ctxFor('skills/beta/references/patterns.md');
  assert.equal(rewriteHref('../SKILL.md', c), '/repo/skills/beta/');
  assert.equal(rewriteHref('./other.md', c), '/repo/skills/beta/other/');
  assert.equal(rewriteHref('../../alpha/references/contract.md#6-x', c), '/repo/skills/alpha/contract/#6-x');
});

test('scripts and other repo files become GitHub links', () => {
  const c = ctxFor('skills/alpha/SKILL.md');
  assert.equal(rewriteHref('scripts/run.py', c), 'https://github.com/owner/repo/blob/main/skills/alpha/scripts/run.py');
  assert.equal(rewriteHref('../../CLAUDE.md', c), 'https://github.com/owner/repo/blob/main/CLAUDE.md');
});

test('external, anchor and mail links are left alone', () => {
  const c = ctxFor('skills/x/SKILL.md');
  for (const h of ['https://example.com/a', '#section', 'mailto:a@b.co', '//cdn.example.com/x']) assert.equal(rewriteHref(h, c), h);
});

test('an empty base gives root-relative routes', () => {
  assert.equal(rewriteHref('references/a.md', ctxFor('skills/x/SKILL.md', '/')), '/skills/x/a/');
});

test('the first H1 is dropped, SKILL.md headings are demoted, code fences are untouched', () => {
  const md = ['---', 'name: x', '---', '', '# Title', '', '## Section', '', '```bash', '# a comment', '## not a heading', '```', '', '### Sub', ''].join('\n');
  const out = rewriteMarkdown(md, ctxFor('skills/x/SKILL.md'));
  assert.ok(!out.includes('# Title'));
  assert.match(out, /\n### Section\n/);
  assert.match(out, /\n#### Sub\n/);
  assert.match(out, /\n# a comment\n## not a heading\n/);
  assert.match(out, /^---\nname: x\n---\n/);
});

test('reference pages keep their heading levels', () => {
  const out = rewriteMarkdown('# Ref\n\n## One\n', ctxFor('skills/x/references/r.md'));
  assert.match(out, /^## One\n/);
});

test('links in text and definitions are rewritten, images are not', () => {
  const md = 'See [the contract](references/contract.md#a) and ![pic](img.png).\n\n[def]: references/b.md\n';
  const out = rewriteMarkdown(md, ctxFor('skills/x/SKILL.md'));
  assert.match(out, /\[the contract\]\(\/repo\/skills\/x\/contract\/#a\)/);
  assert.match(out, /!\[pic\]\(img\.png\)/);
  assert.match(out, /\[def\]: \/repo\/skills\/x\/b\//);
});
