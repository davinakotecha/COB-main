// Small file helpers shared by the build and check scripts.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from './account.mjs';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function* walk(dir, skip = () => false) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (skip(full, entry)) continue;
    if (entry.isDirectory()) yield* walk(full, skip);
    else yield full;
  }
}

export function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Files git would track: tracked plus untracked-but-not-ignored. Falls back to a walk without git. */
export function trackedFiles(root = repoRoot) {
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status === 0 && r.stdout) {
    return r.stdout
      .split('\0')
      .filter(Boolean)
      .filter((f) => fs.existsSync(path.join(root, f)));
  }
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.astro', 'local', '__pycache__']);
  return [...walk(root, (full, e) => e.isDirectory() && skipDirs.has(e.name))].map((f) => toPosix(path.relative(root, f)));
}

/** ISO date (YYYY-MM-DD) of the last commit touching a path, or null without git history. */
export function lastChanged(relPath, root = repoRoot) {
  const r = spawnSync('git', ['log', '-1', '--format=%cs', '--', relPath], { cwd: root, encoding: 'utf8' });
  const out = r.status === 0 ? r.stdout.trim() : '';
  return out || null;
}

export function gitShortSha(root = repoRoot) {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Full commit id of HEAD in a repository, or null without git history. */
export function gitSha(root = repoRoot) {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

const TEXT_EXT = new Set(['.md', '.mdx', '.json', '.yaml', '.yml', '.txt', '.mjs', '.js', '.ts', '.tsx', '.astro', '.css', '.html', '.svg', '.py', '.toml', '.cfg']);
export function isTextFile(file) {
  return TEXT_EXT.has(path.extname(file).toLowerCase()) || path.basename(file).startsWith('.');
}
