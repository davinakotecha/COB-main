// Runs the workflow's helper (.github/scripts/skills_repo.py) against throwaway config files.
// Skipped when Python or PyYAML is not available. Repository names are invented.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from '../scripts/lib/account.mjs';
import { findPython } from '../scripts/lib/run-python.mjs';

const helper = path.join(repoRoot, '.github', 'scripts', 'skills_repo.py');

function haveYaml() {
  try {
    const { cmd, pre } = findPython();
    return spawnSync(cmd, [...pre, '-c', 'import yaml'], { cwd: os.tmpdir() }).status === 0;
  } catch {
    return false;
  }
}

function run(configYaml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-helper-'));
  fs.mkdirSync(path.join(dir, 'account'));
  fs.writeFileSync(path.join(dir, 'account', 'account.config.yaml'), configYaml);
  const out = path.join(dir, 'github-output.txt');
  fs.writeFileSync(out, '');
  const { cmd, pre } = findPython();
  const r = spawnSync(cmd, [...pre, '-B', helper], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: out, PYTHONUTF8: '1' } });
  const output = fs.readFileSync(out, 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stderr: r.stderr, output };
}

const skip = !haveYaml() && 'Python with PyYAML is not available';

test('one repository: the output is empty, so the workflow builds from this repo alone', { skip }, () => {
  const r = run('repoUrl: https://github.com/Owner/alpha-skills\n');
  assert.equal(r.status, 0);
  assert.equal(r.output.trim(), 'repo=');
});

test('a commented-out siteRepoUrl counts as one repository', { skip }, () => {
  const r = run('repoUrl: https://github.com/Owner/alpha-skills\n# siteRepoUrl: https://github.com/Owner/alpha-site\n');
  assert.equal(r.output.trim(), 'repo=');
});

test('the same repository in both fields counts as one repository, ignoring capitals', { skip }, () => {
  const r = run('repoUrl: https://github.com/Owner/Alpha-Skills\nsiteRepoUrl: https://github.com/owner/alpha-skills\n');
  assert.equal(r.output.trim(), 'repo=');
});

test('two repositories: the output names the skills repository', { skip }, () => {
  const r = run('repoUrl: https://github.com/Owner/alpha-skills.git\nsiteRepoUrl: https://github.com/Owner/alpha-site\n');
  assert.equal(r.status, 0);
  assert.equal(r.output.trim(), 'repo=Owner/alpha-skills');
});

test('a malformed siteRepoUrl stops the workflow with a clear message', { skip }, () => {
  const r = run('repoUrl: https://github.com/Owner/alpha-skills\nsiteRepoUrl: not-a-url\n');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /siteRepoUrl/);
});
