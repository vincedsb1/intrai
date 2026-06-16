---
name: create-doc
description: Create or update useful project documentation while respecting the current project's documentation conventions.
---

# /create-doc — Authoring documentation in a structured docs/ tree

**Agnostic** command that generates or updates a documentation file under the project's `docs/` tree. Conventions (target locations, naming, frontmatter, language) are read from `<project>/.claude/project-config.md` at runtime, with explicit user confirmation when required configuration is missing.

---

## Invocation

```text
/create-doc <type> <name> [--source <source-file>] [--phase <phase>]
```

Examples:

```text
/create-doc PAGE runs-registry --source frontend/app/runs/page.tsx --phase 4
/create-doc MODULE workflow --source backend/app/workflow.py --phase 5
/create-doc COMPONENT model-selector --source frontend/components/model-selector.tsx
/create-doc HOOK main-scroll-restoration --source frontend/hooks/use-main-scroll.ts
/create-doc GUIDE adding-tests
/create-doc CONTEXT ai-maintenance-context
/create-doc CONTEXT domain-workflow-context
```

If arguments are not supplied, ask the user:

1. Document type (`PAGE` / `COMPONENT` / `HOOK` / `MODULE` / `GUIDE` / `CONTEXT` / `API` / `STORAGE`, or whatever types are defined in `project-config.md`).
2. Name (kebab-case, e.g. `runs-registry`, `ai-maintenance-context`).
3. Source file path (if applicable).
4. Phase / campaign.

---

## When to use

- Document a new frontend **page** (`PAGE-*.md`).
- Document a new frontend **component** (`COMPONENT-*.md`).
- Document a new frontend **hook** (`HOOK-*.md`).
- Document a new backend **module** (`MODULE-*.md`).
- Write a **guide** (`/docs/guides/*.md`).
- Create or update a **context pack** (`/docs/context/*.md`) used to start future work with the right project context.
- Update a single-file reference like `API-ENDPOINTS.md` or `STORAGE.md`.

**Do not use for**: phase specs (those have their own `/spec-*` workflow), audits (manual edits in `/docs/audits/`), research notes, raw transcript dumps, or long historical notes.

---

## PHASE 0 — Load project configuration

**MUST be done first.** Read `<project-root>/.claude/project-config.md` if present.

From this file, extract:

- `doc_root` (default `/docs`).
- `doc_rules` — path to the authoring rules / source of truth.
- `doc_reference_root` (default `/docs/reference`).
- `doc_context_root` (default `/docs/context`).
- `doc_indexes_pattern` (default `00-INDEX.md`).
- `doc_types` — table mapping each type to its target directory and filename prefix.
- `doc_language` (default: ask the user when not specified).
- Frontmatter contract (mandatory fields).

### If `project-config.md` is absent — explicit user confirmation

| Probe | If found → infer |
| ----- | ---------------- |
| `/docs/rules/*AUTHORING*.md` exists | Use as `doc_rules`. |
| `/docs/00-GUIDELINES.md` exists | Use as `doc_rules`. |
| `/docs/reference/frontend/` exists | Apply PAGE/COMPONENT/HOOK convention there. |
| `/docs/reference/backend/` exists | Apply MODULE convention there. |
| `/docs/guides/` exists | Use for GUIDE type. |
| `/docs/context/` exists | Use for CONTEXT type. |
| `00-INDEX.md` files present in subfolders | Use that as the index pattern. |
| Existing `*.md` files in `/docs/reference/` | Sample one to infer frontmatter format and language. |
| Existing `*.md` files in `/docs/context/` | Sample one to infer context pack format and language. |
| No `/docs/` at all | Ask the user where docs should live. |

After detection, **display the detected configuration once** and confirm before writing if any required convention was inferred rather than read from `project-config.md`.

---

## PHASE 1 — Read the authoring rules

```text
Read mandatorily: <doc_rules>   (from project-config.md or detected after confirmation)
```

Typical content of this rules file (project-dependent):

- Product context.
- Layered documentation model.
- Canonical `/docs/` tree.
- Writing conventions.
- Mandatory frontmatter.
- Filename naming.
- New-file-vs-enrichment decision rule.
- Canonical skeleton.
- Type-specific sections.
- Code example format.
- Single source of truth principle.
- Forbidden anti-patterns.
- Pre-commit checklist.

If no such file exists, infer the rules from existing docs of the same type after explicit confirmation from the user. Read at least 2 existing examples when available.

