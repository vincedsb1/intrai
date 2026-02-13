# Conventions dev

## TypeScript
- Strict true
- Types partagés: `Job`, `Settings`, `AIAnalysis`

## Naming
- Components: PascalCase
- Server functions: camelCase
- Constants: UPPER_SNAKE

## UI
- Pas de “design inventé” : suivre la maquette
- Composants petits, lisibles, réutilisables

## Performance & UX
- **Navigation** : Utiliser exclusivement `<Link />` de `next/link` pour le prefetching.
- **Images** : Utiliser exclusivement `<Image />` de `next/image` avec dimensions définies ou `fill`.
- **Rendu** : Favoriser les **Server Components** par défaut. Utiliser `loading.tsx` et `<Suspense />` pour le streaming.
- **Caching** : Utiliser `revalidatePath` pour rafraîchir les données et explorer `"use cache"` (Next 15) pour les fonctions lourdes.
- **Optimisation React** : Utiliser `useMemo` pour les calculs coûteux et `React.lazy` (ou `next/dynamic`) pour le fractionnement du code (code splitting).

## Data access
- `lib/mongo.ts`: singleton connection (éviter reconnect)
- `server/jobs.service.ts`: logique métier DB
- `server/settings.service.ts`: règles

## Erreurs
- API: réponses JSON standard `{ error: { code, message } }`
- UI: affichage minimal (inline)
