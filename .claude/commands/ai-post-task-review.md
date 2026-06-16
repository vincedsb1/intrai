---
name: ai-post-task-review
description: Run a post-task review after a completed task to detect validation, documentation, context, skill, unsafe-assumption,
  sync, and commit-readiness obligations.
---

# /ai-post-task-review

Run a post-task review after a code, documentation, configuration, skill, command, or project maintenance task.

Use this command when a task has just been completed and the user wants to verify whether the work created follow-up obligations, documentation drift, architecture drift, context-pack drift, skill improvements, or unsafe assumptions.

This command is a review-only workflow. It must not modify code, documentation, manifests, skills, commands, rules, hooks, or git state unless the user explicitly asks for a separate follow-up implementation.

## Goal

Determine whether the completed task requires any of the following:

- code cleanup;
- tests or validation still missing;
- documentation updates;
- architecture documentation updates;
- context pack refresh;
- project instruction updates;
- skill or command improvements;
- manifest or export synchronization;
- mock-data, silent-substitution, or unsafe-assumption remediation;
- follow-up specs;
- commit hygiene adjustments.

The expected output is an actionable post-task report, not a generic summary.

## Inputs

Use the available context first.

If the user provides an explicit task summary, use it as the primary input.

If no task summary is provided, infer the completed task from:

1. git status;
2. staged and unstaged changes;
3. recent diff;
4. files touched;
5. commands or skills mentioned in the conversation;
6. generated reports, if available.

Do not assume the task is complete only because files changed. Explicitly distinguish:

- completed work;
- partially completed work;
- unvalidated work;
- unrelated parallel changes.

## Required checks

### 1. Git state

Inspect the current git state.

Required commands:

- git status --short
- git diff --stat
- git diff --cached --stat

If the repository has both staged and unstaged changes, separate them in the report.

If unrelated changes are present, identify them as unrelated instead of mixing them into the review.

### 2. Diff impact

Inspect the relevant diff before giving conclusions.

Recommended commands:

- git diff
- git diff --cached

If the diff is large, summarize by touched area:

- backend;
- frontend;
- docs;
- tests;
- config;
- scripts;
- skills;
- commands;
- manifests;
- context packs.

Do not claim a file is safe without inspecting the relevant diff or explaining why inspection was not possible.

### 3. Validation status

Identify which validations were run and whether more are required.

Possible validation families:

- backend tests;
- frontend tests;
- lint;
- format check;
- typecheck;
- build;
- inventory;
- doctor;
- project-specific smoke tests;
- manual UI checks.

If no validation evidence exists, say so directly.

Do not invent successful tests.

### 4. Documentation impact

Check whether the task changed behavior, contracts, architecture, workflows, commands, data shape, UI behavior, or operational assumptions.

If yes, decide whether updates are needed in:

- docs/reference/*;
- docs/context/*;
- docs/initial-doc/*;
- docs/audits/*;
- docs/specs/*;
- AGENTS.md;
- CLAUDE.md;
- .claude/project-config.md.

Do not recommend documentation updates for cosmetic or purely internal changes unless they affect future agent work.

### 5. Architecture impact

If the task touches architecture, persistence, API contracts, domain entity identity, execution flow, metrics, storage, frontend/backend boundaries, or lifecycle rules, check whether an architecture reference should be updated.

Examples of architecture-sensitive changes:

- filesystem writes;
- SQLite access;
- run lifecycle;
- atomic write protocol;
- retry behavior;
- garbage collection;
- hard delete behavior;
- API response shape;
- domain entity naming or versioning;
- scoring or ranking semantics;
- separation between processing stages or execution modes;
- context loading rules.

### 6. Context pack impact

Check whether any context pack should be refreshed.

Relevant context packs may include:

- docs/context/ai-maintenance-context.md;
- docs/context/domain-workflow-context.md;
- docs/context/data-pipeline-context.md;
- docs/context/operations-context.md.

Refresh a context pack only when the completed task changes reusable context needed to start future conversations.

Do not duplicate implementation details inside context packs.

### 7. Skill or command improvement

Identify whether the task revealed a weakness in an existing skill or command.

Examples:

- the skill missed a required validation;
- the skill allowed an unsafe implicit substitute;
- the skill produced noisy documentation;
- the skill forgot to check a manifest/export;
- the skill used a wrong path;
- the skill failed to separate unrelated changes;
- the skill caused repeated manual correction.

If improvement is needed, recommend the canonical source to update, not only the local export.

For centralized skills, prefer canonical files under:

/Users/vincentdesbrosses/Documents/Misc/ai-system/skills/**/canonical.md

Local exports should not be edited manually unless explicitly required.

### 8. Manifest and export sync

If a skill, command, canonical file, or export changed, check whether the central AI system should be synchronized.

Relevant checks may include:

