// The rules that decide whether a skill has everything the library tile and page need.
// Names below are invented. Nothing here names a real account, skill or workstream.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkillDetails, detailProblems, DETAIL_KEYS, REQUIRED_DETAILS } from '../scripts/lib/skill-details.mjs';
import { frontmatter } from '../src/lib/skill-rules.ts';
import YAML from 'yaml';

const config = { workstreams: ['Alpha stream', 'Beta stream'] };
const known = { knownSlugs: new Set(['first-skill', 'second-skill']) };

const metadata = (over = {}) => ({
  'ks-workstream': 'Alpha stream',
  'ks-tagline': 'Does one useful thing.',
  'ks-give': 'A note.',
  'ks-get': 'A summary.',
  ...over,
});
const fm = (over) => ({ name: 'first-skill', description: 'Use when asked.', metadata: metadata(over) });

test('a skill with the metadata block resolves with no problems', () => {
  const r = resolveSkillDetails(fm(), undefined, config, known);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.details.workstream, 'Alpha stream');
  assert.equal(r.details.tagline, 'Does one useful thing.');
  assert.equal(r.details.give, 'A note.');
  assert.equal(r.details.get, 'A summary.');
  assert.equal(r.details.needs, null);
});

test('metadata beats the overlay, field by field', () => {
  const overlay = { workstream: 'Beta stream', tagline: 'From the overlay.', give: 'Overlay give.', get: 'Overlay get.', needs: 'Overlay needs.' };
  const r = resolveSkillDetails(fm(), overlay, config, known);
  assert.equal(r.details.workstream, 'Alpha stream');
  assert.equal(r.details.tagline, 'Does one useful thing.');
  assert.equal(r.details.needs, 'Overlay needs.', 'a field the metadata does not set falls back to the overlay');
  assert.deepEqual(r.errors, []);
});

test('the overlay alone is enough (an older skill that we do not edit)', () => {
  const overlay = { workstream: 'Beta stream', tagline: 'T.', give: 'G.', get: 'R.' };
  const r = resolveSkillDetails({ name: 'old-skill', description: 'x' }, overlay, config, known);
  assert.deepEqual(r.errors, []);
  assert.equal(r.details.workstream, 'Beta stream');
});

test('each required field, when missing, is an error that names its key', () => {
  for (const field of REQUIRED_DETAILS) {
    const r = resolveSkillDetails(fm({ [DETAIL_KEYS[field]]: undefined }), undefined, config, known);
    assert.equal(r.errors.length, 1, field);
    assert.equal(r.errors[0].code, 'missing');
    assert.ok(r.errors[0].message.includes(`"${DETAIL_KEYS[field]}"`), r.errors[0].message);
    assert.equal(r.details[field], null);
  }
});

test('a blank or whitespace-only value counts as missing', () => {
  const r = resolveSkillDetails(fm({ 'ks-get': '   ' }), undefined, config, known);
  assert.equal(r.errors[0].code, 'missing');
});

test('no metadata block and no overlay: every required field is an error', () => {
  const r = resolveSkillDetails({ name: 'bare', description: 'x' }, undefined, config, known);
  assert.deepEqual(r.errors.map((e) => e.field).sort(), [...REQUIRED_DETAILS].sort());
});

test('a value that is not text is an error, not a crash', () => {
  for (const bad of [42, true, ['a', 'b'], { a: 1 }]) {
    const r = resolveSkillDetails(fm({ 'ks-give': bad }), undefined, config, known);
    assert.equal(r.errors.length, 1);
    assert.equal(r.errors[0].code, 'not-string');
    assert.match(r.errors[0].message, /must be text/);
  }
});

test('a workstream the account does not list is an error that lists the valid ones', () => {
  const r = resolveSkillDetails(fm({ 'ks-workstream': 'Gamma stream' }), undefined, config, known);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].code, 'unknown-workstream');
  assert.match(r.errors[0].message, /Alpha stream, Beta stream/);
});

test('a long tagline or description is a warning, not an error', () => {
  const r = resolveSkillDetails(fm({ 'ks-tagline': 'x'.repeat(121), 'ks-give': 'y'.repeat(201) }), undefined, config, known);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 2);
  assert.ok(r.warnings.every((w) => w.code === 'too-long'));
  assert.equal(detailProblems('tagline', 'x'.repeat(120), config.workstreams).length, 0, '120 is allowed');
});

test('pairs-with must name a skill that exists; the pairing is dropped when it does not', () => {
  const ok = resolveSkillDetails(fm({ 'ks-pairs-with': 'second-skill', 'ks-pairs-why': 'Because.', 'ks-pairs-via': 'JSON' }), undefined, config, known);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.details.pairsWith, 'second-skill');
  assert.equal(ok.details.pairsVia, 'JSON');
  const bad = resolveSkillDetails(fm({ 'ks-pairs-with': 'no-such-skill' }), undefined, config, known);
  assert.equal(bad.errors[0].code, 'unknown-pair');
  assert.equal(bad.details.pairsWith, null);
});

test('pairs-why without pairs-with is a warning', () => {
  const r = resolveSkillDetails(fm({ 'ks-pairs-why': 'Because.' }), undefined, config, known);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings[0].code, 'pair-text-alone');
});

test('a misspelt ks- key is flagged so it is not silently ignored', () => {
  const r = resolveSkillDetails(fm({ 'ks-taglin': 'oops' }), undefined, config, known);
  assert.equal(r.warnings[0].code, 'unknown-key');
});

test('metadata that is not a map is an error', () => {
  const r = resolveSkillDetails({ name: 'x', metadata: 'a string' }, undefined, config, known);
  assert.ok(r.errors.some((e) => e.code === 'metadata-not-map'));
});

test('text is tidied: surrounding space trimmed, inner runs of space collapsed', () => {
  const r = resolveSkillDetails(fm({ 'ks-tagline': '  Two   spaces\n here  ' }), undefined, config, known);
  assert.equal(r.details.tagline, 'Two spaces here');
});

test('what the generator writes is exactly what the build accepts (round trip through YAML)', () => {
  const draft = {
    name: 'round-trip-skill',
    title: 'Round trip skill',
    summary: 's',
    description: 'Does a thing. Use when asked.',
    workstream: 'Beta stream',
    tagline: 'Turns notes: fast, "clean" and #tidy',
    give: 'A note with a colon: here.',
    get: 'A summary.',
    needs: 'Python 3.',
    inputs: '',
    recipe: '',
    outOfScope: '',
    scripts: false,
    references: false,
  };
  const text = frontmatter(draft);
  const parsed = YAML.parse(text.replace(/^---\n/, '').replace(/\n---$/, ''));
  assert.deepEqual(Object.keys(parsed), ['name', 'description', 'metadata']);
  const r = resolveSkillDetails(parsed, undefined, config, known);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.details.tagline, draft.tagline);
  assert.equal(r.details.needs, 'Python 3.');
});
