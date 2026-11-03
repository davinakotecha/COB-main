// Server-side loader for the rendered SKILL.md and references/*.md pages (build time only).
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

type Entry = CollectionEntry<'skillDocs'>;

export interface Doc {
  entry: Entry;
  slug: string;
  /** null for SKILL.md, otherwise the reference file name without .md */
  ref: string | null;
}

/** Works out which skill and reference an entry belongs to, from its file path (or its id as a fallback). */
function classify(entry: Entry): { slug: string; ref: string | null } | null {
  const fp = String((entry as { filePath?: string }).filePath ?? '').replace(/\\/g, '/');
  const byPath = /([^/]+)\/(?:(SKILL)|references\/([^/]+))\.md$/i.exec(fp);
  if (byPath) return { slug: byPath[1] as string, ref: byPath[2] ? null : (byPath[3] as string) };
  const byId = /^([^/]+)\/(?:(skill)|references\/(.+))$/.exec(entry.id);
  if (byId) return { slug: byId[1] as string, ref: byId[2] ? null : (byId[3] as string) };
  return null;
}

let cache: Doc[] | undefined;
export async function getDocs(): Promise<Doc[]> {
  if (cache) return cache;
  const all = await getCollection('skillDocs');
  cache = all.flatMap((entry) => {
    const c = classify(entry);
    return c ? [{ entry, slug: c.slug, ref: c.ref }] : [];
  });
  return cache;
}

export async function getDoc(slug: string, ref: string | null): Promise<Doc | undefined> {
  return (await getDocs()).find((d) => d.slug === slug && d.ref === ref);
}

export async function renderDoc(doc: Doc) {
  const { Content, headings } = await render(doc.entry);
  return { Content, headings: headings as Heading[] };
}
