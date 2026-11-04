export type DetailField = 'workstream' | 'tagline' | 'give' | 'get' | 'needs' | 'pairsWith' | 'pairsWhy' | 'pairsVia';

export interface DetailProblem {
  field: string;
  code: string;
  level: 'error' | 'warn';
  limit?: number;
  length?: number;
}

export interface ResolvedProblem {
  field: string;
  key: string;
  code: string;
  level: 'error' | 'warn';
  message: string;
}

export const DETAIL_KEYS: Record<DetailField, string>;
export const DETAIL_FIELDS: DetailField[];
export const REQUIRED_DETAILS: DetailField[];
export const DETAIL_LIMITS: Record<string, number>;
export const FIX_HINT: string;

export function detailProblems(field: DetailField, value: unknown, workstreams?: string[]): DetailProblem[];

export function resolveSkillDetails(
  frontmatter: Record<string, unknown> | null | undefined,
  overlay: Record<string, unknown> | null | undefined,
  config: { workstreams?: string[] } | null | undefined,
  ctx?: { knownSlugs?: Set<string> },
): {
  details: Record<DetailField, string | null>;
  errors: ResolvedProblem[];
  warnings: ResolvedProblem[];
};
