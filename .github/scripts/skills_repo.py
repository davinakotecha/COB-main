"""Tell the Site workflow whether the skills live in a separate repository.

Reads account/account.config.yaml. If siteRepoUrl is set and differs from repoUrl, the skills are in
another repository, and this prints its owner/name as the step output `repo`. Otherwise `repo` is empty
and the workflow builds from this repository alone.

skills_changed.py imports the functions below, so the two never disagree about where the skills are.
"""
import os
import re
import sys

import yaml

CONFIG = "account/account.config.yaml"


def load_config(path=CONFIG):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def slug(url):
    m = re.match(r"https://github\.com/([^/\s]+)/([^/\s#?]+?)(?:\.git)?/?$", url or "")
    return f"{m.group(1)}/{m.group(2)}" if m else ""


def repositories(cfg):
    """Return (skills, site, separate): the two repositories as owner/name, and the skills repository
    again when it is a different repository from the site (otherwise an empty string)."""
    skills, site = slug(cfg.get("repoUrl")), slug(cfg.get("siteRepoUrl"))
    if cfg.get("siteRepoUrl") and not site:
        sys.exit("siteRepoUrl in account/account.config.yaml must look like https://github.com/owner/repo")
    if cfg.get("repoUrl") and not skills:
        sys.exit("repoUrl in account/account.config.yaml must look like https://github.com/owner/repo")
    separate = skills if (site and skills and site.lower() != skills.lower()) else ""
    return skills, site, separate


def main():
    _, _, separate = repositories(load_config())
    print(f"skills repository: {separate or 'this repository'}")

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"repo={separate}\n")


if __name__ == "__main__":
    main()
