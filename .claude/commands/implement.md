---
name: implement
description: Implement a validated specification into production code while respecting the current project's conventions from
  project-config.md.
---

# /implement — Implement a validated specification

**Agnostic** command that transforms a validated specification (SPEC) into production code, respecting the conventions of the current project as declared in `<project>/.claude/project-config.md`.

## Mission

You are the **Implementer**. Quality matters more than speed.

## Prerequisites

- A revised SPEC (status `REVISED` or `PASS` in `.state.json`) must exist.
- If no SPEC is identifiable, ask the user for the path or the phase number (`P<N>`).

---

## PHASE 0 — Load project configuration

**MUST be done first.** Read `<project-root>/.claude/project-config.md` if present.

From this file, extract :
- Stack (backend language, frontend framework).
- Test, lint, build commands.
- Doc-authoring conventions (`doc_rules`, `doc_reference_root`, `doc_types`).
- Project-specific implementation conventions (e.g. naming, gating, parity rules).
- Memory location (path to the long-term project memory file, if any).
- Forbidden patterns (commit messages, docs, code).

### If `project-config.md` is absent — aggressive auto-detection

| Probe | If found → infer |
| ----- | ---------------- |
| `pyproject.toml` / `requirements.txt` | Python backend. |
| `package.json` | Node/TS frontend. |
| `.venv/bin/python` | Activate before running Python commands. |
| `pytest.ini` or `[tool.pytest]` in `pyproject.toml` | Use `pytest -v` for tests. |
| `docs/specs/` | Look there for specs. |
| `docs/reference/backend/` | Update `MODULE-*.md` files there for backend changes. |
| `docs/ARCHITECTURE.md` | Read for global architecture. |
| `CLAUDE.md` at repo root | Read for project conventions. |

After auto-detection, **display the detected configuration once** and confirm before starting implementation.

---

## PHASE 1 — Identify the active SPEC

### Step 1a — Find the SPEC

1. If `$ARGUMENTS` contains a path or phase number (`P39`, `P8`, …) → locate the corresponding folder under `docs/specs/`.
2. Otherwise, scan `docs/specs/*/.state.json` for the SPEC with the most recent `last_status` in `REVISED` or `PASS` that has not yet been implemented.
3. Read `.state.json` to extract `slug`, `paths.spec`, `solution_strategy`, `version`.

### Step 1b — Validate readiness

- `last_status` must be `REVISED` or `PASS`. If it is `DRAFT` or `INTAKE` → **STOP**, inform the user the SPEC is not ready, suggest running `/spec-3-audit` first.
- Read the complete SPEC at `paths.spec`.

---

## PHASE 2 — Load project context (MANDATORY)

**Never write code before reading these files.** This phase guarantees convention compliance.

### Step 2a — Global rules and conventions

Read mandatorily :
- `CLAUDE.md` (or equivalent root-level conventions file) — project conventions, architecture, data flow, imports, patterns.
- `docs/ARCHITECTURE.md` (or equivalent) — modules, boundaries, flows, architectural decisions.

### Step 2b — Reference documentation

Read the reference files relevant to the SPEC's scope :
- Backend modules : `<doc_reference_root>/backend/MODULE-*.md` for impacted modules.
- API endpoints : `<doc_reference_root>/API-ENDPOINTS.md` if endpoints change.
- Storage : `<doc_reference_root>/STORAGE.md` if storage is impacted.
- Frontend : `<doc_reference_root>/frontend/*.md` if the frontend is impacted.

### Step 2c — Existing code (anchors)

Read the files listed in the SPEC's `sources.reference_docs` section. Also :
- Identify **existing patterns** in the code (how similar features are structured, how the pipeline integrates new steps, how tests are organised).
- **Never invent a new pattern if one exists** in the codebase — follow the existing one.
- Read at least **2 examples of the same kind** before writing new code (e.g. read 2 existing campaign scripts before authoring a new one).

### Step 2d — Project memory

