import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import pagefind from 'astro-pagefind';
import { loadAccount, deriveHosting } from './scripts/lib/account.mjs';

const { config } = loadAccount();
// SITE_URL and SITE_BASE come from the environment; otherwise they are derived from repoUrl.
const { siteUrl, base } = deriveHosting(config);

export default defineConfig({
  site: siteUrl,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [preact(), pagefind()],
  devToolbar: { enabled: false },
  // Skill Markdown is rewritten as text by scripts/prep.mjs (links, headings), so no Markdown plugins are needed.
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: false,
    },
  },
});
