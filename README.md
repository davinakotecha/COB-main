# IBM x The Co-operative Bank: Asset Exchange

A shared library where the IBM consulting team working with The Co-operative Bank adds the skills and tools it has
built, so the whole account can use them. Each one shows the team that made it. This repository holds the skills
**and** the website that publishes them.

**Live site:** https://davinakotecha.github.io/COB-main/

> This repo may be public: never commit real client data, real flow exports, real ticket keys or real names.
> Everything in `examples/` uses the invented "Northwind Bank" universe.

## What is where

| Folder | Holds |
|---|---|
| `skills/` | The skills themselves. Each skill is a folder with a `SKILL.md`, and often `references/` and `scripts/`. A skill names its team in its `SKILL.md` |
| `examples/` | Made-up samples that prove each skill works |
| `site/` | The website (generic Astro code) |
| `account/` | Everything specific to this account: names, logos, accent colour, roadmap |
| `docs/` | How to set the site up for another account |
| `.github/` | The workflow that builds and publishes the site, and the two issue forms: "Submit a skill or other asset" and "Suggest an idea" |

`account/account.config.yaml` sets `repoUrl` to this repository. The site address, the install commands, "View on
GitHub" and both issue forms all come from it.

## Publish it

1. **Settings > Pages**: set **Source** to **GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables**: add `DEPLOY_PAGES` with the value `true`.
3. **Actions > Site > Run workflow** on `main`.

## Adding a skill

People submit a skill with the **Submit a skill or other asset** issue form, which they reach from the Share page. A
maintainer reads it, adds the folder under `skills/` and made-up samples under `examples/`, then pushes. A push that touches `skills/`,
`examples/`, `site/` or `account/` rebuilds and publishes the site.

- A skill carries its site details in its own `SKILL.md`, in a `metadata` block (the generator on the Share
  page writes it, and can check it for you). A skill that is missing them stops the build with a message naming the
  skill and the field, and the last good site stays live. See [`docs/ADD-AN-ACCOUNT.md`](docs/ADD-AN-ACCOUNT.md).
- Every six hours the **Site** workflow also checks whether this repository has moved since the live site was built
  (for example after a commit that matched none of the path filters), and rebuilds once if so. It is a safety net,
  so most scheduled runs stop at the check. The footer says which commit the site was built from.
- A scheduled run can be a little late when GitHub is busy. For an instant update use
  **Actions > Site > Run workflow**.
- GitHub switches scheduled workflows off in a public repository after 60 days with no repository activity. Any
  commit to this repository starts the clock again.

## Run it locally

You need Node 22.23.4 or later and Python 3 with PyYAML (`pip install pyyaml`).

```bash
git clone https://github.com/davinakotecha/COB-main.git
cd COB-main/site
npm install
npm run dev
```

| Command (from `site/`) | What it does |
|---|---|
| `npm run dev` | Start the site locally |
| `npm run build:ci` | Everything CI runs: checks, type check, build, link check |
| `npm run check:account` | Validate the `account/` folder |
| `npm run check:confidentiality` | Look for ticket-style keys and e-mail addresses |
| `npm test` | Run the unit tests |

## Licence

No open-source licence has been granted. Treat the skills as internal IBM and author material.
