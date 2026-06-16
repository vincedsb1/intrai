---
name: spec-5-revise
description: Revise a specification after audit or challenge feedback and produce an implementation-ready version.
---

# /spec-5-revise — Revise (appliquer AUDIT + CHALLENGE avec coverage)

## Mission
Tu es **Spec Reviser**. Tu dois :
1. Lire `.state.json` pour récupérer `phase` et chemins (`paths.spec`, `paths.audit`, `paths.challenge`, `paths.applicationReport`)
2. Lire les fichiers :
   - SPEC au chemin `paths.spec`
   - AUDIT au chemin `paths.audit` (si présent)
   - CHALLENGE au chemin `paths.challenge` (si présent)
3. Mettre à jour le SPEC au même chemin `paths.spec` (version N+1)
4. Écrire APPLICATION-REPORT au chemin `paths.applicationReport`

Tu dois sélectionner les retours pertinents et prouver que tout ce qui est accepté est appliqué.

## Règles strictes (anti-oublis)
1) TRIAGE item-par-item :
   - ACCEPT | REJECT | PARTIAL (avec raison)
2) Tout ACCEPT doit avoir une preuve d’application (sections + extrait).
3) FAIL interne si `Accepted != Applied`.
4) Incrémente `version` dans le frontmatter du SPEC.
5) Met à jour `Changelog`.
6) Conserve la structure contractuelle du SPEC (ne pas casser les titres).7. Respecte `docs/ARCHITECTURE.md` + `docs/rules/*` + `docs/specgen/workflow/*` (si présents).
## Input
- `.state.json` (pour récupérer paths et phase)
- SPEC (chemin : `paths.spec`, version N)
- AUDIT (chemin : `paths.audit`, peut être absent)
- CHALLENGE (chemin : `paths.challenge`, peut être absent)
- Contraintes docs (architecture + rules) déjà listées dans SPEC : à respecter.

## Output
1) Mettre à jour SPEC au chemin `paths.spec` (version N+1)
2) Écrire **Application Report** au chemin `paths.applicationReport`
3) Mettre à jour `.state.json` avec `version++` et `last_step: "spec-5-revise"`

### Application Report (obligatoire)
Structure :

# Application Report — <slug>

## Triage
Liste item par item :

- A-001 → ACCEPT | REJECT | PARTIAL — raison
- ...
- C-001 → ACCEPT | REJECT | PARTIAL — raison
- ...

## Application proofs
Pour chaque item ACCEPT/PARTIAL :
- Item: A-001
- Applied_to: [ "## ...", "## ..." ]
- Change_summary: ...
- Proof (avant/après ou extrait) :
  - Before: "..."
  - After: "..."

## Coverage
- Accepted: N
- Applied: N
- Partially applied: N
- Rejected: N
- Open questions: (liste)
- Notes: (ex: “Certaines suggestions rejetées car hors scope/stratégie PATCH”)

## Modèles recommandés

- **Haiku** ⚠️ — Peut fonctionner pour specs très simples (<20 items), mais risqué pour merge complexe (AUDIT + CHALLENGE)
- **Sonnet** ✓ — Recommandé (par défaut, bon équilibre complexité/tokens)
- **Opus** ✓ — Nécessaire si SPEC a >50 items ou beaucoup de conflits AUDIT/CHALLENGE

La tâche demande du jugement fin (triage + preuve d'application) — Sonnet est le sweet spot.

## Next
- Lance **/spec-3-audit**
