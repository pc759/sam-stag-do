# CONTRIBUTOR_PLAYBOOK.md

Contributor skills and habits for safe, consistent development in this repo.

This file complements `docs/dev-workflow.md`:

- `docs/dev-workflow.md` = process and enforcement
- `CONTRIBUTOR_PLAYBOOK.md` = contributor behaviour and quality habits

## 1) Work the golden path

Use the default loop:

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` is the shared quality baseline (lint + build).

## 2) Understand and respect guardrails

Contributors should know what each guardrail does:

- `.husky/pre-commit` → runs `npm run lint`
- `.husky/pre-push` → runs `npm run verify`
- `.github/workflows/ci.yml` → runs verify on PRs to `main`
- Branch protection on `main` → blocks unsafe merges

Do not bypass guardrails. Fix failures before committing/pushing.

## 3) Keep changes reviewable

Expected practice:

- Small, focused commits
- One concern per PR where possible
- Clear PR description of what changed and why
- No unrelated file churn in the same PR

## 4) Plan before coding non-trivial changes

Use the Planning Gate for non-trivial changes. In PRs, select exactly one:

- `Planning Gate Required`
- `Planning Gate Exempt`

When planning is required, complete the planning sections (`Objective`, `Scope`, `Discovery summary`, `Conflict check`, `Implementation approach`, `Verification plan`, `Rollback plan`) before coding starts.

Exemptions are only for trivial, surgical changes and must include a meaningful exemption rationale.

## 5) Discovery first, then implementation

Before coding, review the relevant existing implementation so the plan is grounded in reality:

- Files and components impacted
- Routes/endpoints involved
- Data paths, schema usage, or contracts touched
- Existing docs/workflow constraints

Summarise this in the PR `Discovery summary` section (or linked plan doc) so reviewers can verify the plan was informed by actual discovery.

## 6) Run a conflict check up front

Identify likely collisions before implementation and record mitigations in `Conflict check`:

- API/interface clashes
- Data/schema assumptions
- Auth/session/admin path impacts
- UI or workflow regressions

Adjust the implementation approach before coding when conflicts are found.

## 7) Maintain repo hygiene

Required hygiene skills:

- Respect `.gitignore`
- Keep local-only files out of Git (including `stories.db`)
- Avoid committing machine-specific or generated noise
- If a local file is accidentally tracked, untrack it cleanly

## 8) Code with low surprise

Prioritise maintainability over cleverness:

- Follow existing Next.js pages/API structure
- Keep UI, API, and data changes logically separated
- Be extra cautious in auth/admin/session-sensitive code paths
- Prefer incremental improvements over large rewrites

## 9) Security-first defaults

Baseline expectations:

- Never commit secrets
- Use environment variables for credentials/config
- Treat user input and uploads as untrusted
- Call out risky assumptions in PR notes

## 10) Contributor definition of done

Before requesting review, confirm:

- [ ] Scope is clear and intentional
- [ ] Planning Gate completed in PR (or exempt with rationale)
- [ ] `npm run verify` passes locally
- [ ] No local-only files are staged
- [ ] PR template is completed
- [ ] Risks/follow-ups are noted if relevant

## 11) Prevent drift between docs and enforcement

When standards change, update all relevant sources together:

1. Executable guardrails (`package.json`, hooks, CI)
2. Process doc (`docs/dev-workflow.md`)
3. Contributor guide (`CONTRIBUTOR_PLAYBOOK.md`)

If these drift, the process becomes unreliable.
