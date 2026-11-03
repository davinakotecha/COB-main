// The shape of a worked example. The core's WorkedExample component only knows this shape;
// each account supplies its own data in it (see account/build-demo-data.mjs).

export type Category = 'added' | 'changed' | 'removed';
export type Format = 'human' | 'terse' | 'json';

export interface DiffRow {
  sign: ' ' | '+' | '-';
  text: string;
  category: Category | null;
  gap?: boolean;
}

export interface Scenario {
  id: string;
  label: string;
  confidence: 'verified' | 'best_effort';
  changeNote: string;
  summaryNote: string;
  change: { kind: 'diff'; fileLabel: string; rows: DiffRow[] } | { kind: 'note'; text: string };
  outputs: Record<Format, string>;
}

export interface SlideItem {
  category: Category;
  text: string;
  unconfirmed: boolean;
}

export interface Slide {
  title: string;
  groups: { name: string; items: SlideItem[] }[];
  next: { title: string; body: string };
  caption: string;
}

export interface Example {
  intro: string;
  /** Empty for a slide-only illustration. */
  scenarios: Scenario[];
  slide: Slide;
  /** Shown under a slide-only illustration. */
  illustrationNote?: string;
}
