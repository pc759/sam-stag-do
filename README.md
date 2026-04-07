# sam-stag-do
A website for Sam's stag do - submit embarrassing anecdotes and chat with AI about Sam's questionable life choices

## Chat (Simtheory)

Copy `.env.example` to `.env.local` and set:

- `SIMTHEORY_API_KEY` — Bearer token for Cartwright
- Optional `SIMTHEORY_CHAT_URL` — defaults to `https://cartwright.simtheory.ai/api/v1/chat/completions`

## Development guardrails

This repo uses `npm run verify` as the single quality gate (lint + build).

See `docs/dev-workflow.md` for:
- local Husky hooks
- CI requirements
- planning/discovery gate requirements for non-trivial changes
- branch protection checklist
- one-time `stories.db` untracking step

See `CONTRIBUTOR_PLAYBOOK.md` for contributor habits, review quality, and definition-of-done expectations.
