---
id: 2026-06-15__inbox__server-pagination
challenged_version: 2
date: 2026-06-15
---

# Challenge — 2026-06-15__inbox__server-pagination

## Summary

La spec v2 est solide sur les aspects de pagination et de correction des bugs de l'audit précédent. Cependant, trois lacunes silencieuses introduisent des régressions UX ou des bugs subtils qui ne sont pas traités : le dropdown pays ne respecte plus les filtres actifs, le `visitedCount` utilise une variable (`baseInboxJobs`) supprimée par la spec sans indiquer le remplacement, et une race condition entre `handleVisit` et `router.refresh()` peut effacer temporairement les marqueurs "vu" non encore persistés. Cinq findings mineurs complètent l'analyse : navigation avec historique non justifiée, requête DB redondante sur chaque changement de page, limite `q`/`limit` non gardée, redondance `useState`+`useEffect`, et CSS dark mode incomplet.

---

## Findings (max 20)

### C-001 [MAJOR] [UX]
**What:** `getAvailableCountries({ status: "INBOX" })` retourne TOUS les pays de l'inbox, sans tenir compte des filtres actifs (`mode`, `q`, etc.). Auparavant, le dropdown pays était calculé depuis `baseInboxJobs` (déjà filtrée côté client), donc ne montrait que les pays des offres matchant les filtres en cours.
**Why:** Exemple : l'utilisateur filtre `mode=remote`. La liste de 20 offres ne contient que des jobs remote. Mais le dropdown pays affiche "France, Espagne, Allemagne, UK" — tous les pays de l'inbox complet. Cliquer "Espagne" retourne 0 résultats (aucun job remote en Espagne), sans avertissement. C'est une régression par rapport au comportement actuel où le dropdown ne proposait que les pays réellement disponibles après filtrage.
**Suggested change:** Passer les filtres actifs à `getAvailableCountries()` : `getAvailableCountries({ status: "INBOX", workMode, q })` et adapter la fonction pour les appliquer en DB. Ou afficher une note "(N résultats)" à côté de chaque pays dans le dropdown si le coût DB est jugé trop élevé.
**Target section:** `## Étape 1`, `## Étape 4`, `## Architecture / Data flow`

---

### C-002 [MAJOR] [Architecture]
**What:** Le spec supprime `baseInboxJobs` (§Étape 6 "Suppressions") mais ne précise pas le remplacement de `visitedCount` qui l'utilise actuellement (`const visitedCount = baseInboxJobs.filter((j) => visitedIds.has(j.id)).length`). Le composant `InboxView.tsx:165` calcule `visitedCount` depuis `baseInboxJobs` pour déclencher le BulkClean Toast. Sans cette variable, `visitedCount` est `undefined` → le toast ne s'affiche jamais.
**Why:** `visitedCount` contrôle l'affichage du toast "N offres visitées / Nettoyer". Si la spec est appliquée sans remplacement explicite, le toast est cassé silencieusement.
**Suggested change:** Ajouter dans §Étape 6/Suppressions : "Remplacer `baseInboxJobs.filter(...)` par `jobs.filter((j) => visitedIds.has(j.id)).length` pour `visitedCount`. `jobs` correspond aux items retournés par la page courante." Ou utiliser `inboxJobs` (la liste filtrée optimistic).
**Target section:** `## Étape 6`

---

