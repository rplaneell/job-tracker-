# Security checklist

Each common web app risk, sorted into: applies now, not applicable, or later. The reason is given for each.

| Risk | Status | Reason |
|---|---|---|
| Secrets in code or Git | Applies, covered | gitleaks in CI and locally, `.env` ignored, rules in SECRETS_SETUP.md |
| Vulnerable dependencies | Applies, covered | npm audit, pip-audit, OSV Scanner, Dependabot updates. One dev only flaw has an expiry date |
| Code injection in the screens | Applies, covered | Semgrep rules, links pass `safeHref` and the collector's `safe_url` |
| Access control on data (row level security) | Applies, OPEN | Any signed in user can read. Safe only while sign ups are off. Owner only migration needs your yes |
| Sign up settings in Supabase | Applies, unconfirmed | Only you can confirm public sign ups are off in the Supabase dashboard |
| Logged out access to pages | Applies, partly covered | `proxy.ts` redirects. No automated browser test yet |
| Browser security headers | Applies, covered | Six headers added and tested. Full Content Security Policy later |
| Clickjacking (page framed by another site) | Applies, covered | `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| Cookies not HttpOnly | Applies, accepted | The Supabase browser library needs to read its own session cookie. Mitigated by no injection sinks and the headers |
| Rate limiting | Not applicable now | Single owner, magic link sending is limited by Supabase itself |
| File uploads | Later | Arrives with the CV builder. Needs type and size limits, and private storage |
| HTTPS and production settings | Later | Applies when the dashboard is hosted. Strict-Transport-Security is already set |
| Collector hostile input | Applies, covered | Link defence, region only storage, property tests, golden files |
| Politeness and legal limits of collecting | Applies, covered | robots.txt gate, one request per second per host, documented API exception for Ashby only |
| Agent actions and approvals | Later | Mandatory human approval enforced in the database, checked before any agent is built |
| Audit trail of agent actions | Later | Part of the agent design |
| Budget guard for free providers | Later | Part of the agent design |
| Mutation checks for TypeScript | Later | Collector done, TypeScript only by hand |
| Browser click and injection tests | Later | Needs a test browser in CI |
| Recovery if a key leaks | Applies, documented | Revoke and replace, steps in SECRETS_SETUP.md |
