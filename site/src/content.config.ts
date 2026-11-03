import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// SKILL.md and every references/*.md, copied from the repo's skills/ folder by scripts/prep.mjs with
// links and headings rewritten for the site. Nothing about a skill is retyped into site/.
// No schema: the files are written by the skill authors, and the frontmatter that matters
// (name, description) is read by prep.
const skillDocs = defineCollection({
  loader: glob({ base: './src/generated/skill-docs', pattern: '**/*.md' }),
});

export const collections = { skillDocs };
