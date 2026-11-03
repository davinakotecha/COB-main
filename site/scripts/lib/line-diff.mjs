// A small line diff for the "the change" column of a worked example.
// Each changed line is tagged added / changed / removed, with a little unchanged context around it.
// Generic: an account's build-demo-data script receives this from the core and never imports it itself.
import { diffLines } from 'diff';

/**
 * @returns {{ sign: ' ' | '+' | '-', text: string, category: 'added'|'changed'|'removed'|null, gap?: boolean }[]}
 */
export function lineDiff(beforeText, afterText, context = 2) {
  const parts = diffLines(beforeText.replace(/\r\n/g, '\n'), afterText.replace(/\r\n/g, '\n'));
  const rows = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const lines = p.value.replace(/\n$/, '').split('\n');
    if (p.removed) {
      // A removal straight followed by an addition is a changed line, not a delete plus an add.
      const paired = parts[i + 1]?.added;
      for (const l of lines) rows.push({ sign: '-', text: l, category: paired ? 'changed' : 'removed' });
    } else if (p.added) {
      const paired = parts[i - 1]?.removed;
      for (const l of lines) rows.push({ sign: '+', text: l, category: paired ? 'changed' : 'added' });
    } else {
      for (const l of lines) rows.push({ sign: ' ', text: l, category: null });
    }
  }

  // Keep `context` unchanged lines around each change and fold the rest into one gap marker.
  const isChange = rows.map((r) => r.sign !== ' ');
  const keep = rows.map((_, i) => {
    for (let d = -context; d <= context; d++) if (isChange[i + d]) return true;
    return false;
  });
  const out = [];
  let inGap = false;
  rows.forEach((r, i) => {
    if (keep[i]) {
      out.push(r);
      inGap = false;
    } else if (!inGap) {
      out.push({ sign: ' ', text: '...', category: null, gap: true });
      inGap = true;
    }
  });

  // Deeply nested snippets waste the narrow column: strip the indentation every shown line shares.
  const indents = out.filter((r) => !r.gap && r.text.trim()).map((r) => /^ */.exec(r.text)[0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  if (common > 0) for (const r of out) if (!r.gap) r.text = r.text.slice(common);
  return out;
}
