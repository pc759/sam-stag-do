# Plan Template

Use this template for non-trivial changes that need a longer plan than the PR body.
Link this document in the PR’s `Plan doc (optional)` section.

## Objective

State the change goal in one clear paragraph.

## Scope

- In scope:
- Out of scope:
- Non-goals:

## Discovery summary

Summarise what existing code, routes, data paths, and docs were reviewed before coding.

## Conflict check

List likely collisions (API/data/auth/UI/workflow) and how they will be mitigated.

## Implementation approach

Describe the planned implementation steps and sequencing.

## Verification plan

List the checks to run (local + CI) and expected outcomes.

## Rollback plan

Describe how to revert safely if something fails after merge.
