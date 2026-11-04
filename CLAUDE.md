# CLAUDE.md

This repo holds the Claude skills for the Asset Based Consulting Knowledge Share (`skills/` and `examples/`) and
the **website** that publishes them (`site/`, configured by `account/`). It is one repository: the build reads the
skills from `skills/` here. (An older separate repository, `davinakotecha/COB-skills`, is a stale duplicate and is
not read by the build.) Apart from `site/`, this repo holds no application code.

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
roadmap, worked-example data) lives in `account/`. It reads `skills/` and `examples/` from this repository at build
time; never copy skill content into `site/`.

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
- Data-rule approval: `TO RECORD: <date, who, outcome>`. The wording of "Follow the account's data rules" on
  How it works has not yet been approved by the account lead. The on-page "to be confirmed" note was removed on
  3 Nov 2026, so this line is now the only record that the approval is outstanding.
- The client's name appears on the account pages only (Skills library, skill and reference pages, Roadmap), as
  text and in browser-tab titles. Its logo may appear everywhere. `teamPhrase` must not name the client.
  `npm run check:confidentiality -- --dist` enforces it.
- A skill carries its own site details in `SKILL.md`, under `metadata` (`ks-workstream`, `ks-tagline`,
  `ks-give`, `ks-get`). In CI a skill missing them fails the build.
- Run `npm run check:genericity` and `npm run check:confidentiality` (from `site/`) before every commit that
  touches `site/` or `account/`.
