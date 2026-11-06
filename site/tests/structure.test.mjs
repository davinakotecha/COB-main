// Run with: npm test
// The site's structure: navigation, asset types and the per-tool install commands. All invented names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nav } from '../src/lib/nav.ts';
import { assetTypes, riskRows } from '../src/lib/assets.ts';
import { TOOLS, commands, winPath, toolById, useText } from '../src/lib/tools.ts';

// ---------- navigation ----------

test('the navigation has unique keys and addresses, each with a trailing slash', () => {
  assert.equal(new Set(nav.map((n) => n.key)).size, nav.length);
  assert.equal(new Set(nav.map((n) => n.href)).size, nav.length);
  for (const n of nav) assert.match(n.href, /\/$/, n.href);
});

test('the navigation says "Get started", "Library", "Share" and "Security", and drops the old names', () => {
  const labels = nav.map((n) => n.label);
  for (const want of ['Home', 'Get started', 'Library', 'Share', 'Security', 'Roadmap']) assert.ok(labels.includes(want), want);
  for (const gone of ['How it works', 'Contribute', 'Skills library']) assert.ok(!labels.includes(gone), gone);
});

test('only the Library and the Roadmap are account pages', () => {
  assert.deepEqual(
    nav.filter((n) => n.account).map((n) => n.key),
    ['library', 'roadmap'],
  );
});

// ---------- asset types ----------

test('skills are the only live asset type, and the others are placeholders with full content', () => {
  assert.deepEqual(
    assetTypes.filter((a) => a.live).map((a) => a.key),
    ['skills'],
  );
  for (const a of assetTypes.filter((x) => !x.live)) {
    assert.ok(a.holds && a.holds.length > 40, `${a.key} says what it would hold`);
    assert.ok((a.ideas ?? []).length >= 3, `${a.key} has at least three ideas`);
    assert.ok((a.needs ?? []).length >= 2, `${a.key} says what it needs`);
    assert.ok(a.risk && a.riskWhy, `${a.key} states a risk level and why`);
  }
});

test('each asset type has a distinct page and a form label that matches the submission form', () => {
  assert.equal(new Set(assetTypes.map((a) => a.href)).size, assetTypes.length);
  const labels = assetTypes.map((a) => a.formLabel);
  assert.equal(new Set(labels).size, labels.length);
  assert.deepEqual(labels, ['Skill', 'Agent', 'Plugin', 'MCP server or connector', 'Prompt or template']);
});

test('every asset type that is not a skill appears in the Security page risk table', () => {
  const rows = riskRows.map((r) => r.asset.toLowerCase());
  for (const a of assetTypes.filter((x) => !x.live)) {
    const word = a.key === 'connectors' ? 'connector' : a.key === 'templates' ? 'template' : a.key.replace(/s$/, '');
    assert.ok(rows.some((r) => r.includes(word)), `${a.key} is in the risk table`);
  }
});

test('no asset text names a client, a project or a tool vendor (the core stays generic)', () => {
  const text = JSON.stringify(assetTypes) + JSON.stringify(riskRows);
  assert.doesNotMatch(text, /claude|anthropic|copilot|codex|openai/i);
});

// ---------- install commands ----------

const input = { slug: 'status-update-writer', repoUrl: 'https://github.com/example-org/example-repo', repoName: 'example-repo' };

test('Claude Code on macOS or Linux copies the skill into ~/.claude/skills', () => {
  const text = commands('claude-code', 'nix', input);
  assert.match(text, /git clone https:\/\/github\.com\/example-org\/example-repo\.git/);
  assert.match(text, /mkdir -p ~\/\.claude\/skills/);
  assert.match(text, /cp -r example-repo\/skills\/status-update-writer ~\/\.claude\/skills\//);
});

test('each tool installs into its own personal folder', () => {
  assert.match(commands('copilot', 'nix', input), /mkdir -p ~\/\.copilot\/skills/);
  assert.match(commands('codex', 'nix', input), /mkdir -p ~\/\.agents\/skills/);
});

test('Windows commands use PowerShell paths under the user profile', () => {
  const text = commands('codex', 'win', input);
  assert.match(text, /New-Item -ItemType Directory -Force "\$env:USERPROFILE\\\.agents\\skills"/);
  assert.match(text, /Copy-Item -Recurse example-repo\\skills\\status-update-writer "\$env:USERPROFILE\\\.agents\\skills\\"/);
  assert.equal(winPath('~/.claude/skills'), '$env:USERPROFILE\\.claude\\skills');
  assert.equal(winPath('.github/skills'), '.github\\skills');
});

test('the claude.ai route is a list of steps, whatever the platform', () => {
  const text = commands('web', 'win', input);
  assert.match(text, /Download status-update-writer\.zip/);
  assert.doesNotMatch(text, /git clone/);
  assert.equal(commands('web', 'nix', input), text);
});

test('every tool says how to use an added skill, and "use" fills in the skill name', () => {
  for (const t of TOOLS) assert.ok(useText(t, 'x-skill').length > 10, t.id);
  assert.match(useText(toolById('claude-code'), 'x-skill'), /\/x-skill/);
  assert.doesNotMatch(useText(toolById('claude-code'), 'x-skill'), /\{name\}/);
});

test('the folders a tool reads are the ones recorded in tools.ts (Copilot and Codex read from their docs on 6 Nov 2026)', () => {
  assert.deepEqual([toolById('claude-code').personal, toolById('claude-code').project], ['~/.claude/skills', '.claude/skills']);
  assert.deepEqual(
    [toolById('copilot').project, ...toolById('copilot').projectAlso],
    ['.github/skills', '.claude/skills', '.agents/skills'],
  );
  assert.deepEqual([toolById('copilot').personal, ...toolById('copilot').personalAlso], ['~/.copilot/skills', '~/.agents/skills']);
  assert.deepEqual([toolById('codex').personal, toolById('codex').project], ['~/.agents/skills', '.agents/skills']);
});
