# IBM x The Co-operative Bank: Asset Based Consulting Knowledge Share (site)

The website for the Asset Based Consulting Knowledge Share: a shared space where the IBM consulting team
working with The Co-operative Bank finds, uses and builds Claude skills.

**Live site:** https://davinakotecha.github.io/COB-main/ (once GitHub Pages is switched on)

> **This repo holds the website only.** The skills live in a separate repository,
> [`davinakotecha/COB-skills`](https://github.com/davinakotecha/COB-skills). The build checks that repository
> out and publishes what it finds. This repo may be public: never commit real client data, real flow exports,
> real ticket keys or real names.

## How the two repositories fit together

| Repository | Holds |
|---|---|
| `COB-skills` | `skills/` and `examples/`: the skills themselves and their made-up samples |
| `COB-main` (this one) | `site/` (generic Astro code), `account/` (names, logos, accent colour, roadmap), `docs/` and the GitHub Actions workflow |

`account/account.config.yaml` names both: `repoUrl` is the skills repository and `siteRepoUrl` is this one.
The site address comes from `siteRepoUrl`. Install commands and "View on GitHub" point at the skills repository.

## Publish it

1. **Settings > Pages**: set **Source** to **GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables**: add `DEPLOY_PAGES` with the value `true`.
3. **Actions > Site > Run workflow** on `main`.

New skills do not rebuild the site on their own. After a skill is merged in `COB-skills`, run
**Actions > Site > Run workflow** here. To automate it, see "One repository or two" in
[`docs/ADD-AN-ACCOUNT.md`](docs/ADD-AN-ACCOUNT.md).

## Run it locally

You need Node 22.23.4 or later and Python 3 with PyYAML (`pip install pyyaml`). Clone both repositories side by
side, then point the site at the skills checkout:

```bash
git clone https://github.com/davinakotecha/COB-skills.git
git clone https://github.com/davinakotecha/COB-main.git
cd COB-main/site
echo "SKILLS_REPO_ROOT=../../COB-skills" > .env
npm install
npm run dev
```

| Command (from `site/`) | What it does |
|---|---|
| `npm run dev` | Start the site locally |
| `npm run build:ci` | Everything CI runs: checks, type check, build, link check |
| `npm run check:account` | Validate the `account/` folder |
| `npm run check:confidentiality` | Look for ticket-style keys and e-mail addresses in both repositories |
| `npm test` | Run the unit tests |

## Licence

No open-source licence has been granted. Treat the skills as internal IBM and author material.