For `CONTEXT` documents, also read existing files under `/docs/context/` if present.

---

## PHASE 2 — Decide: new file vs enrichment

Before creating a file, verify:

1. Does an existing file already host this topic?
2. Are the 3 criteria all met cumulatively:
   - Surface area > 80–100 lines of doc.
   - Distinct identity (not a subsection of another concept).
   - Reuse or criticality (referenced multiple times or business-critical).

If fewer than 2 criteria are met → **enrich an existing file**, do not create a new one.

### CONTEXT-specific decision rule

For `CONTEXT`, create or update a dedicated context pack only if the document is meant to be loaded independently at the start of future work.

A context pack is valid when it has a stable reusable scope, for example:

- maintenance workflow;
- data-processing pipeline;
- domain service architecture;
- recurring business workflow;
- deployment or operations context;
- project onboarding context.

Do not create a `CONTEXT` file for:

- a one-off task;
- a full transcript;
- a historical log;
- a large duplicate of existing documentation;
- a topic already covered by a more precise context pack.

If a matching context pack already exists, update it instead of creating another file.

---

## PHASE 3 — Read the source file

If `--source` is supplied:

- Read the source file in full.
- Identify: public exports, functions/components, props/signatures, dependencies, side effects, routes, endpoints, DB/FS interactions.
- Identify related files (tests, helpers, types).

For `CONTEXT`, source files are optional. When provided, use them only as grounding material. Do not turn the context pack into a source-file reference page.

---

## PHASE 4 — Determine target location & filename

Use the `doc_types` table from `project-config.md`. Generic default:

| Type | Default target | Default prefix |
| ---- | -------------- | -------------- |
| `PAGE` | `<doc_reference_root>/frontend/` | `PAGE-` |
| `COMPONENT` | `<doc_reference_root>/frontend/` | `COMPONENT-` |
| `HOOK` | `<doc_reference_root>/frontend/` | `HOOK-` |
| `MODULE` | `<doc_reference_root>/backend/` | `MODULE-` |
| `GUIDE` | `<doc_root>/guides/` | none, KEBAB-UPPER |
| `CONTEXT` | `<doc_root>/context/` | none, kebab-case |
| `API` | `<doc_reference_root>/API-ENDPOINTS.md` | single file, edit-in-place |
| `STORAGE` | `<doc_reference_root>/STORAGE.md` | single file, edit-in-place |

Filename pattern:

- `PAGE`, `COMPONENT`, `HOOK`, `MODULE`: `<PREFIX><KEBAB-UPPER>.md`, e.g. `PAGE-RUNS-REGISTRY.md`.
- `GUIDE`: `<KEBAB-UPPER>.md`, unless project-config defines another pattern.
- `CONTEXT`: `<kebab-case>.md`, e.g. `ai-maintenance-context.md`.
- `API` and `STORAGE`: edit the single target file in place.

---

## PHASE 5 — Generate frontmatter

Use the contract from `project-config.md`. Generic default:

```markdown
# <TYPE> — <Human-readable name>

**Phase**: <Phase N or campaign name>
**Status**: Active
**Last Updated**: <YYYY-MM-DD>
**Category**: <Backend Module | Frontend Page | Frontend Component | Frontend Hook | Storage | API | Guide | Context Pack>
**Rel. Spec**: [SPEC-*.md](...)   # optional, if applicable

---
```

For `CONTEXT`, use:

```markdown
# Context — <Human-readable name>

**Status**: Active
**Last Updated**: <YYYY-MM-DD>
**Category**: Context Pack
**Scope**: <maintenance | domain-workflow | data-pipeline | onboarding | operations>
**Load when**: <short condition>

---
```

If the project has a stricter frontmatter contract, use it instead.

---

## PHASE 6 — Generate the structure

### Common skeleton

```markdown
## Table of contents          # only if > 200 expected lines

## 1. Purpose & Context
## 2. Files involved
## 3. API / Public interface
## 4. Implementation
## 5. Tests
## 6. Links
```

### Type-specific sections

Override from `project-config.md` if defined.

- **PAGE**: Routes & Navigation, APIs consumed, State management, UI, States, Validation & Errors.
- **COMPONENT**: Props (TS signature), Variants, Child components, Use cases.
- **HOOK**: Signature, Lifecycle, Use cases.
- **MODULE**: Dependencies, Side effects, Concurrency, Performance, Storage interactions, Module interactions, Common errors.
- **GUIDE**: Overview, Prerequisites, Numbered steps, Verification & Tests, Common pitfalls.
- **CONTEXT**: Purpose, When to load, Source of truth, Key files, Current invariants, Common workflows, Validation commands, Known risks, Links.

