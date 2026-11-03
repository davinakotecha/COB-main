# Asset Based Consulting Knowledge Share

A shared space where a consulting team finds, uses and builds Claude skills. This repository is a
**template**: fill in one folder with your account's details and you get a polished, animated website
published on GitHub Pages, with your skills library, roadmap, and a skill generator.

> **This repo may be public.** Never commit real client data, real flow exports, real ticket keys or
> real names. Examples use an invented company. Real files belong in `local/`, which is git-ignored.

## What you get

| Page | What it is | Same for every account? |
|---|---|---|
| Home | Why shared skills help, in plain language, with an animated explanation | Yes |
| How it works | What a skill is, how to use one, how one joins the library | Yes |
| Contribute | Steps and a skill generator that checks your skill as you type | Yes |
| Skills library and one page per skill | Your skills, with install steps and downloadable zips | No, from your `skills/` |
| Roadmap | Ideas, in progress, and live skills | No, from your `account/roadmap.yaml` |

## Set it up

Follow **[docs/ADD-AN-ACCOUNT.md](docs/ADD-AN-ACCOUNT.md)**. In short:

1. Click **Use this template** on GitHub to make your own repository.
2. Edit `account/account.config.yaml` with your names, logos, accent colour and repository link.
3. Add your skills under `skills/` and a few lines each in `account/skill-meta.yaml`.
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
