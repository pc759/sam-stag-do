# Development workflow guardrails

This repo uses one command as the quality standard:

- `npm run verify` = lint + build

For contributor expectations and quality habits, see `CONTRIBUTOR_PLAYBOOK.md`.

## Local machine guardrails

Install dependencies once:

```bash
npm install
```

This runs `npm run prepare`, which installs Husky hooks.

Hooks:

- `.husky/pre-commit` runs `npm run lint`
- `.husky/pre-push` runs `npm run verify`

If a hook fails, Git blocks the commit/push until fixed.

## GitHub guardrails

- PR workflow: `.github/workflows/ci.yml`
- Runs on pull requests to `main`
- Uses Node 20
- Runs `npm ci` then `npm run verify`
- Cancels older duplicate runs on same branch (concurrency)

## Planning & discovery gate

Planning is required for non-trivial PRs. Trigger the Planning Gate when a PR includes **any** of:

- More than 2 files changed (`>2`)
- API, DB, auth, or admin changes
- A new feature concept
- A user-visible behavior change

When Planning Gate is required, complete planning in the PR body using these sections:

- `Objective`
- `Scope` (`In scope`, `Out of scope`, `Non-goals`)
- `Discovery summary`
- `Conflict check`
- `Implementation approach`
- `Verification plan`
- `Rollback plan`

For longer plans, use `docs/plans/plan-template.md` and link it in the PR `Plan doc (optional)` section.

Exemption is only for trivial, surgical changes. If `Planning Gate Exempt` is selected, provide a meaningful exemption rationale.

CI enforces this gate by validating PR body structure and trigger selection before the main verify checks.

## Branch protection checklist (GitHub settings)

Apply to `main`:

1. Require a pull request before merging
2. Require status checks to pass before merging
3. Select required check: `verify`
4. Restrict direct pushes to `main`
5. (Recommended) Require at least 1 approving review

## One-time repository cleanup

If `stories.db` is currently tracked, run:

```bash
git rm --cached stories.db
```

Then commit the removal so future DB changes stay local only.

## Future improvement

When tests are added, extend `verify`:

```bash
npm run lint && npm test && npm run build
```
