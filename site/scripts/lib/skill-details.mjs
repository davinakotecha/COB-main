// The plain-language details every skill carries so the library tile and the skill page can be built:
// workstream, tagline, what you give it, what you get, what it needs, and an optional pairing.
//
// A skill states them in its own SKILL.md, under `metadata` (the Agent Skills specification allows an
// optional map of string keys to string values there, and Anthropic's skill-creator validator rejects
// any other unknown top-level key). Keys carry a `ks-` prefix so they cannot clash with anyone else's.
//
//   metadata:
//     ks-workstream: "..."
//     ks-tagline: "..."
//     ks-give: "..."
//     ks-get: "..."
//     ks-needs: "..."           (optional)
//     ks-pairs-with: "..."      (optional: another skill's name)
//     ks-pairs-why: "..."       (optional)
//     ks-pairs-via: "..."       (optional)
//
// Per field the order is: SKILL.md `metadata`, then the account's skill-meta.yaml overlay (older skills
// that we do not edit), then nothing. This file is shared by the build (prep.mjs) and the Contribute
// generator, so a skill made with the generator always passes the build. No Node imports.

export const DETAIL_KEYS = {
  workstream: 'ks-workstream',
  tagline: 'ks-tagline',
  give: 'ks-give',
  get: 'ks-get',
  needs: 'ks-needs',
  pairsWith: 'ks-pairs-with',
  pairsWhy: 'ks-pairs-why',
  pairsVia: 'ks-pairs-via',
};

export const DETAIL_FIELDS = Object.keys(DETAIL_KEYS);
export const REQUIRED_DETAILS = ['workstream', 'tagline', 'give', 'get'];

/** Longer text breaks the tile layout, so it is a warning. */
export const DETAIL_LIMITS = { tagline: 120, give: 200, get: 200, needs: 200 };

export const FIX_HINT = 'Add the `metadata` block shown on the Contribute page.';

const KEY_SET = new Set(Object.values(DETAIL_KEYS));
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const tidy = (s) => s.trim().replace(/\s+/g, ' ');

/**
 * Problems with one field's value. `value` may be anything a YAML file can hold.
 * Codes: missing, not-string, unknown-workstream (errors); too-long (warning).
 */
export function detailProblems(field, value, workstreams = []) {
  const out = [];
  if (isBlank(value)) {
    if (REQUIRED_DETAILS.includes(field)) out.push({ field, code: 'missing', level: 'error' });
    return out;
  }
  if (typeof value !== 'string') {
    out.push({ field, code: 'not-string', level: 'error' });
    return out;
  }
  const text = tidy(value);
  if (field === 'workstream' && !workstreams.includes(text)) out.push({ field, code: 'unknown-workstream', level: 'error' });
  const limit = DETAIL_LIMITS[field];
  if (limit && text.length > limit) out.push({ field, code: 'too-long', level: 'warn', limit, length: text.length });
  return out;
}

const WORDS = {
  missing: (k) => `"${k}" is missing.`,
  'not-string': (k) => `"${k}" must be text. Put the value in double quotes.`,
  'unknown-workstream': (k, p, ws) => `"${k}" is not one of the account's workstreams (${ws.join(', ') || 'none are listed'}).`,
  'too-long': (k, p) => `"${k}" is ${p.length} characters. Keep it under ${p.limit} so the tile stays tidy.`,
};

/**
 * Works out a skill's details.
 *
 *   frontmatter  parsed frontmatter of SKILL.md ({} when there is none)
 *   overlay      the skill's entry in the account's skill-meta.yaml, or undefined
 *   config       the account config (only `workstreams` is read)
 *   ctx          { knownSlugs: Set<string> } to check `ks-pairs-with`
 *
 * Returns { details, errors, warnings }. Each problem is { field, key, code, level, message }, and the
 * message does not name the skill: the caller adds that. Errors fail a CI build. Locally they print as warnings.
 */
export function resolveSkillDetails(frontmatter, overlay, config, ctx = {}) {
  const workstreams = config?.workstreams ?? [];
  const problems = [];
  const add = (field, code, level, message) => problems.push({ field, key: DETAIL_KEYS[field] ?? field, code, level, message });

  const meta = frontmatter?.metadata;
  let metadata = {};
  if (meta !== undefined && meta !== null) {
    if (typeof meta !== 'object' || Array.isArray(meta)) {
      add('metadata', 'metadata-not-map', 'error', 'The "metadata" block must be a list of key: value lines, indented under "metadata:".');
    } else {
      metadata = meta;
    }
  }
  for (const k of Object.keys(metadata)) {
    if (k.startsWith('ks-') && !KEY_SET.has(k)) add(k, 'unknown-key', 'warn', `"${k}" is not a recognised site detail, so it is ignored. Check the spelling.`);
  }

  const details = {};
  for (const field of DETAIL_FIELDS) {
    const key = DETAIL_KEYS[field];
    const fromMeta = metadata[key];
    const raw = !isBlank(fromMeta) ? fromMeta : overlay?.[field];
    const found = detailProblems(field, raw, workstreams);
    for (const p of found) add(field, p.code, p.level, WORDS[p.code](key, p, workstreams));
    const usable = typeof raw === 'string' && !isBlank(raw);
    details[field] = usable ? tidy(raw) : null;
  }

  if (details.pairsWith && ctx.knownSlugs && !ctx.knownSlugs.has(details.pairsWith)) {
    add('pairsWith', 'unknown-pair', 'error', `"${DETAIL_KEYS.pairsWith}" names "${details.pairsWith}", which is not a skill in the skills folder.`);
    details.pairsWith = null;
  }
  if (!details.pairsWith && (details.pairsWhy || details.pairsVia)) {
    add('pairsWith', 'pair-text-alone', 'warn', `"${DETAIL_KEYS.pairsWhy}" and "${DETAIL_KEYS.pairsVia}" are ignored without "${DETAIL_KEYS.pairsWith}".`);
  }

  return {
    details,
    errors: problems.filter((p) => p.level === 'error'),
    warnings: problems.filter((p) => p.level === 'warn'),
  };
}
