"""Decide whether the scheduled Site run has anything to publish.

Compares the skills repository's current head (read with `git ls-remote`, which needs no token for a public
repository) with the skills commit the live site was built from (the site's own /build.json). Equal means
nothing changed and the build and deploy jobs are skipped. Different, or no build.json yet, means build.

If the skills repository cannot be read this exits with an error and prints why, so the run fails loudly
and nothing is deployed. If the live site cannot be read, it builds: publishing again is the safe choice.

    python .github/scripts/skills_changed.py

Test hooks (used by tests/skills-changed.test.mjs, never set in the workflow):
    SKILLS_HEAD_SHA        use this value instead of running git ls-remote
    SKILLS_GIT_BASE        read repositories from here instead of https://github.com (a local folder works)
    SITE_BUILD_JSON_FILE   read the live build.json from this file instead of the network
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

from skills_repo import load_config, repositories

SHA = re.compile(r"^[0-9a-f]{40}$")


def skills_head(repo):
    forced = os.environ.get("SKILLS_HEAD_SHA")
    if forced:
        return forced.strip()
    url = f"{os.environ.get('SKILLS_GIT_BASE', 'https://github.com').rstrip('/')}/{repo}"
    # Never wait for a password: a repository that cannot be read must fail, not hang.
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "never"}
    try:
        r = subprocess.run(["git", "ls-remote", url, "HEAD"], capture_output=True, text=True, timeout=45, env=env)
    except subprocess.TimeoutExpired:
        sys.exit(f"Could not read the head of {url}: no answer within 45 seconds. Nothing was deployed.")
    except OSError as e:
        sys.exit(f"Could not read the head of {url}: git could not be run ({e}). Nothing was deployed.")
    first = r.stdout.split()[:1]
    if r.returncode != 0 or not first or not SHA.match(first[0]):
        sys.exit(f"Could not read the head of {url}: {(r.stderr or r.stdout).strip() or 'no output'}. Nothing was deployed.")
    return first[0]


def site_build_json_url(site_repo):
    owner, name = site_repo.split("/", 1)
    return f"https://{owner.lower()}.github.io/{name}/build.json"


def live_sha(url):
    """The skills commit the live site was built from, or None (with the reason) when it cannot be told."""
    path = os.environ.get("SITE_BUILD_JSON_FILE")
    try:
        if path:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        else:
            # A changing query string steps round the CDN cache (Pages answers with max-age=600).
            req = urllib.request.Request(f"{url}?t={int(time.time())}", headers={"Cache-Control": "no-cache", "User-Agent": "site-workflow"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
    except Exception as e:  # any failure means "cannot tell", which means build
        return None, f"could not read {path or url} ({type(e).__name__})"
    sha = data.get("skillsSha") if isinstance(data, dict) else None
    if not isinstance(sha, str) or not SHA.match(sha):
        return None, "build.json has no skillsSha"
    return sha, ""


def main():
    cfg = load_config()
    skills, site, separate = repositories(cfg)
    # With one repository the skills are in the site repository, so compare against that repository's head.
    repo = separate or site or skills
    if not repo:
        sys.exit("account/account.config.yaml needs repoUrl.")
    head = skills_head(repo)
    live, why = live_sha(site_build_json_url(site or skills))

    if live is None:
        rebuild, reason = True, f"{why}, so the site is built to be safe"
    elif live == head:
        rebuild, reason = False, f"the live site already has {repo} at {head[:7]}"
    else:
        rebuild, reason = True, f"{repo} moved from {live[:7]} to {head[:7]}"

    print(f"{'Rebuild' if rebuild else 'Skip'}: {reason}.")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"rebuild={'true' if rebuild else 'false'}\n")
            f.write(f"head={head}\n")


if __name__ == "__main__":
    main()
