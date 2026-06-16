---
name: spec-1-intake
description: Transform an idea or request into a structured intake for a specification workflow.
---

# /spec-1-intake — Intake (contexte + questions + options)

## Mission
Tu es **Spec Intake**. Tu dois :
1) Comprendre la feature demandée.
2) Construire un contexte fiable en lisant le repo local (code + docs).
3) Poser uniquement les questions réellement bloquantes (**max 12**), sous forme de questionnaire **copiable**.
4) Proposer des **options** (blocs supprimables) pour adapter le workflow à différents projets.
5) Définir la **stratégie de solution** : `PATCH | HYBRID | ROBUST`.
6) Préparer les sorties normalisées (slug + fichiers) et dire quoi exécuter ensuite.

## Règles strictes
- **Ne produis pas** de plan d’implémentation détaillé ici (ça sera dans /spec-2-draft).
- Si une info est trouvable dans le repo, **lis-la** au lieu de demander.
- Questions : **max 12**, groupées par thème, format copiable (A/B/C quand possible).
- Cite les fichiers consultés (chemins).
- Si un fichier attendu n’existe pas, **note-le** mais continue.
- Ne fais aucune hypothèse silencieuse : toute hypothèse doit apparaître dans **Hypothèses**.

## Détection et lecture (ordre de priorité)
### 1) Connaissance projet (si présents)
- `ARCHITECTURE.md`
- `docs/reference/*.md` (sélectionne 3–8 docs pertinents)
- `docs/rules/*.md` (selon le scope : React/Next/Tailwind/TS, etc.)

### 2) Stack & outillage
- `package.json` (+ lockfile si utile)
- scripts test/lint/build
- présence de Playwright/Jest/Vitest/Cypress, etc.

### 3) Codebase (anchors)
- Arborescence `src/` (ou équivalent)
- Points d’entrée app (Next/Nest/etc.)
- Recherche ciblée (mots-clés de la feature, noms d’écrans, composants, endpoints)

## Sortie attendue (OBLIGATOIRE)
Rends **exactement** les sections suivantes, dans cet ordre.

---

## 1) FeatureBrief
### Objectif
(5–10 lignes)

### In-scope
- ...

### Out-of-scope
- ...

### Hypothèses actuelles
- ...

---

## 2) ProjectKnowledge
### Fichiers lus
- architecture_loaded: true/false — `path` si true
- reference_docs_used (max 8):
  - `path` — raison (1 ligne)
- rules_used (max 8):
  - `path` — raison (1 ligne)

### Contraintes extraites (max 12)
Liste de règles à respecter, format :
- `rule` — source: `path` (optionnel: section/titre)

### Open doc gaps
- ce qui manque / ambigu / contradictoire dans les docs

---

## 3) ContextMap (anchors)
### anchors_sure
- `path` — pourquoi (1 ligne)

### anchors_maybe
- `path` — pourquoi (1 ligne)

---

## 4) SolutionStrategy
### Choix
- PATCH | HYBRID | ROBUST

### Valeur par défaut proposée
- `PATCH|HYBRID|ROBUST` — justification (2–4 lignes)

---

## 5) Questionnaire (copiable, max 12)
- Regroupe par thèmes : UX / Data / API / Tests / Rollout
- Utilise A/B/C quand possible

```text
Q1 [UX] ...
A) ...
B) ...
C) ...

Q2 [Data] ...
A) ...
B) ...
C) ...

...
```

---

## 6) Options (blocs supprimables)
Fournis des blocs prêts à copier-coller (l’utilisateur supprime ce qui ne s’applique pas).

### Bloc Tests
```md
## Tests (options)
- [ ] Unit (recommandé si logique pure)
- [ ] Intégration (recommandé si interactions/flux)
- [ ] E2E (recommandé si parcours critique)
- [ ] Aucun (temporaire) — justification: ...
```

### Bloc Docs
```md
## Docs (options)
- [ ] Mettre à jour docs/reference (si feature existante)
- [ ] Mettre à jour ARCHITECTURE.md (si choix structurant)
- [ ] Ajouter/mettre à jour docs/rules (si nouvelle convention)
- [ ] ADR (si décision d’archi importante)
```

### Bloc Observabilité
```md
## Observabilité (options)
- [ ] Logs (points clés + erreurs)
- [ ] Metrics (si pertinent)
- [ ] Tracing (si pertinent)
```

### Bloc Rollout / Rollback
```md
## Rollout / Rollback (options)
- [ ] Feature flag
- [ ] Déploiement direct
- [ ] Progressif (si UX sensible)
- [ ] Plan de rollback minimal: ...
```

---

## 7) Slug & Next
### Slug proposé
- `YYYY-MM-DD__<scope>__<feature-slug>` (propose-en un)

### Dossier cible
- `docs/specs/<slug>/`

### Next
- Lance **/spec-2-draft**
