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

## Tailoring a CV

1. In the dashboard open **Your CV**, type or paste your master CV in the plain text layout, and press **Save master CV**.
   Write only true things, one fact per line. Real numbers are fine. Anything you do not write here can never appear in a draft.
2. Open a role you care about and press **Tailor my CV**. This only queues a request. Nothing is sent anywhere.
3. In a Claude Code session on this repository say: "Tailor my CV for the queued task." Claude Code uses the tools in
   `collector/src/jobtracker/cv.py` (claim, read, submit, finish). The tool copies your employers, degrees and dates itself and
   refuses any new number or name that is not in your master CV, the company or the role title.
4. Open the draft from the role page or from **Your CV**, read every line, press **Approve this draft**, then **Print or save as PDF**.

The check cannot judge meaning. A reworded line could still read as stronger than the truth, so you are the final reader.
Your CV text never goes into the activity log and is never sent to any outside service.

## The 3D office is the front door

The dashboard project now builds the 3D office (Job HQ) into itself and serves it at `/hq`. After you sign in, `/` opens the office. Roles live at `/roles`, and the office links to Roles, Pipeline, Your CV and Sources.

* **One Vercel project is enough.** The separate Job HQ Vercel project is no longer needed. You can delete it in Vercel (Project, Settings, Advanced, Delete Project).
* **No special Vercel setting is needed.** The built office is committed inside the dashboard folder (`web/public/hq`), so Vercel only needs the `web` folder, as before. When the office source in `hq` changes, run `cd web && npm run build:office` and commit the result. A test in `hq` fails if that copy is missing or out of date.
* **The office still shows sample data** labelled Simulation until it can read your database (milestone M1).

## The daily email sender

The daily email needs three GitHub Actions secrets: `ALERT_EMAIL_TO` (your address), `ALERT_EMAIL_FROM` (the sender) and `RESEND_API_KEY`. `ALERT_EMAIL_FROM` was empty on 19 November 2026. A wrong or empty email setting no longer stops the job collection: roles are saved first, the job then shows red, and the log says which setting to fix. With a free Resend account, the sender can be `Job Tracker <onboarding@resend.dev>` and it can only send to the email address you signed up to Resend with.
