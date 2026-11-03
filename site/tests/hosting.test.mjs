// Names below are invented ("alpha-skills", "alpha-site"). Nothing here names a real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { deriveHosting, skillsRepoRoot, skillsDir, examplesDir, repoRoot, parseRepo } from '../scripts/lib/account.mjs';

const ENV = ['SITE_URL', 'SITE_BASE', 'SKILLS_REPO_ROOT', 'SKILLS_DIR', 'EXAMPLES_DIR'];
function withEnv(vars, fn) {
  const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const k of ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('one repository: the site address comes from repoUrl', () => {
  withEnv({}, () => {
    const h = deriveHosting({ repoUrl: 'https://github.com/Owner/alpha-skills' });
    assert.deepEqual(h, { siteUrl: 'https://owner.github.io', base: '/alpha-skills' });
  });
});

test('two repositories: the site address comes from siteRepoUrl, not the skills repository', () => {
  withEnv({}, () => {
    const h = deriveHosting({ repoUrl: 'https://github.com/Owner/alpha-skills', siteRepoUrl: 'https://github.com/Owner/alpha-site' });
    assert.deepEqual(h, { siteUrl: 'https://owner.github.io', base: '/alpha-site' });
  });
});

test('SITE_URL and SITE_BASE override both', () => {
  withEnv({ SITE_URL: 'https://example.org', SITE_BASE: 'docs/' }, () => {
    assert.deepEqual(deriveHosting({ repoUrl: 'https://github.com/o/r' }), { siteUrl: 'https://example.org', base: '/docs' });
  });
});

test('skills and examples default to this repository', () => {
  withEnv({}, () => {
    assert.equal(skillsRepoRoot(), repoRoot);
    assert.equal(skillsDir(), path.join(repoRoot, 'skills'));
    assert.equal(examplesDir(), path.join(repoRoot, 'examples'));
  });
});

test('SKILLS_REPO_ROOT moves skills and examples to a separate checkout', () => {
  withEnv({ SKILLS_REPO_ROOT: 'skills-repo' }, () => {
    const root = path.join(repoRoot, 'skills-repo');
    assert.equal(skillsRepoRoot(), root);
    assert.equal(skillsDir(), path.join(root, 'skills'));
    assert.equal(examplesDir(), path.join(root, 'examples'));
  });
  const abs = path.resolve('/elsewhere/alpha-skills');
  withEnv({ SKILLS_REPO_ROOT: abs }, () => assert.equal(skillsDir(), path.join(abs, 'skills')));
});

test('an empty SKILLS_REPO_ROOT (as the workflow sets it for one repository) means this repository', () => {
  withEnv({ SKILLS_REPO_ROOT: '' }, () => assert.equal(skillsRepoRoot(), repoRoot));
});

test('repository URLs are parsed strictly', () => {
  assert.deepEqual(parseRepo('https://github.com/o/r'), { owner: 'o', repo: 'r' });
  assert.deepEqual(parseRepo('https://github.com/o/r.git'), { owner: 'o', repo: 'r' });
  assert.equal(parseRepo('http://github.com/o/r'), null);
  assert.equal(parseRepo('https://example.com/o/r'), null);
});