### CONTEXT skeleton

Use this structure unless the project defines another one:

```markdown
## 1. Purpose
## 2. When to load this context
## 3. Source of truth
## 4. Key files and directories
## 5. Current invariants
## 6. Common workflows
## 7. Validation commands
## 8. Known risks
## 9. Links
```

For `CONTEXT`, keep the document concise and operational. It should help start a future task quickly without loading the entire repository.

---

## PHASE 7 — Write the content

Strict rules (universal — apply even without project-config):

- **Language**: as declared in `doc_language` (e.g. French, English). **Never mix languages** within the same document.
- **No TBD, no ellipses, no "à faire" / "TODO" markers.**
- **Every code example** must have:
  - **Location**: `path/file.py:123` (real line number).
  - Typed fenced block (` ```python `, ` ```ts `, etc.).
  - **Explanation** of the why/when.
- **No redundancy**: if an endpoint already exists in `API-ENDPOINTS.md`, **link to it**; do not duplicate.
- **No paraphrase of code**: copy real source code only when useful, do not invent.
- **Target length**: 80–300 lines. > 500 = split.
- **Markdown tables** for any list of parameters, props, states, files, commands, or invariants.
- **No decorative emojis** (status markers `✅` / `🚧` / `❌` are allowed only when the project already uses them).
- **No time estimates.**
- **No promotional or meta mention of AI / Claude / Copilot / automation.**

### CONTEXT-specific writing rules

For `CONTEXT` documents:

