// Runs the scheduled check (.github/scripts/skills_changed.py) against throwaway config files, with the
// network replaced by test hooks. Skipped when Python or PyYAML is not available. Names are invented.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from '../scripts/lib/account.mjs';
import { findPython } from '../scripts/lib/run-python.mjs';

const script = path.join(repoRoot, '.github', 'scripts', 'skills_changed.py');
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

function haveYaml() {
  try {
    const { cmd, pre } = findPython();
    return spawnSync(cmd, [...pre, '-c', 'import yaml'], { cwd: os.tmpdir() }).status === 0;
  } catch {
    return false;
  }
}
const skip = !haveYaml() && 'Python with PyYAML is not available';

const TWO = 'repoUrl: https://github.com/Owner/alpha-skills\nsiteRepoUrl: https://github.com/Owner/alpha-site\n';

/** head: the skills repository's head. live: the contents of the live build.json, or null for "unreadable". */
function run({ config = TWO, head = A, live = { skillsSha: A }, extraEnv = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-changed-'));
  fs.mkdirSync(path.join(dir, 'account'));
  fs.writeFileSync(path.join(dir, 'account', 'account.config.yaml'), config);
  const out = path.join(dir, 'github-output.txt');
  fs.writeFileSync(out, '');
  const liveFile = path.join(dir, 'build.json');
  if (live !== null) fs.writeFileSync(liveFile, typeof live === 'string' ? live : JSON.stringify(live));
  const { cmd, pre } = findPython();
  const env = { ...process.env, GITHUB_OUTPUT: out, PYTHONUTF8: '1', SITE_BUILD_JSON_FILE: liveFile, ...extraEnv };
  if (head !== null) env.SKILLS_HEAD_SHA = head;
  const r = spawnSync(cmd, [...pre, '-B', script], { cwd: dir, encoding: 'utf8', env });
  const output = Object.fromEntries(
    fs
      .readFileSync(out, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.split('=')),
  );
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, output };
}

test('same commit as the live site: skip the build', { skip }, () => {
  const r = run({ head: A, live: { skillsSha: A } });
  assert.equal(r.status, 0);
  assert.equal(r.output.rebuild, 'false');
  assert.match(r.stdout, /^Skip/);
});

test('a different commit: build', { skip }, () => {
  const r = run({ head: B, live: { skillsSha: A } });
  assert.equal(r.status, 0);
  assert.equal(r.output.rebuild, 'true');
  assert.equal(r.output.head, B);
  assert.match(r.stdout, /moved from aaaaaaa to bbbbbbb/);
});

test('the live site has no build.json yet: build', { skip }, () => {
  const r = run({ live: null });
  assert.equal(r.output.rebuild, 'true');
});

test('the live build.json is unreadable or has no usable skillsSha: build, never skip', { skip }, () => {
  for (const live of ['not json', { builtAt: 'x' }, { skillsSha: 'short' }, { skillsSha: null }, []]) {
    assert.equal(run({ live }).output.rebuild, 'true', JSON.stringify(live));
  }
});

test('the skills repository cannot be read: the run fails loudly and says nothing was deployed', { skip }, () => {
  // No SKILLS_HEAD_SHA, and git pointed at a folder that holds no such repository: fully offline and fast.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'no-repos-'));
  const r = run({ head: null, extraEnv: { SKILLS_GIT_BASE: empty } });
  fs.rmSync(empty, { recursive: true, force: true });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Could not read the head of .*Owner\/alpha-skills/);
  assert.match(r.stderr, /Nothing was deployed/);
  assert.doesNotMatch(r.stderr, /Traceback/, 'a plain message, not a stack trace');
  assert.equal(r.output.rebuild, undefined, 'no rebuild output on failure');
});

test('the skills repository can be read: its head is compared (a local repository stands in for GitHub)', { skip }, () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'repos-'));
  const repo = path.join(base, 'Owner', 'alpha-skills');
  fs.mkdirSync(repo, { recursive: true });
  const git = (...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'x');
  const head = git('rev-parse', 'HEAD').stdout.trim();
  const same = run({ head: null, live: { skillsSha: head }, extraEnv: { SKILLS_GIT_BASE: base } });
  const moved = run({ head: null, live: { skillsSha: A }, extraEnv: { SKILLS_GIT_BASE: base } });
  fs.rmSync(base, { recursive: true, force: true });
  assert.equal(same.output.rebuild, 'false', same.stderr);
  assert.equal(same.output.head, head);
  assert.equal(moved.output.rebuild, 'true', moved.stderr);
});

test('one repository: the head compared is that repository, and the live address is its own', { skip }, () => {
  const r = run({ config: 'repoUrl: https://github.com/Owner/alpha-skills\n', head: B, live: { skillsSha: A } });
  assert.equal(r.output.rebuild, 'true');
  assert.match(r.stdout, /Owner\/alpha-skills moved/);
});

test('a malformed repository URL stops with a clear message', { skip }, () => {
  const r = run({ config: 'repoUrl: not-a-url\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /repoUrl in account\/account\.config\.yaml must look like/);
});
