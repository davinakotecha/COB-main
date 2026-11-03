# CLAUDE.md

This repo holds the **website** for the Asset Based Consulting Knowledge Share (`site/`, configured by
`account/`). The skills it publishes live in a separate repository, `davinakotecha/COB-skills`, which the build
checks out. Apart from `site/`, this repo holds no application code.

## Confidentiality rule (operating instruction, not a suggestion)

This repo is **public**. It supports a real IBM client engagement, but no real client content may ever be
committed:

- Never paste real flow exports, real deck content, real ticket keys or real names into any tracked file.
- **One exception:** the client's name and logos may appear in `account/` only. Everything else stays made-up.
- All examples use the invented **Northwind Bank** universe (ticket prefix `NWB-`).
- Real, client-specific working files belong in `local/`, which is git-ignored.
- Before committing, check `git status` and `git diff` for real content that slipped in. Run
  `npm run check:confidentiality` from `site/`.

## Site (`site/` and `account/`)

`site/` is a generic Astro core. Everything specific to this account (names, logos, accent colour, workstreams,
roadmap, worked-example data) lives in `account/`. It reads `skills/` and `examples/` from the skills repository at
build time (`SKILLS_REPO_ROOT`); never copy skill content into `site/`.

- Run: see the README. Needs Node 22.23.4 or later, and Python 3 with PyYAML.
- Nothing in `site/` may name the account, the client, a project, a workstream or a skill.
  `npm run check:genericity` enforces it. Test fixtures use invented names too.
- Brand: components never hardcode logos, names or colours; everything comes from `account/`. Never redraw, trace,
  recolour or crop a logo; use the files as supplied.
- The accent colour marks account pages with small squares only: never text, links, buttons or backgrounds.
- Animations run once and respect `prefers-reduced-motion`. Nothing makes a third-party request.
- Visibility decision: `TO RECORD: <date, who, outcome>`. The site is built in `account` brand mode on a public
  repo; the account lead's written approval for showing the client name and logo on a public page is still to be
  confirmed.
- Run `npm run check:genericity` and `npm run check:confidentiality` (from `site/`) before every commit that
  touches `site/` or `account/`.
