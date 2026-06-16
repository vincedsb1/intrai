# Application Report — 2026-06-15__inbox__server-pagination (v2 → v3)

## Triage

### Depuis AUDIT v2

- **A-001** → ACCEPT — `visitedCount` recalculé depuis `jobs` dans §Étape 6/Suppressions (remplacement explicite avant/après)
- **A-002** → ACCEPT (Q1=A) — `getAvailableCountries` étendue avec `workMode`+`q` ; InboxPage passe ces filtres actifs
- **N-001** → ACCEPT — `useState(new Set<string>())` remplace l'initializer avec corps ; useEffect gère tout
- **N-002** → ACCEPT — `router.push` documenté dans §Architecture/Data flow (bookmarkabilité)
- **N-003** → ACCEPT — overhead `getAvailableCountries` documenté dans §Architecture/Performance
- **N-004** → ACCEPT — `q.trim().slice(0, 200)` ajouté dans `getJobs` et `getAvailableCountries`
- **N-005** → ACCEPT — `Math.min(..., 100)` cap sur `limit` dans §Étape 2 (route.ts)
- **N-006** → ACCEPT — `pathname` retiré des deps useEffect DesktopHeader ; `window.location.pathname` utilisé dans le corps
- **N-007** → ACCEPT — `INBOX_PAGE_SIZE = 20` dans `lib/constants.ts` ; Étape 0 ajoutée, importé dans InboxPage et InboxView
- **N-008** → ACCEPT — `dark:disabled:hover:bg-slate-800` ajouté à `btnNav` dans §Étape 5

### Depuis CHALLENGE

- **C-001** → ACCEPT (= A-002, déjà traité)
- **C-002** → ACCEPT (= A-001, déjà traité)
- **C-003** → ACCEPT (documenté) — race condition `handleVisit` + `router.refresh()` ajoutée dans §Risques comme risque accepté (fréquence très faible, auto-corrigé au rechargement suivant)
- **C-004** → ACCEPT (= N-001, déjà traité)
- **C-005** → ACCEPT (= N-002, déjà traité)
- **C-006** → ACCEPT (= N-003, déjà traité)
- **C-007** → ACCEPT (= N-004, déjà traité)
- **C-008** → ACCEPT (= N-005, déjà traité)
- **C-009** → ACCEPT (= N-006, déjà traité)
- **C-010** → ACCEPT — note explicite sur `handleClearFilters` ajoutée dans §Étape 6 (aucune modification requise, comportement correct confirmé)
- **C-011** → ACCEPT (= N-008, déjà traité)
- **C-012** → ACCEPT (= N-007, déjà traité)

---

## Application proofs

### A-001 / C-002 — visitedCount recalculé depuis `jobs`

- **Applied_to** : `§Étape 6 / Suppressions`, `§Fonctionnel détaillé #16`, `§Résumé exécutable`
- **Change_summary** : Remplacement explicite avant/après de la ligne `visitedCount` dans le snippet InboxView.
- **Proof** :
  - Before: `const visitedCount = baseInboxJobs.filter((j) => visitedIds.has(j.id)).length;` (`baseInboxJobs` supprimée → TypeScript error ou undefined)
  - After:
    ```typescript
    // Après (utilise jobs — page courante brute) :
    const visitedCount = jobs.filter((j) => visitedIds.has(j.id)).length;
    ```

---

### A-002 / C-001 — getAvailableCountries filtre par workMode + q

- **Applied_to** : `§Étape 1`, `§Étape 4`, `§Architecture / Data flow`, `§Fonctionnel détaillé #15`
- **Change_summary** : Signature de `getAvailableCountries` étendue avec `workMode` et `q`. Appel dans InboxPage mis à jour pour passer les filtres actifs.
- **Proof** :
  - Before:
    ```typescript
    export async function getAvailableCountries(filters: { status?: JobStatus }): Promise<string[]>
    // InboxPage:
    getAvailableCountries({ status: "INBOX" })
    ```
  - After:
    ```typescript
    export async function getAvailableCountries(filters: {
      status?: JobStatus;
      workMode?: string;
      q?: string;
    }): Promise<string[]> {
      // ... query applique workMode et q via regex (slice(0, 200) inclus)
    }
    // InboxPage:
    getAvailableCountries({ status: "INBOX", workMode, q })
    ```

---

### N-001 / C-004 — useState initializer simplifié

- **Applied_to** : `§Étape 6 / Suppressions`
- **Change_summary** : Suppression du corps de l'initializer `useState(() => { initialJobs.forEach... })` — remplacé par `useState(new Set<string>())`. Le useEffect gère l'initialisation sur tous les renders.
- **Proof** :
  - Before: `useState(() => { const s = new Set<string>(); initialJobs.forEach(...); return s; })` + `useEffect([initialJobs])`
  - After: `useState(new Set<string>())` + `useEffect([initialJobs])` (unique source de vérité)

---

### N-002 / C-005 — router.push documenté

- **Applied_to** : `§Architecture / Data flow / Flux écriture (changement de page)`
- **Change_summary** : Note explicite ajoutée expliquant le choix `router.push` vs `router.replace` pour `handlePageChange`.
- **Proof** :
  - Before: `router.push` utilisé sans justification
  - After: Note ajoutée : "utilise `router.push` intentionnellement — chaque page est une position bookmarkable et navigable via le bouton 'Back'. Asymétrique avec les filtres (`router.replace`) : changement de page = étape de navigation, changement de filtre = non."

