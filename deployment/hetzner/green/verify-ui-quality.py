#!/usr/bin/env python3
"""Require successful exact-source Portal UI checks before a protected release."""
import argparse
import json
import os
import re
import time
import urllib.request

REPOSITORY = "behaack/phaeno-ops-mgmt-system"
REQUIRED_JOBS = {"ui-quality", "visual-baselines", "workflow-behavior"}


def accepted_run(runs, source):
    candidates = [r for r in runs if r.get("head_sha") == source
                  and r.get("path", "").split("@")[0] == ".github/workflows/ui-quality.yml"]
    if not candidates:
        return None
    latest = max(candidates, key=lambda r: (r.get("id", 0), r.get("run_attempt", 1)))
    return latest if latest.get("status") == "completed" and latest.get("conclusion") == "success" else None


def accepted_jobs(jobs):
    by_name = {job["name"]: job for job in jobs}
    return REQUIRED_JOBS.issubset(by_name) and all(
        by_name[name].get("status") == "completed" and by_name[name].get("conclusion") == "success"
        for name in REQUIRED_JOBS)


def request(path):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "Phaeno-Portal-release-gate",
               "X-GitHub-Api-Version": "2022-11-28"}
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    with urllib.request.urlopen(urllib.request.Request("https://api.github.com/repos/" + REPOSITORY + path, headers=headers), timeout=30) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("--wait-seconds", type=int, default=0)
    args = parser.parse_args()
    if not re.fullmatch("[0-9a-f]{40}", args.source) or not 0 <= args.wait_seconds <= 900:
        parser.error("Use a complete lowercase source SHA and a wait between 0 and 900 seconds.")
    deadline = time.monotonic() + args.wait_seconds
    while True:
        run = accepted_run(request("/actions/workflows/ui-quality.yml/runs?head_sha=" + args.source + "&per_page=30")["workflow_runs"], args.source)
        if run and accepted_jobs(request("/actions/runs/" + str(run["id"]) + "/attempts/" + str(run.get("run_attempt", 1)) + "/jobs?per_page=100")["jobs"]):
            print(json.dumps({"source": args.source, "ui_quality_run": run["id"], "required_jobs": sorted(REQUIRED_JOBS), "passed": True}))
            return
        if time.monotonic() >= deadline:
            raise SystemExit("Release blocked: the latest exact-source UI quality run and every required job must succeed.")
        time.sleep(min(30, max(0, deadline - time.monotonic())))


if __name__ == "__main__":
    main()
