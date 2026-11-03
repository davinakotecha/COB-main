// The rules a new skill must follow, as pure functions. Used by the Contribute generator and by tests.
// No imports and no browser APIs, and only erasable TypeScript, so Node can run it directly.

export type Level = 'ok' | 'warn' | 'bad';
export interface Check {
  level: Level;
  message: string;
}

export const RESERVED_WORDS = ['claude', 'anthropic'] as const;
export const NAME_MAX = 64;
export const DESC_MAX = 1024;
export const BODY_WARN_LINES = 200;
export const BODY_MAX_LINES = 500;

// Key-shaped words that are not tickets.
const NOT_TICKETS = ['ISO', 'UTF', 'SHA', 'MD', 'RFC', 'TLS', 'AES', 'PEP', 'HTTP', 'ECMA', 'ANSI', 'IEEE', 'WCAG', 'ARIA'];

export function checkName(name: string): Check {
  if (!name) return { level: 'bad', message: 'Add a name.' };
  if (name.length > NAME_MAX) return { level: 'bad', message: `The name is ${name.length} characters. The limit is ${NAME_MAX}.` };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return { level: 'bad', message: 'Use lowercase letters, numbers and single hyphens, with no hyphen at the start or end.' };
  }
  const hit = RESERVED_WORDS.find((w) => name.includes(w));
  if (hit) return { level: 'bad', message: 'Names can’t contain "claude" or "anthropic".' };
  if (name === 'synced') return { level: 'bad', message: 'Claude Code skips a skill folder named "synced". Pick another name.' };
  return { level: 'ok', message: 'The name follows the rules and matches the folder name.' };
}

export const hasXmlTag = (text: string) => /<\/?[a-zA-Z][^>]*>/.test(text);

export function checkDescription(desc: string): Check[] {
  const out: Check[] = [];
  const n = desc.length;
  if (n === 0) out.push({ level: 'bad', message: 'Add a description. Say what the skill does and when to use it.' });
  else if (n > DESC_MAX) out.push({ level: 'bad', message: `The description is ${n.toLocaleString('en-GB')} characters. The limit is ${DESC_MAX.toLocaleString('en-GB')}.` });
  else if (hasXmlTag(desc)) out.push({ level: 'bad', message: 'Descriptions can’t contain XML tags. Remove anything in angle brackets.' });
  else out.push({ level: 'ok', message: `The description is ${n} characters.` });
  if (n > 0 && !/use when|use whenever|trigger on|use this when|use it when/i.test(desc)) {
    out.push({ level: 'warn', message: 'Say when Claude should use it, for example "Use when the user asks for...".' });
  }
  return out;
}

/** Ticket-style keys (ABC-123) that are not the account's made-up prefix. */
export function foreignTicketKeys(text: string, ticketPrefix: string): string[] {
  const keys = text.match(/\b[A-Z][A-Z0-9]{1,9}-\d+\b/g) ?? [];
  return keys.filter((k) => {
    const prefix = k.split('-')[0] as string;
    return prefix !== ticketPrefix && !NOT_TICKETS.includes(prefix);
  });
}

export const hasEmail = (text: string) => /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);

export function checkConfidential(text: string, ticketPrefix: string): Check[] {
  const out: Check[] = [];
  const keys = foreignTicketKeys(text, ticketPrefix);
  if (keys.length) {
    out.push({
      level: 'bad',
      message: `This looks like a real ticket key (${keys[0]}). Examples must use the made-up prefix ${ticketPrefix}-.`,
    });
  }
  if (hasEmail(text)) out.push({ level: 'bad', message: 'Remove the e-mail address. Nothing real goes in the shared repo.' });
  return out;
}

export function checkBodyLength(lines: number): Check {
  if (lines > BODY_MAX_LINES) return { level: 'bad', message: `SKILL.md is ${lines} lines. Keep it under ${BODY_MAX_LINES}, and move detail into references/.` };
  if (lines > BODY_WARN_LINES) return { level: 'warn', message: `SKILL.md is ${lines} lines. Aim for ${BODY_WARN_LINES} or fewer, and move detail into references/.` };
  return { level: 'ok', message: `SKILL.md is ${lines} lines.` };
}

// ---------- building the files ----------

export interface SkillDraft {
  name: string;
  title: string;
  summary: string;
  description: string;
  inputs: string;
  recipe: string;
  outOfScope: string;
  scripts: boolean;
  references: boolean;
}

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export const titleCase = (name: string) =>
  (name || 'new-skill')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** A double-quoted YAML scalar. JSON string syntax is valid YAML, and escapes quotes and newlines. */
export const yamlQuote = (s: string) => JSON.stringify(s);

