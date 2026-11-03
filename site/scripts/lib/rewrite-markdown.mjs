// Prepares a skill's Markdown for the site, as plain text, before Astro renders it:
//  - links between skills and their references become site routes (anchors kept)
//  - links to scripts, examples and other repo files become GitHub links
//  - the first H1 is dropped (the page supplies its own title)
//  - SKILL.md headings drop one level, because the page shows it under its own h2
// It works on text, with no Markdown plugin, so it does not depend on which Markdown processor Astro uses.
import fs from 'node:fs';
import path from 'node:path';

const posix = (p) => p.split(path.sep).join('/');

/** Split off YAML frontmatter, if any. */
function splitFrontmatter(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return m ? [m[0], text.slice(m[0].length)] : ['', text];
}

/** Rewrites one link target. Returns the new target, or the same one if it should be left alone. */
export function rewriteHref(href, { filePath, repoRoot, repoUrl, base = '', branch = 'main' }) {
  if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;
  const hashAt = href.indexOf('#');
  const pathPart = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  if (!pathPart) return href;

  const prefix = base === '/' ? '' : base;
  const target = path.resolve(path.dirname(filePath), pathPart);
  const rel = posix(path.relative(repoRoot, target));
  if (rel.startsWith('..')) return href;

  const parts = rel.split('/');
  if (parts[0] === 'skills' && parts.length >= 3) {
    const slug = parts[1];
    if (parts.length === 3 && parts[2] === 'SKILL.md') return `${prefix}/skills/${slug}/${hash}`;
    if (parts.length === 4 && parts[2] === 'references' && parts[3].endsWith('.md')) {
      return `${prefix}/skills/${slug}/${parts[3].replace(/\.md$/, '')}/${hash}`;
    }
  }
  const isDir = fs.existsSync(target) && fs.statSync(target).isDirectory();
  return `${repoUrl}/${isDir ? 'tree' : 'blob'}/${branch}/${rel}${hash}`;
}

/**
 * @param {string} text            the file's contents
 * @param {object} ctx             { filePath, repoRoot, repoUrl, base, branch }
 */
export function rewriteMarkdown(text, ctx) {
  const isSkillBody = path.basename(ctx.filePath) === 'SKILL.md';
  const [front, body] = splitFrontmatter(text.replace(/\r\n/g, '\n'));

  let fence = null; // the marker that opened the current code fence
  let droppedH1 = false;
  const out = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      if (h[1].length === 1 && !droppedH1) {
        droppedH1 = true;
        if (lines[i + 1] === '') i++; // swallow the blank line after the title
        continue;
      }
      if (isSkillBody && h[1].length >= 2 && h[1].length < 6) line = `#${line}`;
    }

    // Inline links (not images) and reference-style definitions.
    line = line.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (all, bang, label, href, title) =>
      bang ? all : `[${label}](${rewriteHref(href, ctx)}${title})`,
    );
    line = line.replace(/^(\s{0,3}\[[^\]]+\]:\s+)(\S+)/, (all, head, href) => `${head}${rewriteHref(href, ctx)}`);

    out.push(line);
  }
  return front + out.join('\n');
}
