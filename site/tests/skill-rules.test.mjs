// Run with: npm test   (Node 22.18+ strips TypeScript types natively, so no build step is needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkName,
  checkDescription,
  checkConfidential,
  checkBodyLength,
  checkDetails,
  checkDraft,
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
  workstream: 'Alpha stream',
  tagline: 'Write the weekly status update from notes.',
  give: 'Workshop notes, pasted in.',
  get: 'A status update in the standard format.',
  needs: 'Nothing beyond Claude.',
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
  assert.match(fm, /^---\nname: status-update-writer\ndescription: "Say \\"hi\\"\\nthen go\. Use when asked\."\nmetadata:\n/);
  assert.ok(fm.endsWith('\n---'));
});
test('SKILL.md: the site details sit under metadata with the ks- prefix, never at the top level', () => {
  const fm = frontmatter(draft());
  assert.equal(
    fm,
    [
      '---',
      'name: status-update-writer',
      'description: "Write the weekly status update. Use when the user asks for a status update."',
      'metadata:',
      '  ks-workstream: "Alpha stream"',
      '  ks-tagline: "Write the weekly status update from notes."',
      '  ks-give: "Workshop notes, pasted in."',
      '  ks-get: "A status update in the standard format."',
      '  ks-needs: "Nothing beyond Claude."',
      '---',
    ].join('\n'),
  );
  // Anthropic's skill-creator validator allows only these top-level keys.
  const top = fm.split('\n').filter((l) => /^[a-z-]+:/.test(l)).map((l) => l.split(':')[0]);
  assert.deepEqual(top, ['name', 'description', 'metadata']);
});
test('SKILL.md: every detail value is quoted, so a colon or quote cannot break the YAML', () => {
  const fm = frontmatter(draft({ tagline: 'Turns notes: fast, "clean" and #tidy' }));
  assert.match(fm, /ks-tagline: "Turns notes: fast, \\"clean\\" and #tidy"/);
});
test('SKILL.md: "it needs" is left out when empty, the required details are always written', () => {
  const fm = frontmatter(draft({ needs: '', get: '' }));
  assert.ok(!fm.includes('ks-needs'));
  assert.match(fm, /ks-get: ""/);
});
test('SKILL.md: line breaks in a detail are folded into one line', () => {
  assert.match(frontmatter(draft({ give: 'First line\n  second line' })), /ks-give: "First line second line"/);
});

test('details checks: a complete draft passes, a missing one is marked Fix, a long tagline only warns', () => {
  const ws = ['Alpha stream'];
  assert.ok(checkDetails(draft(), ws).every((c) => c.level === 'ok'));
  const missing = checkDetails(draft({ get: '   ' }), ws);
  assert.ok(missing.some((c) => c.level === 'bad' && /You get/.test(c.message)));
  assert.ok(checkDetails(draft({ workstream: '' }), ws).some((c) => c.level === 'bad'));
  assert.ok(checkDetails(draft({ workstream: 'Somewhere else' }), ws).some((c) => c.level === 'bad' && /listed workstreams/.test(c.message)));
  const long = checkDetails(draft({ tagline: 'x'.repeat(130) }), ws);
  assert.ok(long.some((c) => c.level === 'warn' && /130 characters/.test(c.message)));
  assert.ok(!long.some((c) => c.level === 'bad'));
  assert.ok(!checkDetails(draft({ needs: '' }), ws).some((c) => c.level === 'bad'), 'it needs is optional');
});
test('details checks: checkDraft blocks a draft with missing details, so the generator cannot produce a skill the build rejects', () => {
  const ws = ['Alpha stream'];
  assert.ok(!checkDraft(draft(), 'EXA', ws).some((c) => c.level === 'bad'));
  assert.ok(checkDraft(draft({ give: '' }), 'EXA', ws).some((c) => c.level === 'bad'));
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
