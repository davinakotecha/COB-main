# Asset Exchange

A shared library where a consulting team adds the skills and tools it has built, so the whole account can use
them. This repository is a **template**: fill in one folder with your account's details and you get a polished,
animated website published on GitHub Pages, with a library, a Share page with a skill generator, a Security page
and a roadmap.

> **This repo may be public.** Never commit real client data, real flow exports, real ticket keys or
> real names. Examples use an invented company. Real files belong in `local/`, which is git-ignored.

## What you get

| Page | What it is | Same for every account? |
|---|---|---|
| Home | Why sharing helps, what the library holds, and what was added lately | Yes |
| Get started | What a skill is, how to use one, and where each coding agent keeps skills | Yes |
| Share | How to add a skill: a generator that checks it as you type, an author checklist and a submission form | Yes |
| Security | What a shared asset can do, how it is reviewed, and what is still to be confirmed | Yes (add your own controls in `account/copy.yaml`) |
| Library and one page per skill | Your skills, each tagged with its team, with install steps for several coding agents and downloadable zips | No, from your `skills/` |
| Agents, Plugins, Connectors, Prompts and templates | Placeholder pages that say plainly nothing is published yet | Yes |
| Roadmap | Ideas, in progress, and live skills | No, from your `account/roadmap.yaml` |

## Set it up

Follow **[docs/ADD-AN-ACCOUNT.md](docs/ADD-AN-ACCOUNT.md)**. In short:

1. Click **Use this template** on GitHub to make your own repository.
2. Edit `account/account.config.yaml` with your names, logos, accent colour and repository link.
3. Add your skills under `skills/`, each with a `metadata` block in its `SKILL.md` (the generator on the Share page writes it).
4. Turn on GitHub Pages and set the `DEPLOY_PAGES` repository variable to `true`.

## Run it locally

You need Node 22.23.4 or later and Python 3 (Python only if your account runs scripts to build examples).

```bash
cd site
npm install
npm run dev
```

Useful commands, all run from `site/`:

| Command | What it does |
|---|---|
| `npm run dev` | Start the site locally |
| `npm run build` | Build to `site/dist` |
| `npm run build:ci` | Everything CI runs: checks, type check, build, link check |
| `npm run check:account` | Validate your `account/` folder with plain messages |
| `npm run check:confidentiality` | Look for ticket-style keys and e-mail addresses in tracked files |
| `npm test` | Run the unit tests |

## Licence

No open-source licence has been granted. Treat the skills as internal material until your account
decides otherwise.
