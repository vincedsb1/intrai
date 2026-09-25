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
- Tests unitaires : remplacer le pool PostgreSQL et le client IA par des doubles contrôlés.
- Intégration PostgreSQL : exécuter contre une instance locale jetable avec le schéma validé ; le harnais refuse toute cible non locale et n’utilise pas une URL héritée.
- Ne jamais utiliser Production pour les tests. Ne pas appeler de fournisseur IA ni utiliser de réseau externe dans la suite.
- Vérifications de livraison : `npm run lint`, `npm test -- --run`, `npx tsc --noEmit` et `npm run build`.