If `project-config.md` declares a `memory_path`, read that file for accumulated context (previous campaigns, eliminated approaches, technique patterns).

If no memory is declared, skip silently.

---

## PHASE 3 — Implementation plan

### Step 3a — Decompose into tasks

From the SPEC's **Implementation plan**, decompose into ordered, atomic tasks. Use `TaskCreate` (or `manage_todo_list`) to track them. Each task must :
- Have a clear scope (1 file or 1 logical group of files).
- Be individually testable (when applicable).
- Respect the SPEC's dependency order.

### Step 3b — Recommended implementation order

Follow this order unless the SPEC dictates otherwise :
1. **Models / registry** — type, parameter, signature changes.
2. **Backend business logic** — core functions.
3. **Pipeline integration** — insertion into the existing flow.
4. **Driver / campaign script** — launch script (if applicable).
5. **Unit tests** — individual function tests.
6. **Integration tests** — full pipeline tests.
7. **Documentation** — update reference modules.

If the project includes a **frontend layer**, append these steps after the backend is stable :
8. **Shared types** — TS type definitions shared between packages (if applicable).
9. **Shared API functions / client wrappers** — data-fetching helpers.
10. **Server Actions / BFF layer** — if applicable.
11. **UI Components** — reusable / presentational components.
12. **Page(s)** — entry-point views (Server / Client Components).
13. **Loading / skeleton states** — cover all async states (loading, error, empty, success).

### Step 3c — Signal conflicts

If you detect a **conflict** between :
- The SPEC and `docs/ARCHITECTURE.md`.
- The SPEC and `CLAUDE.md`.
- The SPEC and existing code (different pattern).
- The SPEC and prior results stored in project memory.

→ **STOP** and ask the user which source is authoritative. Never resolve a conflict silently.

---

## PHASE 4 — Implementation

### Implementation rules (CRITICAL)

#### Architecture & patterns

- **Follow existing patterns** : read at least 2 examples of the same kind in the codebase before writing new code.
- **Backend** : respect the stack declared in `project-config.md` (Python version, framework, import conventions).
- **Pipeline steps** : when inserting a new step in an ordered pipeline, place it at the correct ordinal position and follow the existing commenting convention.
- **Feature flags** : if the project convention requires gating, every new behavior must be gated by a flag with an **inert default** so existing behavior is preserved (backward-compatible).

#### Code quality

- **Zero technical debt** : clean, typed, readable code. No `# TODO`, no shortcuts, no commented-out code, no leftover `print` / `console.log`.
- **Explicit naming** : variables and functions must have names that explain their role.
- **Error handling** : always handle error cases. Log warnings for degraded paths (e.g. missing columns → skip). Never crash silently.
- **Strict typing** : follow the project convention declared in `project-config.md`. If unspecified, prefer explicit `Optional[X]` / `List[X]` from `typing` (Python) or strict TS types.
- **NEVER use mock/fallback data** — always raise errors instead of returning fake values.

#### Tests

- Follow the test framework declared in `project-config.md` (default : pytest for Python, vitest for TS).
- Use existing fixtures where available.
- Follow the test-naming convention if declared (e.g. `test_p{N}_descriptive()` for campaign tests).
- Float comparisons : use `np.allclose(atol=1e-6)` (or framework equivalent), never strict equality.
- Deterministic fixtures : store sample data in the project's fixtures folder (typically `<package>/tests/fixtures/`).

#### Security

- **No injection** : never concatenate strings in SQL queries — use parameterised queries.
- **No secrets in code** : everything via environment variables.
- **Validate inputs at system boundaries.**

### Step 4a — Implement task by task

For each task in the plan :
1. Mark the task as `in_progress`.
2. Implement the code.
3. Manually verify compliance with the rules read in Phase 2.
4. Mark the task as `completed`.
5. Move to the next task.

### Step 4b — Cross-verification (continuous)

