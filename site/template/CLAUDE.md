# CLAUDE.md

This repo holds an account's Claude skills (`skills/`) and the website that publishes them
(`site/`, configured by `account/`). Apart from `site/`, there is no application code.

## Confidentiality rule (operating instruction, not a suggestion)

This repo may be **public**. No real client content may ever be committed:

- Never paste real exports, real files, real deck content, real ticket keys or real names into
  any tracked file (`skills/`, `examples/`, `README.md`, this file).
- All examples and fixtures use the invented company named in `account/account.config.yaml`
  (`fictionalName`, with ticket prefix `ticketPrefix`).
- Real, client-specific working files belong in `local/`, which is git-ignored.
- Before committing, check `git status` and `git diff` for real content that slipped in, not just
  for the file types `.gitignore` blocks. Run `npm run check:confidentiality` from `site/`.

## Skill authoring discipline

Keep each `SKILL.md` body short (roughly 150 to 200 lines) and push detail into `references/*.md`,
loaded on demand. Do not copy or paraphrase other skills' code or prose into this repo.

## Site (`site/` and `account/`)

`site/` is a generic Astro core that publishes `skills/` and `examples/` to GitHub Pages.
Everything specific to this account (names, logos, accent colour, workstreams, roadmap, worked-example
data) lives in `account/`. It reads `skills/` at build time; never copy skill content into `site/`.

- Run: `cd site && npm install && npm run dev`. Needs Node 22.23.4 or later.
- Nothing in `site/` may name the account, the client, a project, a workstream or a skill.
  Use the tokens and the account folder instead.
- Brand: components never hardcode logos, names or colours; everything comes from `account/`.
  Never redraw, trace, recolour or crop a logo. Use the official files as supplied.
- The accent colour marks account pages with small squares only: never text, links, buttons or backgrounds.
- The client's name appears on the account pages only (Skills library, skill and reference pages, Roadmap), as text
  and in browser-tab titles. Its logo may appear everywhere. `teamPhrase` must not name the client.
- A skill carries its own site details in `SKILL.md`, under `metadata` (`ks-workstream`, `ks-tagline`, `ks-give`,
  `ks-get`). In CI a skill missing them fails the build. `account/skill-meta.yaml` is an optional overlay.
- Animations run once and respect `prefers-reduced-motion`. Nothing makes a third-party request.
- Examples on the site stay in the invented-company universe.
- Record the public-or-private decision here: `Visibility decision: <date, who, outcome>`.
