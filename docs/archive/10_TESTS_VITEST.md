# Tests — Vitest (unitaires + intégration)

## Objectif
Sécuriser la logique de tri, les transitions de statut, et les endpoints principaux.

## Unit tests (lib/server)
- `matchTerm(text, term)` (case-insensitive, normalisation)
- `classifyJob(input, settings)` => { category, matchedKeyword }
- `bulkCleanVisited(jobs, visitedIds)` => jobs modifiés

## Integration tests (API)
- `/api/ingest/webhook`:
  - rejette si secret invalide
  - classe correctement blacklist/whitelist/default
- `/api/jobs`:
  - filtre par status/category
- `/api/jobs/:id` patch:
  - update status
- `/api/settings`:
  - get + patch

## Conventions
- Tests rapides, pas de dépendance réseau
- Mongo:
  - option A: mongo-memory-server
  - option B: DB dédiée “test” via env
Recommandation: mongo-memory-server pour intégration.
