# The steps only you can do

Some protections live on your own computer or in your GitHub settings, where I cannot reach. A file in the repository does
nothing until you switch it on, so this list is short and exact.

## 1. On every computer you commit from (about 2 minutes)

Windows (PowerShell):

```bash
py -m pip install pre-commit
pre-commit install
```

macOS or Linux:

```bash
pip install pre-commit
pre-commit install
```

If pre-commit is not found on Windows, use `py -m pre_commit install`. If the push blocker says `python3` is not found,
change `python3` to `python` in the last block of `.pre-commit-config.yaml`. The first run downloads the secret scanner, so
you need internet once.

Then check it:

```bash
python tools/check_setup.py
```

Every line should say DONE. Paste the output to me and I will record it as seen.

## 2. In GitHub (screens change, so the names may differ slightly)

- **Dependabot alerts:** repository, Settings, Code security (or Advanced Security), Dependabot alerts, Enable. It is free for
  private repositories. Dependabot updates are already configured by `.github/dependabot.yml`.
- **Rename the default branch to `main`.** The default branch now has a generated name, so the push blocker cannot protect it.
  Settings, General, Default branch, pencil icon, type `main`. After that the push blocker and the repo rules work as written.
- **Secret scanning, push protection, branch protection and code scanning** are paid for private repositories on a free plan.
  Check the same page. If they are not offered, nothing is lost: the CI checks in this repository stand in for them.
- **After every push:** open the Actions tab, look at the newest run, and check for green ticks on every workflow.

## 3. What these protections cannot do

`git commit --no-verify` and `git push --no-verify` skip the local hooks. The CI checks are the second line, and they only
notice after the push. A checker run proves only the computer it ran on.

## Running Scouting (the first office agent)

Scouting reviews the new roles that fit your profile and saves a score and a reason for each. In a Claude Code session on this
repository, say: "Run scouting on the queued tasks." Claude Code then uses the tools in `collector/src/jobtracker/scout.py`
(claim, read, submit, finish). Nothing is sent anywhere, and every call is written to the audit log.

The tools need the Supabase secret key. In a Claude Code cloud session it is stored as a network secret for the `apikey` header
on your project host, entered only in the secure form, never in chat. The newer `sb_secret_` keys belong in `apikey`, not in
`Authorization`. To stop access, remove the entry under Network secrets in the cloud environment's settings, and create a new
key in Supabase if you think it was exposed.