During implementation, continuously verify :
- **Naming consistency** : column / feature / variable names match exactly (snake_case, declared prefixes from `project-config.md`).
- **Inert flag defaults** : feature flags produce identical behavior when off.
- **Training ↔ Prediction parity** (if applicable) : the prediction side exactly mirrors the training side (same transforms, same order, same parameters).
- **Constants / lists consistency** : same constants used across the function, the tests, and the driver script.

---

## PHASE 5 — Verification

### Step 5a — Tests

Run the test command declared in `project-config.md` (typical default) :

```bash
# Python backend
source .venv/bin/activate
cd backend && pytest -v --tb=short
```

If any test fails : fix and re-run. Never consider the implementation complete with failing tests.

### Step 5b — Feature-specific tests

If the SPEC has a phase number `N`, target the specific tests :

```bash
cd backend && pytest -v --tb=long -k "p{N}"
```

Verify all phase-specific tests pass.

### Step 5c — Non-regression tests

Verify existing tests still pass (inert flag defaults must not break anything).

### Step 5d — Dry-run (if applicable)

If the SPEC produces a driver / campaign script with a dry-run mode :

```bash
cd backend && python3 scripts/launch_*.py --dry-run
```

Verify the script generates the expected configs without executing.

### Step 5e — Frontend audit (if applicable)

If the implementation touches the frontend, run a mental audit on the created/modified components using `/ui-review`. Fix any detected issues before moving to Phase 6.

---

## PHASE 6 — Documentation update (MANDATORY)

Implementation is **not complete** until documentation is up to date.

### Step 6a — Reference modules

Update impacted reference modules in `<doc_reference_root>/backend/MODULE-*.md` (or the frontend equivalents) :
- New functions, constants, pipeline steps.
- Added / modified parameters.
- Flow diagram if structurally modified.

### Step 6b — Architecture

If structural changes were made → update `docs/ARCHITECTURE.md`.

### Step 6c — Architecture decisions

If new architectural decisions were taken → add them to `docs/DECISIONS.md` (or equivalent) with an incremental ID, the reason, and the source.

### Step 6d — SPEC state

Update the SPEC's `.state.json` :

```json
{
  "last_step": "implement",
  "last_status": "IMPLEMENTED"
}
```

---

## PHASE 7 — Final summary

Display a structured summary :

```
## Implementation complete — P<N> (<title>)

### Files created
- `path/to/file.ext` — description

### Files modified
- `path/to/file.ext` — change description

### Documentation updated
- `<doc_reference_root>/backend/MODULE-*.md` — modified sections

### Verifications
- [ ] Unit tests : OK/FAIL
- [ ] Integration tests : OK/FAIL
- [ ] Non-regression tests : OK/FAIL
- [ ] Dry-run : OK/FAIL/N/A
- [ ] Documentation up to date : OK

### Points of attention
- (risks, known limitations, things to verify manually)

### Next step
- Run `/commit` to commit changes.
- OR launch the campaign : `python3 scripts/launch_*.py`
```

---

## Strict rules (anti-regression)

1. **Read before writing** : never code without having read the rules and existing code (Phase 2 complete).
2. **No new patterns** : if a pattern exists in the codebase, follow it. If you think a pattern is suboptimal, flag it to the user but follow the existing one unless told otherwise.
3. **Conflict = STOP** : any conflict between SPEC and rules / architecture / code must be escalated to the user.
4. **Tests mandatory** : an implementation with failing tests is not complete.
5. **Documentation mandatory** : an implementation without doc updates is technical debt.
6. **Zero shortcuts** : no `# TODO`, no `Any`, no commented-out code, no leftover `print` / `console.log`. The merged code must be production-ready.
7. **Questions > assumptions** : when in doubt, ask the user rather than guess.
8. **Respect scope** : implement what is in the SPEC, no more no less. No bonus features, no unsolicited refactoring.
9. **Training = Prediction parity** : every transformation applied training-side MUST be mirrored prediction-side, in the same order, with the same parameters (when applicable to the project).
10. **Inert defaults** : every new feature flag must have a default that produces behavior identical to the existing one (backward-compatible).
