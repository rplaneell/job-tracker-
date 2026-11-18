# Security and quality plan

This page says what protects the project, what it costs, and what is still open. The proof for each check is in
`docs/security_ledger.json`.

## What is in place

| Layer | What it does | Where |
|---|---|---|
| Secret rules | Keys live only in `.env`, which Git ignores. `.env.example` lists names only | `.gitignore`, `docs/SECRETS_SETUP.md` |
| Local blockers | Refuse a commit with a secret and a push to main or master (once installed by you) | `.pre-commit-config.yaml` |
| History and push scan | gitleaks over the whole history on every push | `.github/workflows/secrets.yml` |
| Repo rules check | Forbidden files, unpinned actions, bad commit messages, big files | `tools/check_repo_rules.py`, `repo-rules.yml` |
| Pinned CI | Every action fixed to an exact commit | all workflows |
| Tests on every push | Collector, dashboard and Job HQ test suites, builds, type check | `tests.yml` |
| Dependency audits | npm audit, pip audit and OSV Scanner, weekly and on every push | `audit.yml`, `osv-scanner.toml` |
| Code scan | Semgrep with ten own rules, a self test and a blind scan guard | `semgrep.yml`, `.semgrep/` |
| Dependabot | Weekly update pull requests (never merged automatically) | `.github/dependabot.yml` |

## Free versus paid on a free private repository

As we understand it today. GitHub changes plans, so please confirm on your own Settings pages.

| Protection | On a free private repository | What stands in for it here |
|---|---|---|
| Branch protection and required reviews | Paid | Repo rules check, push blocker, written rules, tests on every push |
| Secret scanning and push protection | Paid | gitleaks in CI and the local blocker |
| CodeQL code scanning | Paid | Semgrep |
| Dependabot alerts and updates | Free (alerts are a switch only you can turn on) | `dependabot.yml` for updates |
| Actions minutes | Limited per month | Fast checks kept as small separate workflows |

## Open items and who can close them

| Item | Why it is open | Owner |
|---|---|---|
| Install the local hooks and run `tools/check_setup.py` | Only you can do this on your computer | You |
| Turn on Dependabot alerts | A repository setting | You |
| Rename the default branch to `main` | Its generated name means the push blocker cannot protect it | You |
| picomatch flaw in the test tools (GHSA-fc5q-39xc-vjpf) | No fixed version is published. Development only | Review on 2026-12-16 |
| Hostile input tests, coverage floor, mutation checks | Planned in the robustness step | Me |
| Security checklist for the agent design | Planned before any agent is built | Me |

## What this cannot promise

Clean audits mean no published flaw in the versions it could read. A clean code scan means none of the patterns I wrote
rules for. Neither is a guarantee. `--no-verify` skips the local hooks, and the CI checks only notice after a push.