/** The frontmatter, with the description double-quoted like the existing skills. */
export function frontmatter(d: SkillDraft): string {
  return ['---', `name: ${d.name || 'new-skill'}`, `description: ${yamlQuote(d.description)}`, '---'].join('\n');
}

// Strip a typed list marker ("- ", "* ", "1. ", "2) ") but not a number that is part of the text.
const stripMarker = (l: string) => l.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '');

function bullets(text: string, fallback: string[]): string[] {
  const items = lines(text).map(stripMarker);
  return (items.length ? items : fallback).map((l) => `- ${l}`);
}

function numbered(text: string, fallback: string[]): string[] {
  const items = lines(text).map(stripMarker);
  return (items.length ? items : fallback).map((l, i) => `${i + 1}. ${l}`);
}

/** SKILL.md in the shape of the existing skills: intro, inputs, recipe, out of scope, confidentiality, checklist. */
export function buildSkillMd(d: SkillDraft): string {
  const title = d.title.trim() || titleCase(d.name);
  return [
    frontmatter(d),
    '',
    `# ${title}`,
    '',
    d.summary.trim() || 'One paragraph on what this skill does and for whom.',
    '',
    '## Inputs this skill accepts',
    '',
    ...bullets(d.inputs, ['What the user must provide.', 'What the skill must never invent.']),
    '',
    '## The recipe',
    '',
    ...numbered(d.recipe, ['First step.', 'Second step.']),
    '',
    '## Out of scope',
    '',
    ...bullets(d.outOfScope, ['What to flag to the user instead of guessing.']),
    '',
    '## Confidentiality',
    '',
    'Use only made-up names and figures in anything committed. See the repo `CLAUDE.md`.',
    '',
    '## Before calling it done',
    '',
    '- [ ] Output checked against the examples.',
    '- [ ] No real client content anywhere.',
    '',
  ].join('\n');
}

export function folderTree(d: SkillDraft): string {
  const nm = d.name || 'new-skill';
  return [`skills/${nm}/`, '  SKILL.md', ...(d.references ? ['  references/'] : []), ...(d.scripts ? ['  scripts/'] : []), `examples/${nm}/   (made-up samples)`].join('\n');
}

export function readmeRow(d: SkillDraft): string {
  const nm = d.name || 'new-skill';
  const purpose = (d.summary.trim() || 'What the skill does.').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
  return `| [\`skills/${nm}\`](skills/${nm}/SKILL.md) | ${purpose} |`;
}

/** Files for the downloadable zip, keyed by path. Stubs are placeholders for the author to fill in. */
export function zipFiles(d: SkillDraft): Record<string, string> {
  const nm = d.name || 'new-skill';
  const files: Record<string, string> = { [`skills/${nm}/SKILL.md`]: buildSkillMd(d) };
  if (d.references) {
    files[`skills/${nm}/references/README.md`] =
      '# References\n\nDetail Claude reads only when the job needs it. Link each file from SKILL.md.\n';
  }
  if (d.scripts) {
    files[`skills/${nm}/scripts/README.md`] =
      '# Scripts\n\nHelpers for the exact steps. Put a usage line in each script’s docstring.\n';
  }
  files[`examples/${nm}/README.md`] = '# Examples\n\nMade-up samples only. No real names, figures or ticket keys.\n';
  return files;
}

export function roadmapEntry(d: SkillDraft): string {
  const nm = d.name || 'new-skill';
  const summary = (d.summary.trim() || 'What the skill would do.').replace(/\s+/g, ' ');
  return ['- id: ' + nm, `  title: ${yamlQuote(d.title.trim() || titleCase(nm))}`, '  status: in-progress', `  summary: ${yamlQuote(summary)}`].join('\n');
}

/** Plain sentences with `backtick` spans for anything to type. Render them with inlineCode(). */
export function nextSteps(d: SkillDraft): string[] {
  const nm = d.name || 'new-skill';
  return [
    `Make a branch: \`git switch -c skill/${nm}\``,
    `Add the folder under \`skills/${nm}/\` and made-up samples under \`examples/${nm}/\`.`,
    'Add a row to the skills table in `README.md`.',
    'Commit with a sign-off: `git commit -s`',
    'Push the branch and open a pull request (collaborators only).',
    `Try it: copy the folder into \`~/.claude/skills/\` and type \`/${nm}\`.`,
  ];
}

/** Every check for a draft, in the order they should be shown. */
export function checkDraft(d: SkillDraft, ticketPrefix: string): Check[] {
  const md = buildSkillMd(d);
  const everything = [d.name, d.title, d.summary, d.description, d.inputs, d.recipe, d.outOfScope].join('\n');
  return [
    checkName(d.name),
    ...checkDescription(d.description),
    checkBodyLength(md.split('\n').length - 1),
    ...checkConfidential(everything, ticketPrefix),
  ];
}
