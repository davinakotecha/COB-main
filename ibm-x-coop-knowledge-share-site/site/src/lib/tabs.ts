// Arrow-key support for tab lists (WAI-ARIA tabs pattern). Browser only.

/**
 * Call from a tab button's onKeyDown. Moves selection with the arrow keys, Home and End.
 * Each tab button needs data-tab="<id>" so focus can follow the selection.
 */
export function onTabKey(e: KeyboardEvent, ids: string[], current: string, select: (id: string) => void) {
  const i = ids.indexOf(current);
  let n = -1;
  if (e.key === 'ArrowRight') n = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') n = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') n = 0;
  else if (e.key === 'End') n = ids.length - 1;
  if (n < 0) return;
  e.preventDefault();
  select(ids[n] as string);
  const list = (e.currentTarget as HTMLElement | null)?.closest('[role="tablist"]');
  requestAnimationFrame(() => list?.querySelector<HTMLElement>(`[data-tab="${ids[n]}"]`)?.focus());
}