### C-003 [MAJOR] [UX]
**What:** Race condition entre `handleVisit` (optimiste, ajoute à `visitedIds`) et `router.refresh()` (via Undo / future: auto-refresh si count change). Le `useEffect([initialJobs])` ajouté reconstruit `visitedIds` depuis `initialJobs.visitedAt`. Si `router.refresh()` est déclenché avant que l'API `/api/jobs/:id/visit` ait persisté `visitedAt` en DB, le job revient dans `initialJobs` sans `visitedAt` → le marqueur "vu" disparaît de l'UI pendant quelques instants.
**Why:** Le cas Undo est réaliste : l'utilisateur visite job A, puis trache job B immédiatement, puis Undo → `router.refresh()` se déclenche (Étape 6, `handleUndoTrash`) → si l'API visit n'est pas complétée, job A perd son marqueur.
**Suggested change:** Après l'appel `router.refresh()` dans `handleUndoTrash`, re-appliquer les visitedIds localement depuis l'état courant avant le refresh (capturer `visitedIds` avant l'appel, puis merger avec le `initialJobs` après rechargement via `useEffect`). Ou documenter cette limitation comme risque accepté.
**Target section:** `## Étape 6 (handleUndoTrash)`, `## Risques & mitigations`

---

### C-004 [MINOR] [Architecture]
**What:** `useState` initializer + `useEffect([initialJobs])` coexistent. La spec dit "l'initializer peut rester pour le premier render" — mais en pratique, sur le premier render, l'initializer ET le useEffect s'exécutent, produisant deux setState successifs pour le même résultat. Redondance sans bénéfice qui peut perturber les futurs développeurs.
**Why:** Le pattern correct est soit (a) supprimer le corps de l'initializer → `useState(new Set<string>())` et laisser le useEffect tout gérer (incluant le premier render), soit (b) garder seulement l'initializer et ne pas ajouter le useEffect. Option (a) est plus cohérente avec la solution choisie.
**Suggested change:** Modifier §Étape 6 : "Remplacer l'initializer `useState(() => { initialJobs.forEach... })` par `useState(new Set<string>())` — le useEffect ci-dessous prend en charge le premier render et tous les suivants."
**Target section:** `## Étape 6 / Ajouts`

---

### C-005 [MINOR] [UX]
**What:** `router.push` est utilisé pour `handlePageChange`, ajoutant chaque changement de page à l'historique du navigateur. L'utilisateur qui navigue 1→2→3→4 puis appuie sur "Back" traverse 3 pages de pagination avant de quitter la vue `/inbox`.
**Why:** Ce comportement est courant sur les sites marchands (pagination bookmarkable) mais inhabituel sur une app de gestion de flux. Le `router.replace` serait plus adapté (remplace l'entrée courante sans empiler l'historique), cohérent avec ce que font les filtres.
**Suggested change:** Justifier explicitement le choix `push` vs `replace` dans §Architecture, ou changer pour `router.replace` dans `handlePageChange` si la bookmarkabilité des pages n'est pas un objectif.
**Target section:** `## Étape 6 / handlePageChange`, `## Architecture / Data flow`

---

### C-006 [MINOR] [Performance]
**What:** `getAvailableCountries({ status: "INBOX" })` est appelé dans `InboxPage` à CHAQUE rendu serveur — y compris lors d'un simple changement de page (`?page=2`). Les pays disponibles ne changent pas entre la page 1 et la page 2 du même inbox. C'est une requête DB `distinct()` inutile sur chaque navigation paginée.
**Why:** Pour un usage perso avec < 1000 jobs, l'impact est négligeable. Mais c'est une inefficacité structurelle. 
**Suggested change:** Option A : utiliser Next.js `"use cache"` sur `getAvailableCountries` (mentionné dans les rules Next.js). Option B : intégrer `availableCountries` dans le retour enrichi de `getJobs` (un seul `withMongo` call). Option C : accepter l'inefficacité (annotée dans §Performance).
**Target section:** `## Architecture / Performance`, `## Étape 1`

---

### C-007 [MINOR] [Security]
**What:** Le paramètre `q` (recherche) n'a pas de limite de longueur. Un `?q=<10000 chars>` génère une regex complexe appliquée sur tous les documents de l'inbox. Même si la regex est correctement escapée (✓), l'évaluation MongoDB peut être lente sur une longue chaîne.
**Why:** Risque faible pour un usage perso, mais le pattern de la spec devrait documenter la limite (ou ajouter un guard : `filters.q.trim().slice(0, 200)`).
**Suggested change:** Ajouter dans §Étape 1 : tronquer `q` à 200 caractères avant d'en construire la regex. Documenter dans §Risques.
**Target section:** `## Étape 1`, `## Risques & mitigations`

---

### C-008 [MINOR] [API]
**What:** Le paramètre `limit` est exposé dans l'API (`GET /api/jobs?limit=...`) sans validation de maximum. Un appelant externe (ou accidentel) peut envoyer `?limit=100000` et déclencher une requête MongoDB retournant des milliers de jobs.
**Why:** `getJobs` ne plafonne pas `limit`. L'Étape 2 (route.ts) ne valide que `isNaN` mais pas de maximum.
**Suggested change:** Ajouter dans §Étape 2 : `const limit = Math.min(isNaN(rawLimit) ? 20 : Math.max(1, rawLimit), 100);` — cap à 100.
**Target section:** `## Étape 2`

---

### C-009 [MINOR] [Architecture]
**What:** L'Étape 4bis (DesktopHeader) ajoute `pathname` aux dépendances du `useEffect` (`[debouncedSearchQuery, router, searchParams, pathname]`). `pathname` change à chaque navigation (ex: `/inbox` → `/processed`). Le useEffect se déclenchera inutilement sur tout changement de route, pas seulement sur les changements de recherche.
**Why:** DesktopHeader est un composant global (rendu sur toutes les pages). Si l'utilisateur navigue de `/inbox?page=3&q=React` vers `/processed`, le useEffect se déclencherait car `pathname` change, comparerait `debouncedSearchQuery` au `?q=` actuel... et ne ferait rien (guard `debouncedSearchQuery === prevQ` le protège). Pas de bug mais des re-runs inutiles.
**Suggested change:** Retirer `pathname` des dépendances du useEffect. Construire la cible URL via `window.location.pathname` (lu au moment de l'exécution) plutôt qu'une variable réactive.
**Target section:** `## Étape 4bis`

---

### C-010 [MINOR] [Docs]
**What:** `handleClearFilters` (existant dans InboxView) appelle `router.replace(pathname)` — ce qui supprime ALL params y compris `?page`. Ce comportement est correct mais non documenté dans la spec. Un implémenteur qui suit la spec pourrait oublier de vérifier si ce handler fonctionne encore après les changements de `updateUrlParams`.
**Why:** `handleClearFilters` n'est pas affecté par les changements de la spec (il reset tout), mais son existence et sa compatibilité devraient être confirmées explicitement.
**Suggested change:** Ajouter dans §Étape 6/Suppressions : "Confirmer que `handleClearFilters` (existant) fonctionne sans modification — `router.replace(pathname)` supprime tous les params dont `?page`. Aucune modification requise."
**Target section:** `## Étape 6`

---

### C-011 [NIT] [UX]
**What:** La CSS du bouton navigation (`btnNav`) ne inclut pas de protection dark mode pour le hover sur état disabled : `disabled:hover:bg-white` empêche le hover en light mode, mais son équivalent `dark:disabled:hover:bg-slate-800` est absent du snippet v2 (il était présent en v1 de la spec).
**Why:** En dark mode, un bouton disabled hover affiche un fond légèrement différent (fondu transparent), ce qui brise l'aspect "disabled".
**Suggested change:** Ajouter `dark:disabled:hover:bg-slate-800` à `btnNav`.
**Target section:** `## Étape 5 / Styles`

---

### C-012 [NIT] [Architecture]
**What:** `pageSize` est hardcodé à `20` dans `InboxPage` (prop passée) ET dans la logique `totalPages = Math.ceil(total / pageSize)`. Deux sources de vérité pour la même constante (l'une en prop, l'autre en calcul). Si un développeur change la prop à 25 sans changer la logique `getJobs({ limit: 20 })`, les pages affichent 25 slots mais la DB en retourne 20.
**Why:** Pas de constante centralisée `PAGE_SIZE = 20` (ex: dans `lib/constants.ts`), ce qui rend fragile tout futur changement.
**Suggested change:** Définir `export const INBOX_PAGE_SIZE = 20` dans `lib/constants.ts` et l'importer dans `InboxPage`, `InboxView`, et `getJobs` (default). Mentionne dans la spec l'existence de cette constante.
**Target section:** `## Données & Source de vérité`, `## Étape 4`, `## Étape 6`

---

## Questions (optionnel)

```text
Q1 [C-001] Le dropdown pays doit-il filtrer par les filtres actifs ?
   A) Oui — passer workMode/q à getAvailableCountries (1 requête DB de plus)
   B) Non — afficher tous les pays INBOX même si certains donnent 0 résultats
      (comportement dégradé accepté, mention dans §Risques suffisante)

Q2 [C-005] router.push vs router.replace pour handlePageChange ?
   A) Garder push (back button = retour à la page précédente de pagination)
   B) Changer pour replace (back button = sortir de /inbox, cohérent avec les filtres)

Q3 [C-012] Constante PAGE_SIZE centralisée ?
   A) Oui — créer lib/constants.ts ou ajouter dans lib/types.ts
   B) Non — accepter la duplication pour cette feature (simple, faible risque)
```

## Next
- Lance **/spec-5-revise**
