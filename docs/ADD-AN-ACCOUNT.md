# Add an account: set up your own knowledge share site

This guide takes a team that has never seen this repository to a working site for its own account.
You do not need to be a developer, but you do need to be comfortable editing a text file and running
a few commands. Allow about an hour for the first time.

## What you are building

A website where your consulting team finds, uses and builds Claude skills. Three pages are the same for
every account: **Home**, **How it works** and **Contribute**. Two pages belong to your account: the
**Skills library** (with a page for each skill) and the **Roadmap**. Everything that belongs to your
account lives in one folder, `account/`, plus your skills in `skills/`.

## Before you start

- [ ] A GitHub account, and permission to create a repository.
- [ ] Node 22.23.4 or later and Python 3 installed. Check with `node --version` and `python3 --version`.
- [ ] The official logo files (SVG) for IBM and for your client, if you will show them. Ask the account lead.
- [ ] A decision on whether the site is public. See **Public or private** below, and settle it first.

## Steps

### 1. Create your repository from the template

On the template's GitHub page, click **Use this template**, then **Create a new repository**. Name it
for your account, for example `abc-knowledge-share`. The name becomes part of the site address:
`https://<owner>.github.io/<repository>/`.

### 2. Fill in `account/account.config.yaml`

Open it in any text editor. Every field has a comment. This table says where each one shows up.

| Field | What to put | Where it shows |
|---|---|---|
| `siteName` | The site's name | Masthead, hero headline, page titles |
| `fullName` | The long name, for example "IBM x Client: Name" | Page titles, footer |
| `leadBrand` | The brand that leads (IBM) | Lead logo, footer |
| `clientName` | Your client's name | Account chip, page titles |
| `teamPhrase` | How the home page describes your team | The hero line |
| `clientAliases` | Other short forms of the client's name (can be empty) | Checks only |
| `forbiddenTerms` | System or tool names that must stay out of the generic core (can be empty) | Checks only |
| `accentColour` | One hex colour, for example `"#009d9a"` | Small squares on account pages |
| `logos` | File names inside `account/brand/` | Masthead, footer |
| `repoUrl` | The address of the repository that holds your **skills** | Install commands, "View on GitHub", the site address (if there is one repository) |
| `siteRepoUrl` | Only if the site code is in a **different** repository from the skills | The site address and the "Propose a skill" form |
| `workstreams` | Your workstreams, in the order for the filter | Library filter, skill tiles |
| `ticketPrefix` and `fictionalName` | A made-up prefix and company for examples | The generator and the confidentiality check |
| `contactRoute` | Where to ask for help (optional) | Footer |
| `brandMode` | `neutral`, `ibm-only` or `account` | Whether logos and the client name appear |

The accent colour is used only for small non-text squares, never for text or buttons. It needs enough
contrast against white and against near-black, and the check in step 6 tells you if it does not.

### 3. Add your logos

Put the official SVG files in `account/brand/` and list them under `logos`. Use the files exactly as
supplied by the brand owners. **Never redraw, trace, recolour or crop a logo.** If a brand supplies a white
("reversed") version, list it as `ibmReversed` or `clientReversed`; the site uses it on dark surfaces.
Without one, that logo sits on a small white tile in dark mode. The placeholders that ship with the template
are dashed boxes, not anyone's real logo.

### 4. Add your skills

Each skill is a folder under `skills/` with a `SKILL.md` and, if needed, `references/` and `scripts/`.
Delete the sample `meeting-summary` skill when you add your own. For every skill, add a few lines to
`account/skill-meta.yaml`: its workstream, a one-line tagline, what you give it, what you get, and what it
needs. A skill with no entry still appears, under "Unsorted", and the build prints a warning.

Put made-up samples under `examples/<skill-name>/`. They must use your `fictionalName` and `ticketPrefix`.

### 5. Add your roadmap

Edit `account/roadmap.yaml` with the ideas and in-progress work. The Live column fills itself from `skills/`.

### 6. Check it

From the `site/` folder:

```bash
npm install
npm run check:account
npm run check:confidentiality
npm run dev
```

`check:account` stops with a plain message if a field is missing, a logo file is not found, a workstream is
mistyped or the accent colour is too pale. `check:confidentiality` looks for ticket-style keys and e-mail
addresses that should not be in the repository. `npm run dev` shows the site on your machine.

### 7. Turn on GitHub Pages

1. In your repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
2. Go to **Settings > Secrets and variables > Actions > Variables** and add `DEPLOY_PAGES` with the value `true`.
3. Push to `main`. The **Site** workflow builds and publishes the site. Until you add `DEPLOY_PAGES`, it builds
   but publishes nothing, so you can try everything safely first.

### 8. Share the link

Before you do, work through the checklist below.

## One repository or two

By default the site and the skills share one repository, and `repoUrl` is that repository. You can also keep
the site code in one repository and the skills in another, which suits a team that already has a skills
repository and does not want website code in it.

For two repositories, put the **skills repository** in `repoUrl` and the **site repository** in `siteRepoUrl`:

