// Finds a Python interpreter and runs a script with it.
// -B stops bytecode being written next to the skills. We deliberately do not use -I,
// because the scripts import _common from their own folder.
//
// The interpreter runs from a neutral working directory (the OS temp folder) and every path is
// passed as an absolute argument, so nothing in the repo can be picked up from the current
// directory. Relative paths in `args` are resolved against `cwd` first.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  ['python3', []],
  ['python', []],
  ['py', ['-3']],
];

let cached;

export function findPython() {
  if (cached) return cached;
  for (const [cmd, pre] of CANDIDATES) {
    const r = spawnSync(cmd, [...pre, '--version'], { encoding: 'utf8', cwd: os.tmpdir() });
    if (r.status === 0) {
      cached = { cmd, pre };
      return cached;
    }
  }
  throw new Error('Python 3 was not found. Install Python 3 and make sure `python3`, `python` or `py` is on your PATH.');
}

/**
 * Runs `python -B script args...` and returns stdout.
 * `cwd` is the folder that relative paths in `args` are resolved against.
 * Throws if the script fails, so a build never falls back to stale data.
 * Pass allowExit to accept other exit codes (some scripts exit 1 to mean "changes found").
 */
export function runPython(args, { cwd, allowExit = [0] } = {}) {
  const { cmd, pre } = findPython();
  const resolved = args.map((a) => (cwd && /^(skills|examples|account)[\\/]/.test(a) ? path.resolve(cwd, a) : a));
  const r = spawnSync(cmd, [...pre, '-B', ...resolved], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (!allowExit.includes(r.status)) {
    throw new Error(`python ${args.join(' ')} failed (exit ${r.status}):\n${r.stderr || r.stdout}`);
  }
  return r.stdout.replace(/\r\n/g, '\n');
}
