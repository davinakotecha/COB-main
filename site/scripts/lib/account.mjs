// Loads the account folder (names, logos, accent, workstreams, overlay, roadmap).
// This file is generic: it never names an account. Everything comes from the YAML.
//
// Paths are anchored on the working directory (npm always runs scripts from site/), not on
// import.meta.url, because Vite bundles this file into SSR chunks during `astro build`.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const siteRoot = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();
export const repoRoot = path.resolve(siteRoot, '..');

export const REQUIRED_FIELDS = [
  'siteName',
  'fullName',
  'leadBrand',
  'clientName',
  'teamPhrase',
  'accentColour',
  'logos',
  'repoUrl',
  'workstreams',
  'ticketPrefix',
  'fictionalName',
];

export const BRAND_MODES = ['account', 'ibm-only', 'neutral'];

const abs = (p) => (path.isAbsolute(p) ? p : path.resolve(repoRoot, p));

/** Folder that holds the account. ACCOUNT_DIR overrides it (used to test account.example). */
export function accountDir() {
  return abs(process.env.ACCOUNT_DIR || 'account');
}
/** Folder that holds the skills. SKILLS_DIR overrides it (the sample folder ships its own). */
export function skillsDir() {
  return abs(process.env.SKILLS_DIR || 'skills');
}
/** Folder that holds the made-up samples. EXAMPLES_DIR overrides it. */
export function examplesDir() {
  return abs(process.env.EXAMPLES_DIR || 'examples');
}

function readYaml(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return YAML.parse(fs.readFileSync(file, 'utf8')) ?? fallback;
}

export function loadAccount(dir = accountDir()) {
  const configFile = path.join(dir, 'account.config.yaml');
  if (!fs.existsSync(configFile)) {
    throw new Error(
      `Cannot find ${path.relative(repoRoot, configFile)}. Copy account.example/ to account/ and fill it in (see docs/ADD-AN-ACCOUNT.md).`,
    );
  }
  const config = YAML.parse(fs.readFileSync(configFile, 'utf8')) ?? {};
  const meta = readYaml(path.join(dir, 'skill-meta.yaml'), {});
  const roadmap = readYaml(path.join(dir, 'roadmap.yaml'), []);
  const copy = readYaml(path.join(dir, 'copy.yaml'), {});
  return {
    dir,
    config,
    skillMeta: meta.skills ?? meta ?? {},
    roadmap: Array.isArray(roadmap) ? roadmap : (roadmap.items ?? []),
    copy,
  };
}

export function brandMode(config) {
  const mode = process.env.PUBLIC_BRAND_MODE || config.brandMode || 'neutral';
  if (!BRAND_MODES.includes(mode)) {
    throw new Error(`PUBLIC_BRAND_MODE must be one of ${BRAND_MODES.join(', ')} (got "${mode}").`);
  }
  return mode;
}

/** "https://github.com/owner/repo" -> { owner, repo } */
export function parseRepo(repoUrl) {
  const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?$/.exec(repoUrl || '');
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** SITE_URL and SITE_BASE come from the environment, otherwise from the GitHub repo URL. */
export function deriveHosting(config) {
  const parsed = parseRepo(config.repoUrl);
  const siteUrl = process.env.SITE_URL || (parsed ? `https://${parsed.owner.toLowerCase()}.github.io` : 'http://localhost:4321');
  let base = process.env.SITE_BASE ?? (parsed ? `/${parsed.repo}` : '/');
  if (!base.startsWith('/')) base = `/${base}`;
  base = base.replace(/\/+$/, '') || '/';
  return { siteUrl, base };
}

/** Wording that changes with the brand mode. Mirrors the tokens used in page copy. */
export function tokens(config, mode) {
  const acct = mode === 'account' ? config.clientName : 'Our account';
  const fullName =
    mode === 'account'
      ? config.fullName
      : mode === 'ibm-only'
        ? `${config.leadBrand}: ${config.siteName}`
        : config.siteName;
  const teamPhrase =
    mode === 'account'
      ? config.teamPhrase
      : mode === 'ibm-only'
        ? `the ${config.leadBrand} consulting team`
        : 'a consulting team';
  return {
    siteName: config.siteName,
    fullName,
    clientName: acct,
    teamPhrase,
    leadBrand: config.leadBrand,
    ticketPrefix: config.ticketPrefix,
    fictionalName: config.fictionalName,
  };
}

export function fillTokens(text, t) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in t ? t[k] : m));
}
