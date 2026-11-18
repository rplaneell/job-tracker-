# Keeping secrets out of Git

A secret is a key, token or password. If one reaches GitHub, bots can find it within seconds, and Git remembers
everything forever, so deleting the commit does not help. The rule here is simple: secrets live only in a local
`.env` file that Git never sees. `.env.example` lists the variable names with empty values.

## Switch on the local blocker (once on every computer you commit from)

```bash
pip install pre-commit
pre-commit install
```

From then on, a commit that contains a secret is refused before it is saved. The blocker is installed by you, on your own
computer. Nothing in this repository can install it for you, and the files alone do nothing until you run those commands.

## When a commit is blocked

Move the value into `.env` and read it from the environment in your code. Then commit again. If the alarm is false (for
example a made up example string), add a comment `gitleaks:allow` on that line and write the reason next to it.

## The second layer

The `secret-scan` workflow runs the same scanner over the whole history on every push and pull request. It is the safety
net for a skipped local blocker, and it only notices after the secret already reached GitHub.

## If a secret ever reached GitHub

Treat it as stolen, even if you deleted the commit. Revoke it at the provider that issued it and create a new one. Then
check the provider's logs for any use of the old one. Cleaning the history is optional and needs a safety copy first.

## What this cannot do

GitHub's own push protection is a paid feature for private repositories, so it is not relied on. Scanners miss secrets with
unusual formats. Never paste a real secret anywhere to test it.
