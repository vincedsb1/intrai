---
name: commit
description: Prepare, validate, commit, and optionally push the current Git changes while respecting project commit and documentation
  rules.
---

# /commit — Automated commit workflow with documentation sync

**Agnostic** workflow that detects code changes, syncs relevant documentation, runs tests, formats code, then commits and pushes. Works in any project that provides a `.claude/project-config.md`.

Execute this workflow **strictly in order**. If ANY step fails, **STOP immediately**.

---

## PHASE 0 — Load project configuration

**MUST be done first.** Read `<project-root>/.claude/project-config.md` if present.

From this file, extract :
- Source-to-doc mapping table (frontend pages, components, backend modules, tests).
- Test commands (backend, frontend, build).
- Lint / format commands (backend, frontend).
- Commit message language and conventions.
- Forbidden patterns in commit messages.
- Documentation root and rules location.

**If `project-config.md` is absent** : ask the user for :
1. The location of source-to-doc mapping (or skip Phase 1 entirely).
2. The exact test commands to run.
3. The exact lint/format commands to run.
4. The commit message language.

Do NOT assume defaults silently.

---

## PHASE 1 — Analyze changes & map to documentation

### Step 1a — Detect modified files

```bash
git status --porcelain
```

Identify backend, frontend, test, and config files changed since last commit.

### Step 1b — Map files to documentation

Use the **source-to-doc mapping table** from `project-config.md`. For each modified source file, identify the corresponding doc(s) to update.

If a modified file does not match any mapping entry, skip it for the doc-sync phase (but still include it in the commit).

### Step 1c — Analyze conversation for functional changes

For each mapped documentation file :
1. Review the recent conversation for **new/modified functions, endpoints, components, or behavior**.
2. Read the current documentation file.
3. Identify **what is missing or outdated** in the docs.
4. Generate updates following the doc authoring rules referenced in `project-config.md` (e.g. `doc_rules` field).
5. **Always bump** the `Last Updated` frontmatter field to today's date (YYYY-MM-DD).

### Step 1d — Auto-update documentation

Apply **surgical edits only** :
- Function/component signatures and descriptions.
- New API endpoints or parameters.
- Behavior changes.
- `Last Updated` field.

**Do NOT** re-write entire sections.

---

## PHASE 2 — Run tests

Use the test commands declared in `project-config.md`. Typical sequence :

### Step 2a — Backend tests

Run the backend test command. If any test fails → **STOP**, display error, do not continue.

### Step 2b — Frontend tests

Run the frontend test command. If any test fails → **STOP**, display error, do not continue.

### Step 2c — Production build

Run the frontend build command. Errors block ; warnings are tolerated. If errors → **STOP**.

---

## PHASE 3 — Format & lint

Use the lint/format commands declared in `project-config.md`. Typical sequence :

### Step 3a — Frontend

Run the frontend prettier + lint commands.

### Step 3b — Backend

Run the backend formatter (black) + linter (ruff or equivalent).

If a formatter modifies files, those changes will be included in the commit (Phase 4 stages all).

---

## PHASE 4 — Stage & commit

### Step 4a — Stage all changes

```bash
git add .
```

### Step 4b — Generate commit message

Analyze `git diff --staged` and write a **clear, concise commit message** respecting the conventions in `project-config.md` :
- **Language** : as declared (e.g. English, French).
- **Mood** : imperative (`Add`, `Fix`, `Update`, `Refactor`).
- **Style** : 1-2 sentence summary of **what** and **why**.
- **Length** : keep first line ≤72 characters.
- **Forbidden** : never mention AI / Claude / Copilot / automation / "Generated with" — see `forbidden patterns` in `project-config.md`.
- Message contains ONLY technical description.

Examples (English, imperative) :
- ✅ `Add feature registry with provider system`
- ✅ `Fix date validation in Mode B workflow`
- ❌ `Generated with Claude Code: Add feature registry`
- ❌ `AI: Fixed bugs`

### Step 4c — Create commit

```bash
git commit -m "<your generated message>"
```

---

## PHASE 5 — Push to remote

### Step 5a — Detect current branch

```bash
git branch --show-current
```

### Step 5b — Push

```bash
git push origin HEAD
```

---

## Summary output

After successful completion, display :

