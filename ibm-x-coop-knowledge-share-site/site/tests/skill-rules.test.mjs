// Run with: npm test   (Node 22.18+ strips TypeScript types natively, so no build step is needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkName,
  checkDescription,
  checkConfidential,
  checkBodyLength,
  foreignTicketKeys,
  buildSkillMd,
  frontmatter,
  readmeRow,
  zipFiles,
} from '../src/lib/skill-rules.ts';

const draft = (over = {}) => ({
  name: 'status-update-writer',
  title: 'Status update writer',
  summary: 'Writes the weekly status update from notes.',
  description: 'Write the weekly status update. Use when the user asks for a status update.',
  inputs: 'Workshop notes',
  recipe: 'Read the notes\nWrite the update',
  outOfScope: 'Anything about people',
  scripts: true,
  references: true,
  ...over,
});

test('names: accepts a good name', () => assert.equal(checkName('status-update-writer').level, 'ok'));
test('names: rejects uppercase, spaces, double hyphens, edges', () => {
  for (const bad of ['Status', 'a b', 'a--b', '-a', 'a-', 'a_b', '']) assert.equal(checkName(bad).level, 'bad', bad);
});
test('names: rejects reserved words and synced', () => {
  assert.equal(checkName('my-claude-helper').level, 'bad');
  assert.equal(checkName('anthropic-tools').level, 'bad');
  assert.equal(checkName('synced').level, 'bad');
});
test('names: rejects over 64 characters', () => assert.equal(checkName('a'.repeat(65)).level, 'bad'));
test('names: accepts exactly 64', () => assert.equal(checkName('a'.repeat(64)).level, 'ok'));

test('description: length limit is 1024', () => {
  assert.equal(checkDescription('Use when x. ' + 'a'.repeat(1012))[0].level, 'ok');
  assert.equal(checkDescription('a'.repeat(1025))[0].level, 'bad');
  assert.match(checkDescription('a'.repeat(1031))[0].message, /1,031 characters.*1,024/);
});
test('description: rejects XML tags but not plain comparisons', () => {
  assert.equal(checkDescription('Use when <b>bold</b>')[0].level, 'bad');
  assert.equal(checkDescription('Use when a < b and c > d')[0].level, 'ok');
});
test('description: nudges when there is no "use when"', () => {
  assert.ok(checkDescription('Writes things.').some((c) => c.level === 'warn'));
  assert.ok(!checkDescription('Use when asked.').some((c) => c.level === 'warn'));
});

test('confidentiality: flags foreign ticket keys, allows the made-up prefix and standards', () => {
  assert.deepEqual(foreignTicketKeys('See ABC-123 and EXA-42, ISO-8601, UTF-8, SHA-256, ECMA-376', 'EXA'), ['ABC-123']);
  assert.equal(checkConfidential('EXA-42 only', 'EXA').length, 0);
  assert.equal(checkConfidential('ping a.person@example.com', 'EXA')[0].level, 'bad');
});

test('body length: warns above 200, errors above 500', () => {
  assert.equal(checkBodyLength(120).level, 'ok');
  assert.equal(checkBodyLength(201).level, 'warn');
  assert.equal(checkBodyLength(501).level, 'bad');
});

test('SKILL.md: frontmatter double-quotes and escapes the description', () => {
  const fm = frontmatter(draft({ description: 'Say "hi"\nthen go. Use when asked.' }));
  assert.match(fm, /^---\nname: status-update-writer\ndescription: "Say \\"hi\\"\\nthen go\. Use when asked\."\n---$/);
});
test('SKILL.md: keeps a leading number in a step but strips a typed list marker', () => {
  const md = buildSkillMd(draft({ recipe: '- Read the notes\n3 workshops are covered\n2) Write it up' }));
  assert.match(md, /1\. Read the notes\n2\. 3 workshops are covered\n3\. Write it up/);
});
test('SKILL.md: has the fixed sections and the confidentiality pointer', () => {
  const md = buildSkillMd(draft());
  for (const h of ['# Status update writer', '## Inputs this skill accepts', '## The recipe', '## Out of scope', '## Confidentiality', '## Before calling it done']) {
    assert.ok(md.includes(h), h);
  }
  assert.match(md, /1\. Read the notes\n2\. Write the update/);
});
test('README row and zip layout', () => {
  assert.equal(readmeRow(draft()), '| [`skills/status-update-writer`](skills/status-update-writer/SKILL.md) | Writes the weekly status update from notes. |');
  const keys = Object.keys(zipFiles(draft()));
  assert.ok(keys.includes('skills/status-update-writer/SKILL.md'));
  assert.ok(keys.includes('skills/status-update-writer/references/README.md'));
  assert.ok(keys.includes('skills/status-update-writer/scripts/README.md'));
  assert.ok(!Object.keys(zipFiles(draft({ scripts: false }))).some((k) => k.includes('/scripts/')));
});
