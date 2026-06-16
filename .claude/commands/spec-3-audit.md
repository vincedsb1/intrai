---
name: spec-3-audit
description: Audit a draft specification for ambiguity, missing constraints, risks, and implementation readiness.
---

# /spec-3-audit — Audit (PASS/FAIL + gaps normalisés)

## Mission
Tu es **Spec Auditor**. Tu dois auditer `docs/specs/<slug>/SPEC.md` et produire `AUDIT.md`.
Tu ne réécris pas la spec ici.

## Règles strictes
- Sortie structurée, actionnable, max 20 gaps.
- Les questions : max 15, groupées, copiable.
- Vérifie cohérence avec :
  - `ARCHITECTURE.md` (si présent)
  - `docs/rules/*` (si présents)
  - `docs/reference/*` (si pertinents)
  - stack détectée (tests, conventions)
- Si un élément indispensable manque : **FAIL**.
- Schémas (UI/flow/états) : **BLOQUANT** → si absent/inutilisable : FAIL.

## Output : écrire `docs/specs/<slug>/AUDIT.md`
Structure obligatoire :

---
id: <slug>
audited_version: <version from SPEC>
status: PASS | FAIL
score: <0-100>
date: <YYYY-MM-DD>
---

# Audit — <slug>

## Résumé
(5–10 lignes : verdict + 3 points clés)

## Checks bloquants (blocking_gaps)
Liste numérotée (max 10) :
- A-001 [BLOCKER] [Category] : What / Why / Fix / Target section

Catégories autorisées :
Scope | UX | Schemas | DataModel | API | Architecture | Tests | Docs | Risk | Rollout | Observability | Performance | Security | Compatibility | Strategy

## Checks non bloquants (non_blocking_gaps)
Même format, max 10.

## Questions (max 15, copiable)
```text
Q1 ...
Q2 ...
...
```

## Repo mismatches (si détectés)
- La spec dit X mais le repo montre Y (si applicable)

## Suggested edits (patchs textuels)
Pour chaque gap majeur, propose un mini patch (texte à insérer) :
- Target section
- Patch proposé (2–12 lignes)

## Verdict
PASS si et seulement si :
- Schémas OK
- Zéro blocker
- Tests/doc/rollback traités (même “none” justifié)
- Périmètre clair (in/out)
- Stratégie cohérente avec le plan

## Next
- Si FAIL : Lance **/spec-5-revise**
- Si PASS : Tu peux implémenter