```
✅ Documentation updated:
  - <list of edited doc files>

✅ Tests passed:
  - Backend : <test command> (<N> tests)
  - Frontend : <test command> (<N> tests)
  - Build : <build command> ✓

✅ Commit : "<your message>"
✅ Pushed : origin/<branch>
```

---

## Important rules

- **Atomic workflow** : if any test fails, the entire process stops.
- **Tests are mandatory** : no commit without passing tests.
- **Documentation sync first** : update docs before running tests, so doc changes are also validated by the build/test pipeline.
- **No AI mentions** : commit messages must be purely technical (see `project-config.md`).
- **Format obeys project rules** : follow whatever doc-authoring rules `project-config.md` points to.

---

## When `project-config.md` is absent - ask before proceeding

If no config is present, **probe the project filesystem** to deduce sensible defaults. Run the detections below and assemble a working config in memory for the duration of the session.

### Frontend stack

| Probe | If found → infer |
| ----- | ---------------- |
| `package.json` exists | Frontend present. Read `scripts.test`, `scripts.build`, `scripts.lint`, `scripts.format` and use them. |
| `pnpm-lock.yaml` | Package manager : `pnpm`. |
| `yarn.lock` | Package manager : `yarn`. |
| `package-lock.json` | Package manager : `npm`. |
| `tsconfig.json` | TypeScript stack ; prefer `tsc --noEmit` for type-checking. |
| `next.config.{js,ts,mjs}` | Next.js stack. |
| `vite.config.{js,ts}` | Vite stack. |
| `vitest.config.{js,ts}` | Vitest available for `pnpm test`. |
| `.prettierrc*` or `prettier` in devDependencies | Run `pnpm exec prettier --write .`. |
| `.eslintrc*` or `eslint.config.*` | Run `pnpm exec eslint --fix .`. |

### Backend stack

| Probe | If found → infer |
| ----- | ---------------- |
| `pyproject.toml` | Python project. Read `[tool.poetry]`, `[tool.ruff]`, `[tool.black]`. |
| `requirements.txt` | Python project (pip-based). |
| `Pipfile` | pipenv. |
| `.venv/bin/python` | Activate before running any Python command : `source .venv/bin/activate`. |
| `pytest.ini` or `pyproject.toml [tool.pytest]` | Run `pytest -v`. |
| `manage.py` | Django stack. |
| `app/main.py` + `fastapi` in deps | FastAPI stack. |
| `black` / `ruff` in deps | Run them in lint phase. |

### Doc-sync detection

| Probe | If found → infer |
| ----- | ---------------- |
| `/docs/` directory exists | Documentation present. |
| `/docs/rules/*AUTHORING*.md` or `/docs/00-GUIDELINES.md` | Use as authoring source-of-truth. |
| Subfolders `frontend/` and `backend/` under `/docs/reference/` | Standard convention : `PAGE-*`, `COMPONENT-*`, `MODULE-*` patterns apply. |
| No mapping table available | Skip auto-doc-sync ; commit code changes only and warn the user once. |

### Commit message defaults

- Language : **English** unless `CONTRIBUTING.md` or `README.md` indicates otherwise (look for `## Commits` or `## Conventional Commits` sections).
- Mood : imperative (universal convention).
- Forbidden patterns : never mention AI / Claude / Copilot / automation. This is universal — apply even without a config.

### Confirmation prompt

After auto-detection, **display the detected configuration once** and ask for one-shot confirmation :

```
Auto-detected configuration (no .claude/project-config.md found) :

  Backend tests       : <command or "none">
  Frontend tests      : <command or "none">
  Build               : <command or "none">
  Backend lint        : <command or "none">
  Frontend lint       : <command or "none">
  Commit language     : <en|fr>
  Doc auto-sync       : <enabled with mapping at … | disabled>

Proceed with this configuration ? [Y/n/edit]
```

If the user answers `edit`, fall back to the interactive prompt below.

### Last-resort interactive prompt

If both `project-config.md` is absent AND auto-detection produces nothing usable, ask the user explicitly :

```
Unable to auto-detect project conventions. Please provide :
1. Backend test command (or "none") :
2. Frontend test command (or "none") :
3. Build command (or "none") :
4. Backend lint command (or "none") :
5. Frontend lint command (or "none") :
6. Commit message language [en/fr] :
7. Source-to-doc mapping file path (or "none" to skip doc sync) :
```
