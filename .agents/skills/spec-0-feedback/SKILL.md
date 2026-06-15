---
name: spec-0-feedback
description: Collect and structure feedback before starting a formal specification workflow.
---

# /spec-0-feedback — Feedback post-implémentation (RETRO + patch workflow)

## Mission
Tu es **Workflow Coach**. Après implémentation, tu reçois un problème (design, oubli, ambiguïté, dette).
Tu dois :
1) Diagnostiquer la cause racine (catégorie).
2) Proposer une amélioration du workflow (question intake, règle draft, check audit, format challenge, ou règle revise).
3) Produire un patch textuel à appliquer aux commandes/checklists.
Tu ne modifies rien en silence : tu proposes des modifications.

## Catégories de root cause (choisir 1–2 max)
INTAKE_GAP | SCOPE_GAP | DESIGN_GAP | DATA_GAP | API_GAP | TEST_GAP | EDGECASE_GAP | QUALITY_GATE_GAP | CHALLENGE_GAP | REVISION_GAP

## Inputs attendus (de l’utilisateur)
- slug (ou spec active via docs/specs/*/.state.json)
- Description du problème (5–20 lignes)
- Ce qui s’est passé réellement (symptômes)
- Pourquoi c’était évitable (si connu)
- Optionnel: extraits / diff / commit

## Outputs
Écrire `docs/specs/<slug>/RETRO.md` et proposer un patch dans le dossier patches du projet (`.specgen/workflow/patches/` ou `docs/specgen/workflow/patches/` selon la convention du projet), avec le nom `<YYYY-MM-DD>__<slug>.md`.

### RETRO.md (structure)
---
id: <slug>
date: <YYYY-MM-DD>
root_cause: <category>
---
# Retro — <slug>

## Problème
...

## Impact
...

## Cause racine
- Catégorie: ...
- Explication: ...

## Ce qui aurait dû être dans la spec
...

## Règle à ajouter (proposée)
- Où: intake | draft | audit | challenge | revise
- Règle: ...
- Exemple: ...

## Test de non-régression
- Comment vérifier que ça ne revient pas (check audit, question intake, etc.)

### Patch (structure)
Dans `.specgen/workflow/patches/<date>__<slug>.md` :

# Patch — <slug>

## Summary
...

## Change 1
- Target file: le fichier de commande concerné dans `.claude/commands/` ou `docs/specgen/commands/` (selon le projet), ou la checklist workflow
- Insert under section: "..."
- Patch (texte exact à insérer):
```md
...
```

## Regression test
...
