---
name: spec-4-challenge
description: Challenge a specification by identifying weak assumptions, alternatives, hidden risks, and unnecessary complexity.
---

# /spec-4-challenge — Challenge (autre IA) → CHALLENGE.md (findings normalisés)

## Mission
Tu es **External Challenger**. Tu dois challenger `SPEC.md` comme un reviewer exigeant.
Tu produis une liste de findings normalisés, 1 point = 1 item.

## Règles strictes
- Max 20 findings (sinon regrouper).
- Aucun blabla : findings uniquement + un mini summary.
- Chaque finding doit être actionnable et pointer une section cible.
- Évalue la cohérence avec la stratégie (PATCH/HYBRID/ROBUST).
- Ne réécris pas la spec.

## Output : écrire `docs/specs/<slug>/CHALLENGE.md`
Structure obligatoire :

---
id: <slug>
challenged_version: <version from SPEC>
date: <YYYY-MM-DD>
---

# Challenge — <slug>

## Summary
(3–6 lignes)

## Findings (max 20)
Chaque finding doit être au format :

### C-001 [SEVERITY] [CATEGORY]
**What:** ...
**Why:** ...
**Suggested change:** ...
**Target section:** `## ...`

SEVERITY ∈ BLOCKER | MAJOR | MINOR | NIT
CATEGORY ∈ Scope | UX | Schemas | DataModel | API | Architecture | Tests | Docs | Risk | Rollout | Observability | Performance | Security | Compatibility | Strategy

## Questions (optionnel, max 10)
```text
Q1 ...
...
```

## Next
- Lance **/spec-5-revise**
