---
id: 2026-06-15__inbox__server-pagination
version: 4
status: draft
scope: fullstack
solution_strategy: HYBRID
last_updated: 2026-06-15
sources:
  architecture: ARCHITECTURE.md
  reference_docs:
    - docs/05_API_BACKEND_CONTRATS.md
    - docs/08_LOGIQUE_METIER_ET_ETATS.md
  rules_docs:
    - docs/rules/Next.js Rules.md
    - docs/rules/React Rules.md
---

# Pagination serveur de la page /inbox

## Résumé exécutable

La page `/inbox` charge actuellement **tous** les jobs INBOX depuis MongoDB sans limite. Cette feature introduit une pagination serveur-side : le backend ne retourne que 20 jobs par page, avec filtrages (workMode, easyApply, country, recherche textuelle) également exécutés en DB. Un composant `Pagination` custom (Tailwind + lucide-react, cohérent avec le design system existant) est rendu sous la liste. La navigation entre pages et les filtres sont reflétés dans l'URL (`?page=2&mode=remote`). L'auto-refresh est suspendu quand l'utilisateur n'est pas en page 1 (avec delta "en attente" correctement préservé). Le Undo (restauration d'un job) déclenche un `router.refresh()` pour recharger depuis la DB.

`getAvailableCountries` accepte désormais `workMode`, `q` et `isEasyApply` pour ne retourner que les pays des offres matchant les filtres actifs — comportement identique à l'ancienne implémentation client-side. `visitedCount` (utilisé pour le BulkClean Toast) est recalculé depuis `jobs` après suppression de `baseInboxJobs`. Le BulkClean est scopé à la page courante (comportement attendu avec la pagination).

Résultat utilisateur : chargement initial de `/inbox` significativement plus rapide, navigation fluide dans un grand volume d'annonces, filtres temps-réel en DB sans code client-side redondant.

## Périmètre

### In-scope
- `server/jobs.service.ts` : `getJobs()` enrichi (filtres + skip/limit + total) + `getAvailableCountries()` nouveau (avec filtre workMode/q)
- `app/api/jobs/route.ts` : prise en charge des nouveaux query params
- `app/(tabs)/inbox/page.tsx` : lecture de `searchParams` (async), passage des paramètres au service et à `getAvailableCountries`
- `components/DesktopHeader.tsx` : reset `?page` lors d'un changement de `?q` (recherche)
- `components/InboxView.tsx` : nouvelles props, suppression filtrage client-side redondant, intégration `<Pagination>`, sync `visitedIds` sur navigation, `visitedCount` recalculé depuis `jobs`
- `components/Pagination.tsx` : nouveau composant custom (dark/light mode, responsive)
- `lib/hooks/useAutoRefresh.ts` : désactivation du `router.refresh()` quand `?page > 1`, delta préservé
- Mise à jour des trois autres callers de `getJobs()` pour le nouveau type de retour

### Out-of-scope
- Pagination des vues Processed et Filtered
- Installation de shadcn/ui (aucune dépendance Radix existante, composant 100% custom)
- Modification du composant `FilterBar` (structure inchangée, ses handlers font maintenant un naviguer+recharger serveur)
- Virtualisation (non nécessaire à 20 items/page)
- Implémentation du bouton de recherche mobile (MobileHeader — placeholder existant non wired, hors scope)

## Contraintes projet (sources)

- **Server Components par défaut** — appeler directement la couche service, pas les route handlers internes — `docs/rules/Next.js Rules.md`
- **`searchParams` est une Promise en Next 15+** — doit être `await`-é dans `InboxPage` — Next.js 16.1.4 confirmé
- **Pattern SC → CC** : `InboxPage` (SC) passe `initialJobs` à `InboxView` (CC) ; sync via `useEffect` — `ARCHITECTURE.md` §Data Flow
- **`export const dynamic = "force-dynamic"`** requis sur toute page avec données utilisateur temps-réel — `app/(tabs)/inbox/page.tsx` existant
- **Tri `createdAt: -1`** maintenu — `server/jobs.service.ts:20`
- **Pas de shadcn/ui** — composants custom Tailwind v4 uniquement — pas de `@radix-ui` dans `package.json`
- **Slate Theme + Dark mode** — classes `dark:` obligatoires sur tout nouveau composant — `ARCHITECTURE.md` §UI Guidelines
- **Logs `[JOBS]`** à maintenir dans `getJobs()` — `server/jobs.service.ts:11`
- **`useOptimistic`** pour feedback instantané des filtres — `docs/rules/React Rules.md` §Mutations optimistes
- **`force-dynamic`** déjà en place sur InboxPage — ne pas retirer
- **`withMongo` wrapper** obligatoire pour tout accès DB — `lib/mongo.ts`

## Stratégie de solution

- **Choix : HYBRID**
- Filtres et pagination passent en DB (robustesse, cohérence des totaux). L'`InboxView` conserve le pattern `useOptimistic` + `router.replace` pour le feedback instantané des filtres — le rechargement serveur corrige ensuite.
- **Trade-offs acceptés** : le changement du type de retour de `getJobs()` (`Job[]` → `{ items, total }`) est un breaking change sur 3 callers hors inbox — mise à jour incluse dans la spec. `getAvailableCountries` exécute une requête DB distincte à chaque render InboxPage (y compris lors des changements de page) — overhead accepté pour un usage personnel (<1000 jobs), documenté dans §Performance.
- **Trade-offs refusés** : charger tous les jobs puis paginer client-side (aucun gain de perf, contraire à l'intent).

---

## Schémas

### Schéma UI Desktop (wireframe texte)

```
┌─────────────────────────────────────────────────────┐
│  Opportunités                    [Tout marquer vu]  │  ← Desktop header
├─────────────────────────────────────────────────────┤
│  [Tous|Remote|Hybride|Site] | [⚡ Candidature simp] │  ← FilterBar (inchangé)
│  [🌍 Pays ▾]                [✕ Effacer]            │
├─────────────────────────────────────────────────────┤
│  ── 15 juin 2026 14h30 ─────────────────────────── │
│  [JobCard]                                          │
│  [JobCard]                                          │
│  ...                                                │
│  ── 14 juin 2026 09h00 ─────────────────────────── │
│  [JobCard]                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [|<]  [<]  [1] [2] [3] ... [8] [9] [10]  [>] [>|]│  ← Pagination desktop
│                   ↑ active                          │
│                                                     │
└─────────────────────────────────────────────────────┘

Légende boutons Pagination (desktop) :
  [|<] = première page (ChevronsLeft)   disabled si page = 1
  [<]  = page précédente (ChevronLeft)  disabled si page = 1
  [n]  = numéro de page cliquable       current = style actif
  ...  = ellipsis non cliquable
  [>]  = page suivante (ChevronRight)   disabled si page = totalPages
  [>|] = dernière page (ChevronsRight)  disabled si page = totalPages
```

### Schéma UI Mobile (wireframe texte)

```
┌────────────────────────────┐
│  [intrai.] [🌙] [🔍]      │  ← MobileHeader
│  [Flux entrant|Histo|Spam] │
├────────────────────────────┤
│  [Tous|Remote|Hybride|Site]│  ← FilterBar scroll horizontal
├────────────────────────────┤
│  ── 15 juin 14h30 ──────── │
│  [JobCard]                 │
│  [JobCard]                 │
│  ...                       │
├────────────────────────────┤
│                            │
│    [<]  Page 3 / 10  [>]  │  ← Pagination mobile (compact)
│                            │
└────────────────────────────┘

Note mobile :
  - Affichage compact : [ChevronLeft] "Page N / Total" [ChevronRight]
  - Boutons first/last (ChevronsLeft/Right) masqués sur mobile (hidden sm:flex)
  - Numéros de page masqués sur mobile (hidden sm:flex)
  - Le label "Page N / Total" visible uniquement sur mobile (flex sm:hidden)
```

### Schéma des états

| État | Description | UI |
|------|-------------|-----|
| **Loading** | Server re-fetch en cours (navigation page/filtre) | `opacity-50` sur la liste (pattern existant `isPending`) |
| **Empty** | Aucun job pour cette combinaison page/filtre | Empty state existant + `<Pagination>` masquée (0 pages) |
| **Error** | Erreur DB | `error.tsx` du segment (existant) |
| **Success** | Liste + pagination | Grille jobs + composant Pagination |
| **Page 1, filtre actif** | Filtres en DB, < 20 résultats possible | Pagination masquée si `totalPages <= 1` |

### Schéma de flux (Mermaid)

```mermaid
flowchart TD
  A[Utilisateur: change filtre ou page] --> B[InboxView: updateUrlParams / handlePageChange]
  B --> C["router.replace/push → URL mise à jour\n?page=X&mode=Y&country=Z"]
  C --> D[Next.js: re-render InboxPage SC]
  D --> E["getJobs({ status:INBOX, page, workMode, country, q, isEasyApply })"]
  E --> F[(MongoDB: find + skip/limit + countDocuments)]
  F --> G["{ items: Job[], total: number }"]
  G --> H["InboxPage: getAvailableCountries({ status:INBOX, workMode, q, isEasyApply })"]
  H --> H2["[{ items, total }, availableCountries] → InboxView props"]
  H2 --> I[InboxView: useEffect sync jobs + visitedIds]
  I --> J[Render liste + Pagination]

  DH[DesktopHeader: debouncedSearchQuery change] --> DH2["delete page + set q\nrouter.replace(pathname + query)"]
  DH2 --> D

  K[Utilisateur: trash/save job] --> L[InboxView: handleMoveJob]
  L --> M["setJobs optimiste (retrait local)"]
  M --> N[PATCH /api/jobs/:id]
  N --> O{OK?}
  O -->|Oui| P[Toast affiché]
  O -->|Non| Q[Rollback state + alert]

  R[Utilisateur: Undo trash] --> S["fetch PATCH status=INBOX"]
  S --> T[router.refresh()]
  T --> D

  U[useAutoRefresh: 60s tick] --> V{count changé?}
  V -->|Non| W[Rien]
  V -->|Oui| X{page == 1 ?}
  X -->|Oui| Y[router.refresh + màj prevCountRef]
  X -->|Non| Z["Skip refresh\nNE PAS màj prevCountRef\n(delta en attente)"]
```

---

## Fonctionnel détaillé

### Comportements attendus

1. Chargement initial `/inbox` : retourne les 20 jobs INBOX (category≠FILTERED) les plus récents.
2. Navigation `?page=2` : retourne les jobs 21-40.
3. Filtre `?mode=remote` : la DB filtre par `workMode=remote`, résultats paginés.
4. Recherche `?q=React` (via DesktopHeader, debounce 300ms) : filtre regex case-insensitive sur `title` ET `company`.
5. Combinaison `?page=2&mode=remote&country=France` : tous les paramètres appliqués en DB simultanément.
6. Changement de filtre (FilterBar) : reset `page` à 1 (via `updateUrlParams` qui supprime `page`).
7. Changement de recherche (DesktopHeader) : reset `page` à 1 (via `current.delete("page")` avant set `q`).
8. Pagination masquée si `totalPages <= 1`.
9. Ellipsis : voir algorithme §Étape 5.
10. Undo (restore) : appelle l'API puis `router.refresh()` → rechargement serveur de la page courante.
11. Auto-refresh (60s) : si count change et page = 1 → `router.refresh()` + màj `prevCountRef`. Si page > 1 → ne PAS màj `prevCountRef` (delta en attente pour quand l'utilisateur revient en page 1).
12. `updateSidebarCount` (event `inbox-count-update`) maintenu pour le compteur sidebar lors des actions trash/save.
13. `visitedIds` re-synchronisé à chaque changement de `initialJobs` (navigation entre pages).
14. Les filtres actifs sont préservés dans l'URL lors de la navigation entre pages.
15. Dropdown pays : `getAvailableCountries` passe `workMode`, `q` et `isEasyApply` actifs → seuls les pays des offres matchant les filtres actifs apparaissent (comportement identique à l'ancienne implémentation client-side). Le filtre `country` n'est pas passé à `getAvailableCountries` (un dropdown ne se filtre pas sur sa propre valeur).
16. BulkClean Toast : `visitedCount` calculé depuis `jobs` (page courante) après suppression de `baseInboxJobs`.
17. BulkClean scope : `visitedIds` est re-syncé depuis `initialJobs` (page courante uniquement). En conséquence, `handleBulkClean` ne nettoie que les offres visitées de la page affichée. Les jobs visités sur d'autres pages ne sont pas concernés — l'utilisateur nettoie page par page. Comportement attendu avec la pagination.

### Règles de priorité

- Les filtres sont appliqués avant la pagination : le `total` retourné correspond aux jobs matchant les filtres, pas à tous les jobs INBOX.
- CATEGORY `FILTERED` est toujours exclu du résultat INBOX (implicite en DB quand `status=INBOX`).

### Edge cases

| Cas | Comportement |
|-----|-------------|
| `?page=0` ou `?page=-5` | Clamp à page 1 côté serveur |
| `?page=abc` (NaN) | `isNaN` guard → clamp à page 1 |
| `?page=999` (dépassement) | DB retourne 0 items, `total` correct, empty state affiché, pagination permet retour |
| Filtre `country` absent du dropdown (URL manipulée) | DB retourne 0 résultats, empty state |
| Job trasché sur page 2 → Undo → `router.refresh()` | Page 2 rechargée depuis DB avec le job restauré |
| Count change sur page 2 (auto-refresh) | `prevCountRef` NON mis à jour → delta en attente. Retour page 1 → prochain tick → refresh déclenché |
| `total = 0` | Pagination non rendue, empty state visible |
| `limit=20`, `total=20` | 1 seule page, pagination non rendue |
| `limit=20`, `total=21` | 2 pages, pagination rendue |
| Navigation page 1 → page 2 | `visitedIds` re-sync depuis `initialJobs` de la page 2 |
| `?q=<200+ chars>` | Tronqué à 200 chars avant construction de la regex |
| `?limit=100000` (API directe) | Plafonné à 100 dans route.ts |
| `handleClearFilters` (reset tous les filtres) | `router.replace(pathname)` — supprime tous les params dont `?page`. Aucune modification requise, comportement correct après la feature. |

### Accessibilité

- Boutons de pagination : `aria-label` descriptif ("Page précédente", "Aller à la page 3", etc.)
- Page courante : `aria-current="page"` sur le bouton actif
- Boutons disabled : attribut `disabled` natif (pas juste style)
- Navigation au clavier : boutons standards, pas de JS spécial nécessaire
- Ellipsis : `aria-hidden="true"` sur le `<span>` "..."
- Label mobile "Page N / Total" : `aria-label="Page 3 sur 10"` sur le conteneur

---

## Données & Source de vérité

- **SoT** : MongoDB collection `jobs`
- **Constante centralisée** : `export const INBOX_PAGE_SIZE = 20` dans `lib/constants.ts` (créer si absent). Importer dans `InboxPage`, `InboxView` (totalPages), et comme default dans `getJobs`. Évite les sources de vérité multiples pour la taille de page.
- **Type de retour modifié** : `getJobs()` passe de `Promise<Job[]>` à `Promise<{ items: Job[], total: number }>`
- **Callers à mettre à jour** :
  - `app/(tabs)/inbox/page.tsx` — destructure `{ items, total }`
  - `app/(tabs)/processed/page.tsx` — destructure `{ items }` (ignore `total`)
  - `app/(tabs)/filtered/page.tsx` — destructure `{ items }` (ignore `total`)
  - `app/api/jobs/route.ts` — retourne `{ items, total }` au lieu de `{ items }`
- **Nouveau type** `GetJobsResult` exporté depuis `lib/types.ts` :
  ```typescript
  export interface GetJobsResult {
    items: Job[];
    total: number;
  }
  ```
- **Aucune migration MongoDB** : pas de nouveau champ, pas de changement de schéma
- **Index MongoDB recommandé** (non bloquant) : `{ status: 1, category: 1, createdAt: -1 }` + `{ workMode: 1 }` + `{ country: 1 }` pour perf sur les requêtes filtrées

---

## API / Permissions

| Action | Méthode | URL | Query params | Réponse | Erreurs |
|--------|---------|-----|-------------|---------|---------|
| Lister jobs paginés | GET | `/api/jobs` | `status`, `category`, `mode` (workMode), `easy` (bool), `country`, `q`, `page` (int, défaut 1), `limit` (int, défaut 20, max 100) | `{ items: Job[], total: number }` | 500 DB Error |

**Exemple requête** :
```
GET /api/jobs?status=INBOX&mode=remote&country=France&page=2&limit=20
```

**Exemple réponse** :
```json
{
  "items": [...],
  "total": 47
}
```

**Note** : L'endpoint `/api/jobs` est exposé mais `InboxPage` appelle `getJobs()` directement (Server Component → service). L'API utilise `mode` (cohérent avec le nom du param URL interne).

---

## Architecture / Data flow

### Où vit l'état ?

| Donnée | Emplacement |
|--------|------------|
| Page courante | URL (`?page=X`) — SoT |
| Filtres actifs | URL (`?mode=Y&country=Z&...`) — SoT |
| Recherche `q` | URL (`?q=React`) — géré par `DesktopHeader` (debounce 300ms) |
| Jobs affichés | `useState` dans `InboxView` (sync depuis `initialJobs` prop) |
| Total jobs | Prop `total` de `InboxView` (issue du SC) |
| `availableCountries` | Prop `availableCountries` de `InboxView` (issue du SC via `getAvailableCountries({ status, workMode, q, isEasyApply })`) |
| Visited IDs | `useState` dans `InboxView` (re-sync via `useEffect` sur `initialJobs`) |

### Flux lecture

```
URL change (?page, ?mode, ...)
→ Next.js re-render InboxPage (SC)
→ getJobs(filters+pagination) → MongoDB (withMongo)
→ { items, total } → InboxPage
→ getAvailableCountries({ status: "INBOX", workMode, q, isEasyApply }) → MongoDB (withMongo)
→ <InboxView initialJobs={items} total={total} currentPage={page} pageSize={INBOX_PAGE_SIZE} availableCountries={countries} />
→ useEffect: setJobs(initialJobs) + setVisitedIds(newSet from initialJobs)
→ Render
```

### Flux écriture (filtre FilterBar)

```
Utilisateur: clic "Remote"
→ InboxView: handleModeChange("remote")
  → startTransition: setOptimisticFilters({ mode: "remote" }) [feedback instantané]
  → updateUrlParams("mode", "remote") → current.delete("page") + router.replace
→ Next.js: re-render InboxPage
→ getJobs({ workMode: "remote", page: 1 }) + getAvailableCountries({ status: "INBOX", workMode: "remote", isEasyApply: undefined }) → MongoDB
→ ...
```

### Flux écriture (recherche DesktopHeader)

```
Utilisateur: tape "React" dans la barre de recherche
→ DesktopHeader: setInputValue → useDebounce(300ms) → debouncedSearchQuery = "React"
→ useEffect: current.delete("page") + current.set("q", "React") + router.replace(window.location.pathname + query)
→ Next.js: re-render InboxPage
→ getJobs({ q: "React", page: 1 }) + getAvailableCountries({ status: "INBOX", q: "React" }) → MongoDB
→ ...
```

### Flux écriture (changement de page)

```
Utilisateur: clic page 3
→ InboxView: handlePageChange(3)
  → router.push("?...&page=3") [scroll: false, préserve filtres, crée entrée historique]
→ Next.js: re-render InboxPage
→ getJobs({ ..., page: 3 }) + getAvailableCountries({ ..., workMode, q, isEasyApply }) → MongoDB
→ ...
```

**Note `router.push` vs `router.replace`** : `handlePageChange` utilise `router.push` intentionnellement — chaque page est une position bookmarkable et navigable via le bouton "Back" du navigateur. Ce choix est asymétrique avec les filtres (qui utilisent `router.replace`) : un utilisateur sur p3 souhaitera souvent revenir à p2 via "Back", alors qu'un changement de filtre n'est pas une étape de navigation au sens propre.

### Caching / invalidation

- `export const dynamic = "force-dynamic"` maintenu sur `InboxPage` → pas de cache Next.js
- MongoDB : pas de cache applicatif (appel direct)

### Performance

- MongoDB : `skip(n)` est O(n) sur grands datasets. Acceptable car volume inbox limité (usage personnel/pro, centaines de jobs max). À surveiller si >10k jobs.
- `countDocuments(query)` exécuté en parallèle avec `find()` (via `Promise.all`).
- `getAvailableCountries()` : `distinct("country", query)` — requête DB exécutée à chaque render InboxPage, y compris sur navigation paginée (`?page=2 → ?page=3`). Pour un usage personnel (<1000 jobs), l'overhead est négligeable. Trade-off accepté en faveur de la simplicité (vs cache ou fusion dans `getJobs`).

---

## Plan d'implémentation (étapes stables)

### Étape 0 — Ajouter la constante `INBOX_PAGE_SIZE`

**Objectif** : Eviter la duplication du chiffre `20` dans plusieurs fichiers.

**Fichier** : `lib/constants.ts` (créer si absent)

```typescript
export const INBOX_PAGE_SIZE = 20;
```

Importer `INBOX_PAGE_SIZE` dans :
- `server/jobs.service.ts` — default limit dans `getJobs` (`filters.limit ?? INBOX_PAGE_SIZE`)
- `app/(tabs)/inbox/page.tsx` — appel `getJobs({ limit: INBOX_PAGE_SIZE })` et prop `pageSize={INBOX_PAGE_SIZE}`

Note : `components/InboxView.tsx` utilise la prop `pageSize` (passée depuis InboxPage) — pas d'import direct nécessaire.

---

### Étape 1 — Modifier `getJobs()` et ajouter `getAvailableCountries()`

**Objectif** : Service backend capable de paginer et filtrer en DB. `getAvailableCountries` accepte les filtres actifs (workMode, q, isEasyApply) pour ne retourner que les pays pertinents.

**Fichier** : `server/jobs.service.ts`

**Ajouter en tête du fichier** :
```typescript
import { INBOX_PAGE_SIZE } from "@/lib/constants";
```

**Détails d'implémentation** :

```typescript
export async function getJobs(filters: {
  status?: JobStatus;
  category?: JobCategory;
  workMode?: string;
  isEasyApply?: boolean;
  country?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Job[]; total: number }> {
  const start = Date.now();

  const rawPage = filters.page ?? 1;
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = filters.limit ?? INBOX_PAGE_SIZE;
  const skip = (page - 1) * limit;

  console.log(`[JOBS] 🟡 Fetching jobs page=${page} limit=${limit} filters: ${JSON.stringify({
    ...filters, q: filters.q ? '[redacted]' : undefined, page: undefined, limit: undefined
  })}`);

  try {
    const { items, total } = await withMongo(async (db) => {
      const query: Record<string, unknown> = {};
      if (filters.status) query.status = filters.status;
      if (filters.status === "INBOX" && !filters.category) {
        query.category = { $ne: "FILTERED" };
      } else if (filters.category) {
        query.category = filters.category;
      }
      if (filters.workMode && filters.workMode !== "all") query.workMode = filters.workMode;
      if (filters.isEasyApply === true) query.isEasyApply = true;
      if (filters.country && filters.country !== "all") query.country = filters.country;
      if (filters.q?.trim()) {
        const trimmed = filters.q.trim().slice(0, 200); // Guard longueur max
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, "i");
        query.$or = [{ title: regex }, { company: regex }];
      }

      const [rawItems, total] = await Promise.all([
        db.collection(JOBS_COLLECTION)
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection(JOBS_COLLECTION).countDocuments(query),
      ]);

      const items = rawItems.map((item) => {
        const { _id, createdAt, visitedAt, updatedAt, aiAnalysis, ...rest } = item;
        return {
          ...rest,
          id: _id.toString(),
          createdAt: createdAt ? new Date(createdAt).toISOString() : null,
          updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
          visitedAt: visitedAt ? new Date(visitedAt).toISOString() : null,
          aiAnalysis: aiAnalysis ? {
            ...aiAnalysis,
            createdAt: aiAnalysis.createdAt ? new Date(aiAnalysis.createdAt).toISOString() : null
          } : null
        };
      }) as unknown as Job[];

      return { items, total };
    });

    const duration = Date.now() - start;
    console.log(`[JOBS] 🟢 Fetched ${items.length}/${total} jobs in ${duration}ms`);

    return { items, total };
  } catch (error) {
    console.error("[JOBS] 🔴 Error fetching jobs:", error);
    throw error;
  }
}

export async function getAvailableCountries(filters: {
  status?: JobStatus;
  workMode?: string;
  q?: string;
  isEasyApply?: boolean;
}): Promise<string[]> {
  return await withMongo(async (db) => {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.status === "INBOX") query.category = { $ne: "FILTERED" };
    if (filters.workMode && filters.workMode !== "all") query.workMode = filters.workMode;
    if (filters.isEasyApply === true) query.isEasyApply = true;
    if (filters.q?.trim()) {
      const trimmed = filters.q.trim().slice(0, 200);
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: new RegExp(escaped, "i") }, { company: new RegExp(escaped, "i") }];
    }
    const countries = await db.collection(JOBS_COLLECTION).distinct("country", query);
    return countries
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort();
  });
}
```

**Tests** : Manuel — `getJobs({ status: "INBOX", page: 1, limit: 3 })` → `{ items: [...3], total: N }`. `getAvailableCountries({ status: "INBOX", workMode: "remote" })` → seulement les pays des offres remote.

**Validation** :
- `getJobs({ status: "INBOX", page: 1, limit: 20 })` → 20 items max, total correct
- `getJobs({ status: "INBOX", page: 999 })` → 0 items, total correct
- `getJobs({ status: "INBOX", workMode: "remote" })` → uniquement des jobs remote
- `getJobs({ status: "INBOX", page: NaN })` → clampé à page 1, pas d'erreur
- `getAvailableCountries({ status: "INBOX" })` → tous les pays INBOX
- `getAvailableCountries({ status: "INBOX", workMode: "remote" })` → seulement les pays des offres remote
- `getAvailableCountries({ status: "INBOX", isEasyApply: true })` → seulement les pays des offres easy-apply

**Conformité** : `withMongo` conservé ; logs `[JOBS]` maintenus.

---

### Étape 2 — Mettre à jour `app/api/jobs/route.ts`

**Objectif** : Exposer les nouveaux params de filtrage et retourner `{ items, total }`. Cap `limit` à 100.

**Fichier** : `app/api/jobs/route.ts`

**Détails** :

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as JobStatus | undefined;
  const category = searchParams.get("category") as JobCategory | undefined;
  const mode = searchParams.get("mode") ?? undefined;          // "mode" = workMode
  const isEasyApply = searchParams.get("easy") === "true" ? true : undefined;
  const country = searchParams.get("country") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(isNaN(rawLimit) ? 20 : Math.max(1, rawLimit), 100); // Cap à 100

  try {
    const { items, total } = await getJobs({
      status,
      category,
      workMode: mode,
      isEasyApply,
      country,
      q,
      page,
      limit,
    });
    return NextResponse.json({ items, total });
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}
```

**Validation** : `curl "http://localhost:3000/api/jobs?status=INBOX&page=1&limit=5"` → `{ items: [...], total: N }`. `?limit=100000` → limité à 100 items.

---

### Étape 3 — Mettre à jour les callers non-inbox de `getJobs()`

**Objectif** : Ne pas casser ProcessedPage et FilteredPage.

**Fichiers** :
- `app/(tabs)/processed/page.tsx`
- `app/(tabs)/filtered/page.tsx`

**Détails** :

```typescript
// processed/page.tsx
const [{ items: savedJobs }, { items: trashJobs }] = await Promise.all([
  getJobs({ status: "SAVED" }),
  getJobs({ status: "TRASH" }),
]);
const allProcessedJobs = [...savedJobs, ...trashJobs];

// filtered/page.tsx
const { items: filteredJobs } = await getJobs({ category: "FILTERED" });
```

**Validation** : Pages `/processed` et `/filtered` fonctionnent identiquement à avant.

---

### Étape 4 — Mettre à jour `app/(tabs)/inbox/page.tsx`

**Objectif** : Lire `searchParams`, passer tous les filtres au service et à `getAvailableCountries`.

**Fichier** : `app/(tabs)/inbox/page.tsx`

**Détails** :

```typescript
import InboxView from "@/components/InboxView";
import { getJobs, getAvailableCountries } from "@/server/jobs.service";
import { INBOX_PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    mode?: string;
    easy?: string;
    country?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const rawPage = parseInt(params.page ?? "1", 10);
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const workMode = params.mode && params.mode !== "all" ? params.mode : undefined;
  const isEasyApply = params.easy === "true" ? true : undefined;
  const country = params.country && params.country !== "all" ? params.country : undefined;
  const q = params.q || undefined;

  const [{ items, total }, availableCountries] = await Promise.all([
    getJobs({ status: "INBOX", page, limit: INBOX_PAGE_SIZE, workMode, isEasyApply, country, q }),
    getAvailableCountries({ status: "INBOX", workMode, q, isEasyApply }), // Filtres actifs pour le dropdown pays
  ]);

  return (
    <InboxView
      initialJobs={items}
      total={total}
      currentPage={page}
      pageSize={INBOX_PAGE_SIZE}
      availableCountries={availableCountries}
    />
  );
}
```

**Validation** : `/inbox?page=2` charge les jobs 21-40. `/inbox?mode=remote` filtre en DB. `/inbox?easy=true` — le dropdown pays ne montre que les pays des offres easy-apply. `/inbox?page=abc` clampé à 1.

---

### Étape 4bis — Mettre à jour `components/DesktopHeader.tsx`

**Objectif** : Reset `?page` à 1 quand la recherche change, et corriger l'edge case `"?"` dans l'URL.

**Fichier** : `components/DesktopHeader.tsx`

**Modification** : dans le `useEffect` réagissant à `debouncedSearchQuery` — supprimer `pathname` des deps (utiliser `window.location.pathname` dans le corps de l'effet) :

```typescript
import { useRouter, useSearchParams } from "next/navigation";

// Dans le composant (supprimer usePathname si non utilisé ailleurs) :

useEffect(() => {
  const current = new URLSearchParams(Array.from(searchParams.entries()));
  const prevQ = current.get("q") || "";

  if (debouncedSearchQuery === prevQ) return;

  current.delete("page"); // Reset pagination sur nouvelle recherche
  if (!debouncedSearchQuery) {
    current.delete("q");
  } else {
    current.set("q", debouncedSearchQuery);
  }

  const search = current.toString();
  const query = search ? `?${search}` : "";
  // window.location.pathname : valeur instantanée au moment du run, non réactive
  router.replace(`${window.location.pathname}${query}`, { scroll: false });
}, [debouncedSearchQuery, router, searchParams]); // pathname retiré des deps
```

**Pourquoi retirer `pathname` des deps** : `pathname` est réactif sur toute navigation. Avec `pathname` en dep, le `useEffect` se déclenche sur `/inbox → /processed` même si la recherche n'a pas changé — le guard `debouncedSearchQuery === prevQ` évite le bug mais génère des re-runs inutiles. `window.location.pathname` lu dans le corps donne la valeur instantanée sans la réactivité.

**Validation** :
- Utilisateur sur `/inbox?page=3` tape "React" → URL devient `/inbox?q=React` (page supprimée)
- Utilisateur efface la recherche → `?q` supprimé, `?page` supprimé, URL propre
- `/inbox` sans params → URL reste `/inbox` (pas `/inbox?`)
- Navigation `/inbox → /processed` n'entraîne pas de run superflu du useEffect

---

### Étape 5 — Créer `components/Pagination.tsx`

**Objectif** : Composant de pagination custom Tailwind, dark mode, lucide-react, responsive.

**Fichier** : `components/Pagination.tsx` (nouveau)

**Algorithme d'affichage des pages** (7 éléments max + ellipsis) :

```typescript
function getPageRange(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const showLeftEllipsis = currentPage > 4;
  const showRightEllipsis = currentPage < totalPages - 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    // Proche du début : [1][2][3][4][5]...[N]
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    // Proche de la fin : [1]...[N-4][N-3][N-2][N-1][N]
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  // Milieu : [1]...[p-1][p][p+1]...[N]
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}
```

**Interface** :
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

**Rendu conditionnel** : si `totalPages <= 1`, retourner `null`.

**Styles** (cohérents avec FilterBar) :

```typescript
// Bouton page inactive
const btnBase = "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all \
 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 \
 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700";

// Bouton page active
const btnActive = "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-md \
 bg-slate-900 text-white border-slate-900 \
 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200";

// Bouton navigation (first/prev/next/last)
const btnNav = "p-2 rounded-lg border transition-all \
 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 \
 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 \
 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white \
 dark:disabled:hover:bg-slate-800"; // Dark mode: empêche le hover sur disabled

// Ellipsis
const ellipsis = "px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500 select-none";
```

**Structure JSX (responsive)** :
```tsx
<nav aria-label="Pagination" className="flex items-center gap-1.5">
  {/* First — masqué mobile */}
  <button className={`${btnNav} hidden sm:flex`} disabled={currentPage === 1}
    onClick={() => onPageChange(1)} aria-label="Première page">
    <ChevronsLeft size={14} />
  </button>

  {/* Prev */}
  <button className={btnNav} disabled={currentPage === 1}
    onClick={() => onPageChange(currentPage - 1)} aria-label="Page précédente">
    <ChevronLeft size={14} />
  </button>

  {/* Pages numérotées — masquées mobile */}
  <div className="hidden sm:flex items-center gap-1">
    {getPageRange(currentPage, totalPages).map((item, i) =>
      item === "..." ? (
        <span key={`ellipsis-${i}`} className={ellipsis} aria-hidden="true">...</span>
      ) : (
        <button key={item} onClick={() => onPageChange(item)}
          className={item === currentPage ? btnActive : btnBase}
          aria-label={`Aller à la page ${item}`}
          aria-current={item === currentPage ? "page" : undefined}>
          {item}
        </button>
      )
    )}
  </div>

  {/* Label compact — visible mobile uniquement */}
  <span className="flex sm:hidden text-xs font-medium text-slate-600 dark:text-slate-400 px-2"
    aria-label={`Page ${currentPage} sur ${totalPages}`}>
    Page {currentPage} / {totalPages}
  </span>

  {/* Next */}
  <button className={btnNav} disabled={currentPage === totalPages}
    onClick={() => onPageChange(currentPage + 1)} aria-label="Page suivante">
    <ChevronRight size={14} />
  </button>

  {/* Last — masqué mobile */}
  <button className={`${btnNav} hidden sm:flex`} disabled={currentPage === totalPages}
    onClick={() => onPageChange(totalPages)} aria-label="Dernière page">
    <ChevronsRight size={14} />
  </button>
</nav>
```

**Icônes** : `ChevronsLeft`, `ChevronLeft`, `ChevronRight`, `ChevronsRight` de `lucide-react` — `size={14}`.

---

### Étape 6 — Mettre à jour `components/InboxView.tsx`

**Objectif** : Intégrer la pagination, supprimer le filtrage client-side redondant, sync visitedIds, simplifier le Undo. Recalculer `visitedCount` depuis `jobs` (remplace `baseInboxJobs`).

**Fichier** : `components/InboxView.tsx`

**Changements de props** :

```typescript
interface InboxViewProps {
  initialJobs: Job[];
  total: number;
  currentPage: number;
  pageSize: number;
  availableCountries: string[];
}
```

**Suppressions** :
- `baseInboxJobs` (le filtre `j.category !== "FILTERED"` est maintenant géré en DB)
- Calcul de `availableCountries` depuis `baseInboxJobs` (maintenant prop)
- `useState(() => { initialJobs.forEach... })` — remplacer par `useState(new Set<string>())` (le useEffect ci-dessous gère l'initialisation, y compris le premier render)

**Remplacement de `visitedCount`** (ligne ~165 dans la version actuelle) :

```typescript
// Avant (utilise baseInboxJobs qui est supprimée) :
const visitedCount = baseInboxJobs.filter((j) => visitedIds.has(j.id)).length;

// Après (utilise jobs — page courante brute) :
const visitedCount = jobs.filter((j) => visitedIds.has(j.id)).length;
// Note: jobs = page courante non filtrée optimistiquement, compte tous les items visitables
```

**Ajouts** :

```typescript
// Calcul totalPages (importer INBOX_PAGE_SIZE depuis lib/constants si pageSize non passé en prop)
const totalPages = Math.ceil(total / pageSize);

// Sync visitedIds sur navigation entre pages
// useState initialisé vide : ce useEffect gère TOUS les renders (premier et suivants)
const [visitedIds, setVisitedIds] = useState(new Set<string>());
useEffect(() => {
  const newSet = new Set<string>();
  initialJobs.forEach((job) => {
    if (job.visitedAt) newSet.add(job.id);
  });
  setVisitedIds(newSet);
}, [initialJobs]);

// handlePageChange — router.push (bookmarkable, crée entrée historique)
const handlePageChange = (page: number) => {
  const current = new URLSearchParams(Array.from(searchParams.entries()));
  if (page === 1) {
    current.delete("page");
  } else {
    current.set("page", String(page));
  }
  const search = current.toString();
  const query = search ? `?${search}` : "";
  router.push(`${pathname}${query}`, { scroll: false });
};
```

**Reset page sur changement de filtre** : dans `updateUrlParams`, ajouter `current.delete("page")` :

```typescript
const updateUrlParams = (key: string, value: string | null) => {
  const current = new URLSearchParams(Array.from(searchParams.entries()));
  current.delete("page"); // Reset page sur tout changement de filtre
  if (!value || value === "all" || value === "false") {
    current.delete(key);
  } else {
    current.set(key, value);
  }
  const search = current.toString();
  const query = search ? `?${search}` : "";
  router.replace(`${pathname}${query}`, { scroll: false });
};
```

**Compatibilité `handleClearFilters`** : `handleClearFilters` (existant) appelle `router.replace(pathname)` — supprime ALL params dont `?page`. Aucune modification requise, comportement correct après la feature.

**Simplification de `handleUndoTrash`** :

```typescript
const handleUndoTrash = async () => {
  if (!lastTrashedJob) return;
  const jobToRestore = lastTrashedJob;
  setLastTrashedJob(null);
  setToast(null);

  try {
    await fetch(`/api/jobs/${jobToRestore.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INBOX" }),
    });
    updateSidebarCount(1); // Appelé APRÈS succès API (non-optimiste — cohérent avec Q5:B)
    router.refresh();
  } catch (error) {
    console.error("Undo API failed", error);
    alert("Erreur lors de la restauration.");
  }
};
```

Note : dans la version actuelle du repo, `updateSidebarCount(1)` est appelé avant l'API (optimiste). Le changement ici le place après — délai ~200ms avant mise à jour du compteur sidebar. Acceptable car `router.refresh()` recharge de toute façon la vue.

**Rendu de la Pagination** (après la liste, avant les Toasts) :

```tsx
{totalPages > 1 && (
  <div className="mt-10 flex justify-center">
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  </div>
)}
```

**Filtrage optimistic** : conserver `inboxJobs = jobs.filter(...)` pour le feedback instantané — les filtres sont idempotents (DB filtre déjà, filtre client confirme). `inboxJobs` opère directement sur `jobs` (plus de `baseInboxJobs`).

**Validation** :
- Page 1 affiche 20 jobs max
- Clic page 2 → liste change, URL = `?page=2`, `visitedIds` re-sync
- Changement de filtre → URL reset `page`, liste recharge depuis page 1
- BulkClean Toast : `visitedCount` calculé depuis `jobs`, s'affiche correctement
- Undo → recharge la page courante depuis DB

---

### Étape 7 — Mettre à jour `lib/hooks/useAutoRefresh.ts`

**Objectif** : Suspendre `router.refresh()` quand `?page > 1`, tout en préservant le delta pour le retour à la page 1.

**Fichier** : `lib/hooks/useAutoRefresh.ts`

**Modification** (dans `checkUpdates`, remplacer le bloc de refresh) :

```typescript
if (count !== prevCountRef.current) {
  const urlParams = new URLSearchParams(window.location.search);
  const currentPageInUrl = parseInt(urlParams.get("page") ?? "1", 10);

  if (currentPageInUrl > 1) {
    // Ne PAS mettre à jour prevCountRef ici.
    // Le delta reste "en attente" : au prochain tick où l'utilisateur
    // sera sur page 1, count !== prevCountRef → refresh déclenché.
    console.log(`[AutoRefresh] Count changed but page=${currentPageInUrl} > 1, deferring refresh`);
    return;
  }

  console.log(`[AutoRefresh] Count changed (${prevCountRef.current} -> ${count}). Refreshing...`);
  prevCountRef.current = count; // Mis à jour APRÈS le guard
  router.refresh();
}
```

**Validation** :
- Sur `/inbox` (page 1) + count change → `router.refresh()` déclenché (comportement inchangé)
- Sur `/inbox?page=3` + count change → `prevCountRef` NON mis à jour → retour page 1 → prochain tick → refresh
- Sur `/processed` (pas de `?page`) → `currentPageInUrl = 1` → refresh normal (comportement inchangé)

---

## Tests

- **Unit** : Aucun automatisé — logique `getPageRange()` est pure ; valider manuellement (page 1/4/6/last sur 12 pages).
- **Intégration** : Aucun automatisé. Tests manuels listés dans chaque étape.
- **E2E** : Non requis pour cette itération.
- **TypeScript** : `tsc --noEmit` doit passer sans erreur après l'étape 3 (breaking change `Job[]` → `{ items, total }`).
- **Dette** : Idéalement un test Vitest sur `getPageRange()` et `GET /api/jobs?page=2`.

---

## Documentation à mettre à jour

- `ARCHITECTURE.md` section "Contrats API" : ajouter params `mode`, `easy`, `country`, `q`, `page`, `limit` (max 100) à `GET /api/jobs` ; noter type de retour `{ items, total }`.
- `ARCHITECTURE.md` section "Data Flow" : filtrage et pagination désormais server-side pour `/inbox` ; `DesktopHeader` gère `?q=` avec reset `?page` via `window.location.pathname`.

---

## Rollback / Feature flag / déploiement

- **Option retenue** : Déploiement direct — feature additive, faible risque.
- **Plan de rollback** :
  1. Revenir `getJobs()` à l'ancienne signature (retourner `Job[]` directement, sans `total`)
  2. Revenir `InboxPage` à `const jobs = await getJobs({ status: "INBOX" })` + `return <InboxView initialJobs={jobs} />`
  3. Revenir `InboxView` à l'ancienne interface props (supprimer `total`, `currentPage`, `pageSize`, `availableCountries`) et recalculer `availableCountries` + `baseInboxJobs` localement
  4. Revenir `DesktopHeader` à la version sans `current.delete("page")`
  5. Supprimer `Pagination.tsx` et `lib/constants.ts` (si créé pour cette feature uniquement)
  Les autres callers (ProcessedPage, FilteredPage) sont mis à jour de façon rétro-compatible.

---

## Risques & mitigations

| Risque | Probabilité | Mitigation |
|--------|------------|------------|
| `skip()` lent sur grand volume MongoDB | Faible (usage perso, <1000 jobs) | Surveiller logs `[JOBS]` ; ajouter index si >10k |
| `searchParams` async cause erreur TypeScript | Moyen | Tester le type `Promise<...>` vs objet direct en Next 16 |
| Filtres client `useOptimistic` désynchronisés avec filtres serveur | Faible | Sync via `useEffect(setJobs, [initialJobs])` corrige après rechargement |
| Undo sans state optimiste = UX moins réactive | Accepté | Contrepartie du Q5:B ; `router.refresh()` est suffisamment rapide |
| Delta en attente perdu si l'utilisateur reste longtemps sur page > 1 | Faible | Max 60s d'attente au retour en page 1 (prochain tick auto-refresh) |
| MobileHeader search bouton sans handler | Accepté | Fonctionnalité non-implémentée pré-existante, hors scope |
| BulkClean ne nettoie que la page courante | Accepté | Comportement voulu avec la pagination ; l'utilisateur nettoie page par page (cf. §Fonctionnel #17) |
| Race condition `handleVisit` + `router.refresh()` (Undo) | Faible | Si l'API `/api/jobs/:id/visit` n'a pas encore persisté `visitedAt` avant le `router.refresh()` déclenché par Undo, le marqueur "vu" disparaît temporairement. Le `useEffect([initialJobs])` recalcule les visitedIds depuis la DB au rechargement — après persistance, le prochain rechargement sera correct. Fréquence très faible (nécessite Undo dans la seconde suivant un visit). Documenté comme risque accepté. |
| `getAvailableCountries` : requête DB à chaque render InboxPage | Faible | Trade-off accepté (cf. §Architecture/Performance) — overhead négligeable pour usage personnel |

---

## Questions restantes

Aucune.

---

## Changelog

- v1 (2026-06-15) : Création initiale. Filtres server-side (Q1:B), URL préserve filtres+page (Q2:B), auto-refresh suspendu page>1 (Q3:C), ellipsis ± 1 page autour du courant (Q4:B), Undo via router.refresh() (Q5:B).
- v2 (2026-06-15) : Révision post-audit. B-001: ajout DesktopHeader à l'in-scope (Étape 4bis) + reset `?page` sur recherche. B-002: fix race condition `prevCountRef` (màj après guard). B-003: ajout useEffect sync `visitedIds` sur navigation entre pages. N-001: uniformisation param `mode`. N-002: NaN guards sur page param. N-003: fix trailing `?` dans handlePageChange. N-004: ajout wrapper `withMongo` complet dans snippet getJobs. N-005: ajout wireframe mobile + responsive Pagination.
- v3 (2026-06-15) : Révision post-audit v2 + challenge. A-001: ajout remplacement explicite `visitedCount` depuis `jobs` (suppression `baseInboxJobs`). A-002/C-001: `getAvailableCountries` accepte `workMode`+`q`, passés depuis InboxPage — préserve comportement dropdown pays. N-001/C-004: `useState(new Set<string>())` remplace initializer avec corps (useEffect gère tout). N-002/C-005: `router.push` documenté dans Architecture (bookmarkabilité). N-003/C-006: overhead `getAvailableCountries` documenté dans §Performance. N-004/C-007: guard longueur `q.slice(0, 200)` ajouté. N-005/C-008: cap `limit` à 100 dans route.ts. N-006/C-009: `pathname` retiré des deps useEffect DesktopHeader, remplacé par `window.location.pathname`. N-007/C-012: constante `INBOX_PAGE_SIZE` centralisée dans `lib/constants.ts` (Étape 0). N-008/C-011: `dark:disabled:hover:bg-slate-800` ajouté à `btnNav`. C-003: race condition visitedIds+router.refresh documentée dans §Risques. C-010: compatibilité `handleClearFilters` confirmée dans §Étape 6.
- v4 (2026-06-15) : Révision post-audit v3. N-001: `isEasyApply` ajouté à `getAvailableCountries` (signature + query + appel InboxPage). N-002: comportement BulkClean page-scopé documenté dans §Fonctionnel #17 et §Risques. N-003: instruction import `INBOX_PAGE_SIZE` dans §Étape 0 corrigée (InboxView retiré — utilise prop `pageSize`). N-004: import `INBOX_PAGE_SIZE` ajouté au snippet §Étape 1. N-005: note non-optimiste `updateSidebarCount` ajoutée dans §Étape 6 / handleUndoTrash.
