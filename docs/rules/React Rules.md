# Règles React — Performance & patterns

## Conception (performance-first)
- Identifier dès la conception : **ce qui doit être interactif**, **ce qui peut être server-rendered**, et **où sont les goulots** (liste longue, calcul lourd, re-renders, requêtes lentes).
- Prévoir un plan de **stabilisation des props** (éviter de recréer objets/fonctions à chaque render si cela déclenche des cascades).

## Mémoïsation (à utiliser avec discernement)
- `React.memo` :
  - utile pour composants rendus fréquemment et props stables.
  - éviter si le composant est simple ou si les props changent constamment.
- `useMemo` :
  - réserver aux calculs coûteux ou structures dérivées volumineuses.
- `useCallback` :
  - stabiliser les callbacks passés aux enfants (et/ou dans deps).
- Toujours vérifier les dépendances de hooks : pas de dépendances instables involontaires.

## Suspense & boundaries
- Utiliser `<Suspense>` pour découper l’UI et éviter de bloquer l’ensemble du rendu.
- Utiliser des Error Boundaries :
  - via `error.tsx` côté Next App Router (prioritaire),
  - ou boundaries React locales sur des zones très risquées (widgets isolés).

## Listes & gros volumes
- Pagination par défaut.
- Virtualisation si la liste dépasse un seuil significatif.
- Clés (`key`) stables et sémantiques (pas d’index si l’ordre peut changer).

## Mutations optimistes
- Utiliser `useOptimistic` pour feedback immédiat (likes, toggles, todo), en prévoyant rollback/erreur.
- Conserver une source de vérité serveur (réconciliation après réponse).

## Rendu & logique
- Éviter calculs lourds dans le render.
- Préférer composants “présentationnels” quand possible ; isoler les effets et la logique.

## Checklist rapide
- [ ] Re-renders inutiles évités (props stables, mémoïsation pertinente)
- [ ] Pagination/virtualisation pour longues listes
- [ ] Suspense utilisé pour zones lentes
- [ ] Error boundaries en place sur zones critiques
- [ ] Optimistic UI seulement si rollback géré