- Target length: 60–180 lines.
- Prefer compact tables over long prose.
- Include only information useful to resume future work.
- Include exact paths and commands when they are operationally useful.
- Do not include a transcript, a chronological history, or a narrative of how the context was created.
- Do not duplicate full content from `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, or reference docs. Link to them instead.
- If the context pack is explicitly about instruction or tooling maintenance, literal file paths and tool names may be mentioned when required for operation, but do not mention who generated the document or how it was produced.
- Include validation commands when the context describes a maintainable workflow.
- Include “Known risks” only when they are actionable.

---

## PHASE 8 — Update the corresponding `00-INDEX.md`

Depending on the target directory:

- `PAGE-*.md`, `COMPONENT-*.md`, `HOOK-*.md` → `<doc_reference_root>/frontend/00-INDEX.md`
- `MODULE-*.md` → `<doc_reference_root>/backend/00-INDEX.md`
- `CONTEXT` → `<doc_root>/context/00-INDEX.md` if present, otherwise create/update `<doc_root>/00-INDEX.md`
- New global category → `<doc_reference_root>/00-INDEX.md`

Add a row in the appropriate table with:

- Filename (linked).
- Phase or scope.
- Status (`✅ Active` by default if the project uses status markers; otherwise `Active`).
- 1-line description.

Bump the `Last Updated` field of the modified index.

For `CONTEXT`, use columns like:

```markdown
| File | Scope | Status | Load when |
|---|---|---|---|
| [ai-maintenance-context.md](ai-maintenance-context.md) | maintenance | Active | Editing instruction, skill, rule, sync, inventory, or quality-audit files. |
```

---

## PHASE 9 — Cross-references (anti-redundancy)

If the file being authored concerns:

- An **HTTP endpoint** → add it to `<doc_reference_root>/API-ENDPOINTS.md` (single source). In the parent `MODULE-*.md`, **link** via anchor.
- A **storage table or `${DATA_DIR}` folder** → add it to `<doc_reference_root>/STORAGE.md` (single source). In the parent `MODULE-*.md`, **link** via anchor.
- A **context pack** → link to canonical architecture, project configuration, and relevant reference docs instead of duplicating them.

For `CONTEXT`, prefer links to:

- `README.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/project-config.md`
- relevant `docs/reference/*`
- relevant `docs/context/*`

Only include details inline when they are needed to choose the correct next action.

---

## PHASE 10 — Pre-write checklist

Verify each point:

```text
- [ ] Frontmatter complete
- [ ] ToC if > 200 lines
- [ ] All code examples have Location + Explanation
- [ ] No TBD / TODO / "à faire"
- [ ] Internal links valid
- [ ] Self-contained
- [ ] Consistent format
- [ ] Reconstruction-ready (a reader unfamiliar with the project can use it)
- [ ] Last Updated = today
- [ ] 00-INDEX.md updated if new file
- [ ] No duplicated facts
- [ ] No language mixing
- [ ] No decorative emojis
```

For `CONTEXT`, also verify:

```text
- [ ] Purpose is clear
- [ ] Load condition is explicit
- [ ] Key files are listed with paths
- [ ] Current invariants are listed
- [ ] Validation commands are executable
- [ ] Known risks are actionable
- [ ] No transcript or historical narrative
- [ ] Links point to source-of-truth docs instead of duplicating them
```

If any box cannot be ticked → fix before writing.

---

## PHASE 11 — Create / modify the file

Use the file-editing tool to:

1. Create the new `.md` file (or enrich the existing file if the decision rule said so).
2. Update the corresponding `00-INDEX.md`.
3. If applicable, update `API-ENDPOINTS.md` or `STORAGE.md`.

For `CONTEXT`:

1. Create or update `<doc_root>/context/<name>.md`.
2. Create or update `<doc_root>/context/00-INDEX.md` if the project uses context-specific indexes.
3. Otherwise update `<doc_root>/00-INDEX.md`.
4. Do not update `API-ENDPOINTS.md` or `STORAGE.md` unless the context pack exposes a missing single source of truth problem that must be fixed separately.

---

## PHASE 12 — Confirmation

Display:

```text
✓ Created  : <doc_reference_root>/<dir>/<TYPE>-<NAME>.md
✓ Updated  : <doc_reference_root>/<dir>/00-INDEX.md
✓ Updated  : <doc_reference_root>/API-ENDPOINTS.md   (if applicable)
✓ Updated  : <doc_reference_root>/STORAGE.md         (if applicable)

Frontmatter:
  Phase: <phase>
  Status: Active
  Last Updated: <date>
  Category: <category>

Sections written:
  - Purpose & Context
  - Files involved
  - <…>

Checklist:
  ✓ Frontmatter complete
  ✓ Examples with Location
  ✓ Valid links
  ✓ No redundancy
```

For `CONTEXT`, display:

```text
✓ Created/Updated : <doc_root>/context/<name>.md
✓ Created/Updated : <doc_root>/context/00-INDEX.md   (if applicable)

Context:
  Scope: <scope>
  Load when: <condition>
  Last Updated: <date>

Sections written:
  - Purpose
  - When to load this context
  - Source of truth
  - Key files and directories
  - Current invariants
  - Common workflows
  - Validation commands
  - Known risks
  - Links

Checklist:
  ✓ Purpose is clear
  ✓ Load condition is explicit
  ✓ Validation commands are present
  ✓ No transcript dump
  ✓ Links point to source-of-truth docs
```

---

## Strict rules (summary)

### The command MUST

- Read `project-config.md` before each generation. If it is absent or incomplete, ask the user for the missing convention instead of inferring silently.
- Read the authoring rules file (`doc_rules`) if it exists.
- Respect the frontmatter contract exactly.
- Use the correct filename prefix and target directory.
- Include the mandatory common sections + type-specific sections.
- Use the `CONTEXT` structure for reusable project context packs.
- Indicate `**Location**: path/file.py:123` on every code example.
- Update the corresponding `00-INDEX.md`.
- Maintain single source of truth (endpoints → `API-ENDPOINTS.md`, storage → `STORAGE.md`).
- Keep context packs concise, reusable, and action-oriented.

### The command MUST NEVER

- Write in a language that conflicts with `doc_language`.
- Leave `TBD`, `à faire`, `voir le code`, `dépend du contexte`.
- Copy source code without explaining the why.
- Document the same endpoint or table in multiple files.
- Invent functions / props / endpoints not present in the source code.
- Include time estimates.
- Mention Claude / Copilot / AI / automation in product documentation unless the target is an explicit maintenance context where literal paths or tool names are required.
- Use decorative emojis (status `✅` / `🚧` / `❌` allowed only when the project already uses them).
- Create a file without complete frontmatter.
- Create a file for a component used once and < 50 lines (enrich the parent instead).
- Document a feature before it ships (= `/docs/specs/`, not `/docs/reference/`).
- Create a context pack as a long transcript dump.
- Duplicate complete architecture or reference documentation inside a context pack.

---

## Output format

All generated files are **standard Markdown** (`.md`), GitHub-compatible.

No HTML, no Mermaid (unless the project already uses it), no proprietary syntax.

---

**Always honor `project-config.md` and the project's `doc_rules` file. No deviation allowed.**
