"""Tell the Site workflow whether the skills live in a separate repository.

Reads account/account.config.yaml. If siteRepoUrl is set and differs from repoUrl, the skills are in
another repository, and this prints its owner/name as the step output `repo`. Otherwise `repo` is empty
and the workflow builds from this repository alone.
"""
import os
import re
import sys

import yaml

with open("account/account.config.yaml", encoding="utf-8") as f:
    cfg = yaml.safe_load(f) or {}


def slug(url):
    m = re.match(r"https://github\.com/([^/\s]+)/([^/\s#?]+?)(?:\.git)?/?$", url or "")
    return f"{m.group(1)}/{m.group(2)}" if m else ""


skills, site = slug(cfg.get("repoUrl")), slug(cfg.get("siteRepoUrl"))
if cfg.get("siteRepoUrl") and not site:
    sys.exit("siteRepoUrl in account/account.config.yaml must look like https://github.com/owner/repo")
if cfg.get("repoUrl") and not skills:
    sys.exit("repoUrl in account/account.config.yaml must look like https://github.com/owner/repo")

separate = skills if (site and skills and site.lower() != skills.lower()) else ""
print(f"skills repository: {separate or 'this repository'}")

out = os.environ.get("GITHUB_OUTPUT")
if out:
    with open(out, "a", encoding="utf-8") as f:
        f.write(f"repo={separate}\n")