```yaml
repoUrl: https://github.com/your-organisation/your-skills-repo
siteRepoUrl: https://github.com/your-organisation/your-site-repo
```

- **Where things go:** the site repository holds `site/`, `account/`, `docs/` and `.github/`. The skills
  repository holds `skills/` and `examples/` only.
- **The site address** comes from `siteRepoUrl`: `https://<owner>.github.io/<site-repo>/`. Pages is switched on
  in the **site** repository, and the repository variable `DEPLOY_PAGES` is set there too.
- **Install commands and "View on GitHub"** keep pointing at the skills repository, where the skills are.
- **The workflow** reads `siteRepoUrl` and `repoUrl`, and checks out the skills repository itself on every run.
  A public skills repository needs nothing else. For a private one, add a read-only token as the repository secret
  `SKILLS_REPO_TOKEN` in the site repository.
- **New skills do not rebuild the site on their own.** A change in the skills repository does not trigger the
  site's workflow. After you merge a skill, run **Actions > Site > Run workflow** in the site repository. To
  automate it, have the skills repository send a `repository_dispatch` event of type `skills-updated` to the site
  repository whenever its `main` branch changes. That needs a token with permission to the site repository.
- **To rebuild automatically**, add this file to the **skills** repository as `.github/workflows/notify-site.yml`,
  and add a repository secret there called `SITE_REPO_TOKEN`: a fine-grained personal access token that has
  **Contents: Read and write** on the site repository (GitHub requires that permission to send the event):

  ```yaml
  name: Tell the site
  on:
    push:
      branches: [main]
      paths: ['skills/**', 'examples/**']
  jobs:
    notify:
      runs-on: ubuntu-latest
      steps:
        - run: |
            curl -sS -f -X POST \
              -H "Accept: application/vnd.github+json" \
              -H "Authorization: Bearer ${{ secrets.SITE_REPO_TOKEN }}" \
              https://api.github.com/repos/YOUR-OWNER/YOUR-SITE-REPO/dispatches \
              -d '{"event_type":"skills-updated"}'
  ```

  Replace `YOUR-OWNER/YOUR-SITE-REPO` with the site repository. Keep the token to that one repository, and never
  commit it.
- **Running it locally:** clone both repositories side by side, then in `site/` create a `.env` file (it is
  git-ignored) containing the path to the skills checkout, for example
  `SKILLS_REPO_ROOT=../../your-skills-repo`. A relative path is read from the site repository's root.
- **Checks:** `check:confidentiality` scans both repositories when `SKILLS_REPO_ROOT` is set.

## Public or private

A GitHub Pages site on a public repository is a public website from its first deploy. Decide before step 7:

- **Public, with the client's name and logo.** Get written approval from the account lead first, then set
  `brandMode: account`.
- **Public, without the client.** Set `brandMode` to `ibm-only` or `neutral`. The build leaves out the client
  name and logo, and `check:confidentiality` confirms none reached the built site.
- **Not public.** GitHub's private Pages (readable only by people with access to the repository) is a GitHub
  Enterprise Cloud feature for repositories owned by an organisation. A personal repository cannot use it.
  Move the repository into an organisation, or host the built `site/dist` folder on an internal static host.

Record the decision, the date and who made it in `CLAUDE.md`. `account.config.yaml` ships with `noindex: true`,
which asks search engines to stay away. It is a request, not access control.

The repository name and the default address contain whatever you named the repository. If that name identifies
the client, rename the repository before the first deploy.

## Launch checklist

- [ ] The public-or-private decision is recorded in `CLAUDE.md`.
- [ ] `brandMode` is set on purpose.
- [ ] Official logos replace the placeholders, and the accent colour is confirmed.
- [ ] The data rule on **How it works** has been approved by your account lead. Edit it in `account/copy.yaml`,
      then remove `draft: true`.
- [ ] Workstream names are your real ones.
- [ ] A person has run each install command on Windows and on macOS or Linux.
- [ ] The footer licence wording matches your README.
- [ ] You have decided whether to remove `noindex`.
- [ ] Your README links to the site.

## How updates from the template reach you

Your repository is a **snapshot** of the template at the moment you created it. Improvements made later are
not pushed to you automatically. To take an update, add the template as a second git remote, compare the
`site/` folders, and copy across what you want. Do not edit `site/` for account-specific wording: put it in
`account/` so updates stay easy to take.

## If something goes wrong

| What you see | What to do |
|---|---|
| `check:account` names a field | Fix that field in `account/account.config.yaml` and run it again |
| The build says a logo is missing | Add the file to `account/brand/` or fix its name under `logos` |
| A skill is under "Unsorted" | Add it to `account/skill-meta.yaml` |
| `check:confidentiality` fails | Open the file and line it names and replace the real value with a made-up one |
| The site loads but looks unstyled, or pages 404 on GitHub | The address is taken from `siteRepoUrl` (or `repoUrl` with one repository). It must match the repository that publishes Pages, character for character, including capitals |
| The build says it cannot find the skills folder | With two repositories, set `SKILLS_REPO_ROOT` to the skills checkout (locally), or check `repoUrl` is right and readable (in the workflow) |
