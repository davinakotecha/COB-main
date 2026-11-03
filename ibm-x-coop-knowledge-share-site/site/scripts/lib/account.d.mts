export type BrandMode = 'account' | 'ibm-only' | 'neutral';

export interface LogoFiles {
  ibm?: string | null;
  ibmReversed?: string | null;
  client?: string | null;
  clientReversed?: string | null;
}

export interface AccountConfig {
  siteName: string;
  fullName: string;
  leadBrand: string;
  clientName: string;
  teamPhrase: string;
  accentColour: string;
  logos: LogoFiles;
  repoUrl: string;
  workstreams: string[];
  ticketPrefix: string;
  fictionalName: string;
  contactRoute?: string | null;
  brandMode?: BrandMode;
  noindex?: boolean;
  clientAliases?: string[];
  forbiddenTerms?: string[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  status: 'idea' | 'in-progress';
  skill?: string;
  summary: string;
}

export interface Account {
  dir: string;
  config: AccountConfig;
  skillMeta: Record<string, Record<string, string | null>>;
  roadmap: RoadmapItem[];
  copy: Record<string, any>;
}

export const siteRoot: string;
export const repoRoot: string;
export const REQUIRED_FIELDS: string[];
export const BRAND_MODES: BrandMode[];
export function accountDir(): string;
export function skillsDir(): string;
export function examplesDir(): string;
export function loadAccount(dir?: string): Account;
export function brandMode(config: AccountConfig): BrandMode;
export function parseRepo(repoUrl: string): { owner: string; repo: string } | null;
export function deriveHosting(config: AccountConfig): { siteUrl: string; base: string };
export function tokens(config: AccountConfig, mode: BrandMode): Record<string, string>;
export function fillTokens(text: string, t: Record<string, string>): string;
