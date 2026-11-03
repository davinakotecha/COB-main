# COB-skills

Claude Skills for a Genesys Cloud Architect conversational-AI delivery
engagement: turning repetitive deck-building and change-documentation work
into a repeatable, reviewable process.

> **⚠️ This repo is public.** It must never contain real client data — no real
> flow exports, real Archy YAML, real deck content, real ticket keys, or real
> names. Everything in [`examples/`](examples/) uses the invented "Northwind
> Bank" universe. Real, client-specific files belong in `local/`, which is
> gitignored — see [`.gitignore`](.gitignore) and [`CLAUDE.md`](CLAUDE.md) for
> the full rule.

**Website:** these skills are published as a browsable, searchable site at
https://davinakotecha.github.io/COB-skills/ once GitHub Pages is switched on.
The site's code is in [`site/`](site/), configured by [`account/`](account/).
To build a version for another account, see
[`docs/ADD-AN-ACCOUNT.md`](docs/ADD-AN-ACCOUNT.md).

## Skills

| Skill | Purpose |
|---|---|
| [`skills/playback-deck`](skills/playback-deck/SKILL.md) | Build/update a fortnightly Iteration Playback PowerPoint by editing the client's existing branded template — not a from-scratch deck build. |
| [`skills/diff-summariser`](skills/diff-summariser/SKILL.md) | Turn a Genesys Architect flow change (JSON export diff, Archy YAML diff, or freeform notes) into a plain-English, consistently-structured summary for a Jira comment, a changelog, or `playback-deck` slide content. |

The two are designed to compose: `diff-summariser`'s structured output is one
of the accepted inputs to `playback-deck`'s "built this iteration" slide. See
[`CLAUDE.md`](CLAUDE.md) for the exact contract between them.

## Install

Copy (or symlink) whichever skill directories you want into your Claude Skills
directory, e.g.:

```bash
cp -r skills/playback-deck skills/diff-summariser ~/.claude/skills/
```

Each skill is self-contained — `diff-summariser` has no dependency on
`playback-deck` or vice versa. `playback-deck` works better alongside
Anthropic's `pptx` skill when it's available in your environment, but ships
its own fallback (`skills/playback-deck/references/pptx-editing-fallback.md`)
for when it isn't.

## Repo layout

```
COB-skills/
├── skills/
│   ├── playback-deck/      # SKILL.md + scripts/ + references/
│   └── diff-summariser/    # SKILL.md + scripts/ + references/
├── examples/                # fictional fixtures proving both skills work
├── site/                    # the website (generic Astro core)
├── account/                 # everything specific to this account: names, logos, roadmap
├── docs/                    # how to set up the site for another account
├── local/                   # gitignored — real client files go here
├── CLAUDE.md
└── .gitignore
```

## License / ownership

This repo currently carries no explicit open-source license — all rights
reserved by default pending a decision on whether to make it permissively
licensed. Treat the skills' content as internal IBM/author material unless
and until that's changed explicitly.
