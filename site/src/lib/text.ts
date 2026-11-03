// Small text helpers. Safe to import from pages and from islands (no Node APIs).

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c] as string);

/** Escapes text, then turns `backtick spans` into <code>. Use with set:html. */
export const inlineCode = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

/** "2026-10-28" -> "28 October 2026" */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
