# Règles de Construction de la Documentation

Ce document consolide les standards pour la création et la maintenance de la documentation dans ce projet. L'objectif est de garantir une documentation **"Reconstructible"** : on doit pouvoir recréer l'application sans lire le code, uniquement avec la documentation.

## 1. Philosophie & Principes

- **Langue** : Français uniquement.
- **Source de Vérité** : Le code est la vérité, la documentation de référence (`docs/reference/`) en est le reflet exact.
- **Pas de "TBD"** : Aucune zone d'ombre. Si une info manque, on cherche dans le code, on ne met pas "À faire".
- **Déterminisme** : Les exemples de code et les signatures de fonctions doivent être des copies exactes du codebase.

## 2. Structure des Dossiers

L'organisation est stricte pour permettre l'automatisation :

- `/docs/initial-doc/` : **Specs (Immuable)**. Ce qu'on *veut* faire. Ne change pas une fois validé.
- `/docs/reference/` : **Implémentation (Vivant)**. Ce qui *est* fait. Mis à jour par le hook `/commit`.
  - `frontend/` : Pages (`PAGE-*.md`) et Composants (`COMPONENT-*.md`).
  - `backend/` : Modules Python (`MODULE-*.md`).
  - `API-ENDPOINTS.md` : Contrat d'interface complet.
- `/docs/guides/` : **Tutoriels**. Comment faire (ex: ajouter un test, optimiser).
- `/docs/audits/` : **Rapports**. Vérifications ponctuelles, audits de performance.

## 3. Conventions de Nommage

### Frontend
- **Pages** : `PAGE-{NOM_PAGE_EN_MAJUSCULES}.md` (ex: `PAGE-RUNS-REGISTRY.md`)
- **Composants** : `COMPONENT-{NOM_COMPOSANT}.md` (ex: `COMPONENT-SETTINGS-MODAL.md`)

### Backend
- **Modules** : `MODULE-{NOM_MODULE}.md` (ex: `MODULE-WORKER.md`)

## 4. Format Obligatoire (Markdown)

### Frontmatter
Tout fichier de référence DOIT commencer par ce bloc :

```markdown
# {TITRE DU DOCUMENT}

**Phase**: {Numéro de Phase}
**Status**: {Active | Draft | Archived}
**Last Updated**: YYYY-MM-DD
**Category**: {Frontend Page | Backend Module | API | ...}
**Rel. Spec**: [SPEC-LIEE.md](/docs/initial-doc/SPEC-LIEE.md)

---
```

### Table des Matières
Obligatoire si le fichier dépasse 300 lignes.

### Exemples de Code
Interdit de paraphraser le code. Il faut copier le code réel et indiquer sa source.

```markdown
**Location** : `/backend/app/mon_fichier.py:42`
```python
def ma_fonction():
    # ... code réel ...
```
**Explication** : Pourquoi cette logique...
```

## 5. Contenu Standardisé par Type

### Pour une Page Frontend
1. **Objectif** : À quoi ça sert.
2. **Fichiers** : Liste exhaustive (Page, Composants, Tests).
3. **Routes** : URL et paramètres.
4. **Composants** : Props, États, Événements.
5. **API** : Endpoints appelés.
6. **Tests** : Scénarios couverts.

### Pour un Module Backend
1. **Périmètre** : Responsabilités.
2. **Architecture** : Classes, Attributs, Méthodes publiques (signatures exactes).
3. **Détails** : Patterns (Retry, Atomic Write).
4. **Stockage** : Tables SQL touchées, Fichiers manipulés.
5. **Tests** : Couverture unitaire.

## 6. Cycle de Vie

1. **Draft** : Création initiale pendant le dév.
2. **Active** : Feature mergée et testée. C'est l'état normal.
3. **Archived** : Feature supprimée. Ajouter un lien vers le nouveau module.

## 7. Automatisation
Le hook `/commit` met à jour automatiquement la date `Last Updated` et suggère les modifications. Ne jamais modifier manuellement la date sans vérifier le contenu.

```