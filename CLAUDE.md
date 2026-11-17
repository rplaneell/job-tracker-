# Notes for Claude Code

* Preferences: friendly human tone, never use hyphens or dashes in replies and docs prose, always explain abbreviations.

## Secrets rule (applies to every project)

* Keep API keys, tokens and passwords only in a local `.env` file. (API means application programming interface, the door a program uses to talk to another service, and a key is the password for that door.)
* `.env` must always be listed in `.gitignore`. Check this before the first commit, and check that `git ls-files` shows no `.env` file with real secrets.
* Commit a `.env.example` with the variable names and empty values.
* Never paste a key into source code, docs, chat messages, screenshots or commit messages.
* If a key ever reaches GitHub, revoke it at the provider and make a new one. Deleting the commit is not enough.

Why: Git remembers everything forever, and bots scan GitHub within seconds for keys. A file Git never sees can never be uploaded by mistake.

## Skills (myskills marketplace)

* This project is linked to the `rplaneell/myskills` marketplace through `.claude/settings.json`. The always on plugins are core, superpowers and task observer (task observer watches the session and suggests small improvements to skills, always with approval).
* Follow the skills announced at session start. Add more groups for this project with `python3 ~/myskills/scripts/link.py . frontend` (swap `frontend` for any group name).