---

### N-003 / C-006 — overhead getAvailableCountries documenté

- **Applied_to** : `§Architecture / Performance`, `§Stratégie de solution / Trade-offs acceptés`
- **Change_summary** : Mention explicite que `getAvailableCountries` s'exécute à chaque render InboxPage (y compris changements de page) — overhead accepté pour usage personnel.
- **Proof** :
  - Before: Non mentionné
  - After: "requête DB exécutée à chaque render InboxPage, y compris sur navigation paginée. Pour un usage personnel (<1000 jobs), l'overhead est négligeable. Trade-off accepté en faveur de la simplicité."

---

### N-004 / C-007 — guard longueur q

- **Applied_to** : `§Étape 1` (getJobs et getAvailableCountries), `§Edge cases`
- **Change_summary** : `filters.q.trim().slice(0, 200)` ajouté avant la construction de la regex dans les deux fonctions.
- **Proof** :
  - Before: `const escaped = filters.q.trim().replace(...)`
  - After: `const trimmed = filters.q.trim().slice(0, 200); const escaped = trimmed.replace(...)`

---

### N-005 / C-008 — cap limit à 100

- **Applied_to** : `§Étape 2 / route.ts`, `§API / Permissions`
- **Change_summary** : `Math.min(..., 100)` appliqué sur `limit` dans route.ts. Mention "max 100" dans la table API.
- **Proof** :
  - Before: `const limit = isNaN(rawLimit) ? 20 : Math.max(1, rawLimit);`
  - After: `const limit = Math.min(isNaN(rawLimit) ? 20 : Math.max(1, rawLimit), 100);`

---

### N-006 / C-009 — pathname retiré des deps DesktopHeader

- **Applied_to** : `§Étape 4bis`, `§Architecture / Data flow / Flux recherche`
- **Change_summary** : `pathname` retiré des dépendances du useEffect. `window.location.pathname` utilisé dans le corps (valeur instantanée, non réactive). Import `usePathname` supprimé.
- **Proof** :
  - Before: `}, [debouncedSearchQuery, router, searchParams, pathname]);`
  - After: `router.replace(\`${window.location.pathname}${query}\`, { scroll: false }); }, [debouncedSearchQuery, router, searchParams]);`

---

### N-007 / C-012 — constante INBOX_PAGE_SIZE

- **Applied_to** : `§Étape 0 (nouvelle)`, `§Données & Source de vérité`, `§Étape 4`, `§Étape 6`
- **Change_summary** : Étape 0 ajoutée pour créer `lib/constants.ts` avec `export const INBOX_PAGE_SIZE = 20`. Importé dans InboxPage, InboxView, getJobs (default limit).
- **Proof** :
  - Before: `20` hardcodé dans InboxPage (`limit: 20`, `pageSize={20}`), dans getJobs (`filters.limit ?? 20`), dans InboxView (`Math.ceil(total / pageSize)`)
  - After: `INBOX_PAGE_SIZE` importé partout depuis `lib/constants.ts`

---

### N-008 / C-011 — dark mode disabled hover

- **Applied_to** : `§Étape 5 / Styles`
- **Change_summary** : `dark:disabled:hover:bg-slate-800` ajouté à `btnNav` pour empêcher le changement de fond en dark mode sur hover d'un bouton disabled.
- **Proof** :
  - Before: `btnNav = "... disabled:opacity-40 disabled:cursor-not-allowed"`
  - After: `btnNav = "... disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800"`

---

### C-003 — race condition visitedIds + router.refresh

- **Applied_to** : `§Risques & mitigations`
- **Change_summary** : Risque documenté dans §Risques comme "faible, accepté, auto-corrigé".
- **Proof** :
  - Before: Non mentionné
  - After: Ligne ajoutée : "Race condition `handleVisit` + `router.refresh()` (Undo) | Faible | Si l'API `/api/jobs/:id/visit` n'a pas encore persisté avant le refresh, marqueur 'vu' disparaît temporairement. Auto-corrigé au rechargement suivant. Fréquence très faible. Documenté comme risque accepté."

---

### C-010 — handleClearFilters confirmé compatible

- **Applied_to** : `§Étape 6`, `§Edge cases`
- **Change_summary** : Note explicite dans §Étape 6 et §Edge cases confirmant que `handleClearFilters` (existant) fonctionne sans modification après la feature.
- **Proof** :
  - Before: Non mentionné
  - After: "Compatibilité `handleClearFilters` : `router.replace(pathname)` supprime ALL params dont `?page`. Aucune modification requise, comportement correct après la feature."

---

## Coverage

- **Accepted** : 22 (10 AUDIT + 12 CHALLENGE — avec déduplication des items identiques)
- **Applied** : 22
- **Partially applied** : 0
- **Rejected** : 0
- **Open questions** : Aucune — Q1=A (filtres dans getAvailableCountries), Q2=push documenté, Q3=overhead accepté
- **Notes** : Les items CHALLENGE dupliquant des items AUDIT (C-001=A-002, C-002=A-001, C-004=N-001, etc.) sont comptés une seule fois dans les proofs mais confirmés dans le triage. La spec v3 est auto-suffisante pour implémentation.