- cd /Users/vincentdesbrosses/Documents/Misc/ai-system
- ./run-inventory.sh
- .venv/bin/python scripts/ai_doctor.py --inventory

If an export changed locally but the canonical source did not, flag it as a possible source-of-truth violation.

### 9. Unsafe substitution and assumption check

Look for newly introduced:

- silent substitute;
- fake data;
- mock data used as real output;
- hardcoded placeholder metric;
- hidden default;
- implicit domain-object selection;
- ambiguous date/window behavior;
- swallowed error;
- broad except without explicit handling;
- stale documentation claim.

If found, classify the risk as:

- danger: can corrupt results, hide errors, or mislead future agents;
- review: may be acceptable but needs human confirmation;
- acceptable: explicit and documented behavior.

### 10. Commit readiness

Determine whether the current state is ready to commit.

A state is commit-ready only if:

- the diff scope is understood;
- unrelated changes are excluded or explicitly accepted;
- required validations are run or consciously deferred;
- documentation impact is handled or explicitly deferred;
- no dangerous silent-substitution or source-of-truth issue remains;
- generated files and backups are not accidentally included.

## Output format

Return the report in this structure:

## Post-task review

### 1. Task understood

- Completed task:
- Scope:
- Files likely in scope:
- Files likely out of scope:

### 2. Git state

- Staged changes:
- Unstaged changes:
- Untracked files:
- Unrelated changes detected:

### 3. Validation status

| Check | Status | Evidence | Required next action |
|---|---|---|---|
| Backend tests | unknown/pass/fail/not needed | ... | ... |
| Frontend tests | unknown/pass/fail/not needed | ... | ... |
| Lint/format | unknown/pass/fail/not needed | ... | ... |
| Build | unknown/pass/fail/not needed | ... | ... |
| Inventory | unknown/pass/fail/not needed | ... | ... |
| Doctor | unknown/pass/fail/not needed | ... | ... |

### 4. Documentation impact

- Required documentation updates:
- Not required:
- Unclear:

### 5. Architecture impact

- Architecture touched: yes/no/unclear
- Files to update:
- Reasoning:

### 6. Context pack impact

| Context pack | Refresh needed? | Reason |
|---|---:|---|
| ai-maintenance-context | yes/no | ... |
| domain-workflow-context | yes/no | ... |
| data-pipeline-context | yes/no | ... |
| operations-context | yes/no | ... |

### 7. Skill or command improvement

- Skill/command used:
- Weakness found:
- Canonical file to update:
- Recommended change:

### 8. Unsafe substitution / unsafe assumption review

| Finding | Severity | Location | Required action |
|---|---|---|---|
| ... | danger/review/acceptable | ... | ... |

### 9. Commit readiness

- Ready to commit: yes/no
- Commit scope:
- Suggested commit message:
- Files to include:
- Files to exclude:

### 10. Next actions

1. ...
2. ...
3. ...

## Rules

- Do not modify files.
- Do not stage files.
- Do not commit.
- Do not push.
- Do not rewrite documentation.
- Do not update skills.
- Do not run destructive commands.
- Do not mix unrelated changes into the same recommendation.
- Do not claim tests passed unless evidence is available.
- Do not assume a local export is the source of truth.
- Prefer explicit uncertainty over false confidence.

## Good usage examples

### After implementing a backend fix

/ai-post-task-review

Task completed:
Fixed run deletion behavior in backend storage.

Expected focus:

- storage invariants;
- hard delete lifecycle;
- tests;
- architecture docs;
- context pack drift;
- commit readiness.

### After creating a context pack

/ai-post-task-review

Task completed:
Created docs/context/domain-workflow-context.md.

Expected focus:

- doc location;
- links;
- AGENTS.md / CLAUDE.md routing;
- inventory and doctor;
- whether docs/00-INDEX.md needs update.

### After updating a shared skill

/ai-post-task-review

Task completed:
Updated shared create-doc canonical and regenerated exports.

Expected focus:

- canonical source;
- manifest exports;
- Claude/Codex parity;
- inventory;
- doctor;
- local export sync;
- no manual export drift.

## Bad usage examples

Do not use this command to implement the next task.

Incorrect:

/ai-post-task-review
Now fix all documentation issues.

Correct:

/ai-post-task-review
Review whether the previous task requires documentation updates.

Do not use this command as a generic project audit.

Incorrect:

/ai-post-task-review
Audit the whole project.

Correct:

/ai-post-task-review
Review the consequences of the just-completed task.

## Completion criteria

The command is complete when it has produced:

- a clear post-task report;
- explicit commit readiness;
- documentation impact decision;
- context pack impact decision;
- skill improvement decision;
- silent-substitution/unsafe-assumption decision;
- concrete next actions.

No file modifications are required for this command to be considered successful.
