// The one place pages read account data from. Nothing here names an account:
// every name, colour, logo and link comes from the account folder.
import { loadAccount, brandMode, tokens as brandTokens, fillTokens, parseRepo } from '../../scripts/lib/account.mjs';
import skillsJson from '../generated/skills.json';
import demoJson from '../generated/demo.json';
import buildJson from '../generated/build-info.json';

const basename = (p: string) => p.split(/[\\/]/).pop() as string;

export interface Skill {
  slug: string;
  name: string;
  title: string;
  description: string;
  workstream: string;
  tagline: string;
  give: string | null;
  get: string | null;
  needs: string | null;
  pairsWith: string | null;
  pairsWhy: string | null;
  pairsVia: string | null;
  example: string | null;
  status: string;
  references: { file: string; slug: string; title: string }[];
  scripts: { file: string; usage: string }[];
  hasExamples: boolean;
  fictionalFiles: string[];
  exampleDir: string | null;
  skillPath: string;
  lastChanged: string | null;
}

const account = loadAccount();
export const config = account.config;
export const mode = brandMode(config);
export const t = brandTokens(config, mode);
export const copy = account.copy as Record<string, any>;
export const roadmapSeeds = account.roadmap;
export const skills = skillsJson as unknown as Skill[];
export const demo = demoJson as unknown as { examples: Record<string, any> };

/** Replaces {clientName}, {teamPhrase}, {siteName} and friends with this account's wording. */
export const fill = (text: string) => fillTokens(text, t);

// ---------- base path ----------
const rawBase = import.meta.env.BASE_URL || '/';
export const base = rawBase.replace(/\/+$/, '');

/** Every internal link and asset path goes through this. A missed one is a 404 on Pages. */
export function withBase(p: string): string {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(p) || p.startsWith('#') || p.startsWith('mailto:')) return p;
  return base + (p.startsWith('/') ? p : `/${p}`);
}

// ---------- repo links ----------
const clean = (u: string) => u.replace(/\/+$/, '').replace(/\.git$/, '');
/** The skills repository: install commands, "View on GitHub" and file links point here. */
export const repoUrl = clean(config.repoUrl);
export const repoName = parseRepo(config.repoUrl)?.repo ?? 'skills-repo';
/** The repository that holds this site. It is the skills repository unless siteRepoUrl is set. */
export const siteRepoUrl = clean(config.siteRepoUrl || config.repoUrl);
/** "Suggest an idea" opens an issue form, and the form lives in the site repository's .github folder. */
export const issueUrl = `${siteRepoUrl}/issues/new?template=skill-idea.yml&labels=skill-idea`;
/** "Submit your skill" opens the submission form. Pass an asset type's formLabel to pre-select it. */
export const submitUrl = (assetLabel?: string) =>
  `${siteRepoUrl}/issues/new?template=submit-asset.yml&labels=submission${assetLabel ? `&asset-type=${encodeURIComponent(assetLabel)}` : ''}`;

// ---------- brand ----------
/** The accent marks account pages only, and only in account mode. Otherwise it is IBM blue. */
export const accent = mode === 'account' ? config.accentColour : null;
export const noindex = config.noindex !== false;

export interface Logo {
  name: string;
  full: string;
  reversed: string | null;
  missing: boolean;
}

// prep copies the logos this brand mode needs into public/brand and lists them in build-info.json.
const brandFiles = new Set<string>((buildJson as { brandFiles: string[] }).brandFiles);
function logoFor(kind: 'ibm' | 'client'): Logo | null {
  if (mode === 'neutral') return null;
  if (kind === 'client' && mode !== 'account') return null;
  const files = config.logos ?? {};
  const full = kind === 'ibm' ? files.ibm : files.client;
  const rev = kind === 'ibm' ? files.ibmReversed : files.clientReversed;
  if (!full) return null;
  const has = (f?: string | null) => !!f && brandFiles.has(basename(f));
  return {
    name: kind === 'ibm' ? config.leadBrand : config.clientName,
    full: withBase(`/brand/${basename(full)}`),
    reversed: has(rev) ? withBase(`/brand/${basename(rev as string)}`) : null,
    missing: !has(full),
  };
}
export const logos = { lead: logoFor('ibm'), client: logoFor('client') };
export const isDev = import.meta.env.DEV;
// A production build must never ship a missing logo. Dev shows a dashed placeholder instead.
for (const l of [logos.lead, logos.client]) {
  if (l?.missing && !isDev) {
    throw new Error(
      `The logo file for "${l.name}" is listed in account.config.yaml but missing from site/public/brand/. Put it in the account's brand/ folder (or local/brand/) and rebuild.`,
    );
  }
}

// ---------- hosting and build info ----------
export const buildInfo = buildJson as { sha: string | null; skillsSha: string | null; skillsShaShort: string | null; date: string; builtAt: string };

// ---------- navigation and asset types (pure data, shared with the tests) ----------
export { nav } from './nav';
export type { NavKey } from './nav';
export { assetTypes, assetByKey, riskRows } from './assets';
export type { AssetKey, AssetType } from './assets';

/**
 * The browser-tab title. Account pages (the Library, skill and reference pages, Roadmap) carry the long
 * name, which names the client. Every other page uses the short site name, so the client is not named there.
 */
export const pageTitle = (page: string, account = false) => `${page} - ${account ? t.fullName : t.siteName}`;

export const workstreams = [...(config.workstreams ?? [])];
export function skillBySlug(slug: string) {
  return skills.find((s) => s.slug === slug);
}
