# Application Report — 2026-06-15__inbox__server-pagination

## Triage

- **B-001** → ACCEPT — DesktopHeader ajouté à l'in-scope, Étape 4bis créée avec `current.delete("page")` et correction `pathname + query`
- **B-002** → ACCEPT (Q1:A) — `prevCountRef.current` mis à jour APRÈS le guard page > 1 ; delta préservé en attente
- **B-003** → ACCEPT — `useEffect` de sync `visitedIds` ajouté dans §Étape 6
- **N-001** → ACCEPT (Q3:A) — param uniformisé en `mode` partout (route.ts, table API, exemple URL)
- **N-002** → ACCEPT — NaN guard `isNaN(rawPage) ? 1 : Math.max(1, rawPage)` dans §Étape 1 et §Étape 4
- **N-003** → ACCEPT — `handlePageChange` utilise `const search = current.toString(); const query = search ? \`?${search}\` : ""; router.push(\`${pathname}${query}\`)` 
- **N-004** → ACCEPT — snippet `getJobs` encapsulé dans `withMongo(async (db) => { ... })` complet
- **N-005** → ACCEPT (Q2:A) — wireframe mobile ajouté §Schémas ; `hidden sm:flex` sur boutons first/last et numéros de page ; label compact `"Page N / Total"` visible mobile uniquement

---

## Application proofs

### B-001 — DesktopHeader reset page

- **Applied_to** : `§Périmètre/In-scope`, `§Fonctionnel détaillé #7`, `§Architecture/Data flow/Flux recherche`, `§Étape 4bis (nouvelle)`
- **Change_summary** : Ajout de `components/DesktopHeader.tsx` dans l'in-scope. Nouvelle étape 4bis décrivant la modification du `useEffect` pour supprimer `?page` et corriger l'URL edge case.
- **Proof** :
  - Before: DesktopHeader absent de l'in-scope ; `router.replace(query || "?")` sans delete page
  - After: In-scope inclut `components/DesktopHeader.tsx : reset \`?page\` lors d'un changement de \`?q\``
    ```typescript
    current.delete("page"); // ← AJOUT : reset pagination sur nouvelle recherche
    // ...
    router.replace(`${pathname}${query}`, { scroll: false }); // pathname au lieu de "?"
    ```

### B-002 — prevCountRef race condition

- **Applied_to** : `§Fonctionnel détaillé #11`, `§Schéma de flux Mermaid`, `§Étape 7`, `§Risques`
- **Change_summary** : `prevCountRef.current = count` déplacé APRÈS le guard `currentPageInUrl > 1`. Ajout commentaire explicatif "delta en attente".
- **Proof** :
  - Before:
    ```typescript
    if (count !== prevCountRef.current) {
      prevCountRef.current = count; // ← AVANT le guard
      if (currentPageInUrl > 1) return;
      router.refresh();
    }
    ```
  - After:
    ```typescript
    if (count !== prevCountRef.current) {
      if (currentPageInUrl > 1) {
        // Ne PAS mettre à jour prevCountRef ici
        return;
      }
      prevCountRef.current = count; // ← APRÈS le guard
      router.refresh();
    }
    ```

### B-003 — visitedIds sync

- **Applied_to** : `§Fonctionnel détaillé #13`, `§Edge cases`, `§Étape 6/Ajouts`
- **Change_summary** : Ajout d'un `useEffect([initialJobs])` qui re-crée le Set visitedIds à chaque changement de page.
- **Proof** :
  - Before: Aucun useEffect pour visitedIds ; seul l'initializer `useState(() => {...})` existait
  - After:
    ```typescript
    useEffect(() => {
      const newSet = new Set<string>();
      initialJobs.forEach((job) => {
        if (job.visitedAt) newSet.add(job.id);
      });
      setVisitedIds(newSet);
    }, [initialJobs]);
    ```

### N-001 — Uniformisation param `mode`

- **Applied_to** : `§API/Permissions`, `§Étape 2`
- **Change_summary** : Param renommé `mode` partout. `route.ts` lit `searchParams.get("mode")` et le passe comme `workMode` à `getJobs`.
- **Proof** :
  - Before: Table API = `workMode`, exemple URL = `mode=remote` (incohérent)
  - After: Table API = `mode (workMode)`, exemple URL = `mode=remote`, route.ts: `const mode = searchParams.get("mode"); getJobs({ workMode: mode, ... })`

### N-002 — NaN guard

- **Applied_to** : `§Étape 1`, `§Étape 4`, `§Edge cases`
- **Change_summary** : `isNaN` check avant `Math.max` dans InboxPage et dans `getJobs`. Edge case `?page=abc` documenté.
- **Proof** :
  - Before: `const page = Math.max(1, parseInt(params.page ?? "1", 10));` (Math.max(1, NaN) = NaN)
  - After:
    ```typescript
    const rawPage = parseInt(params.page ?? "1", 10);
    const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
    ```

### N-003 — Trailing `?` fix

- **Applied_to** : `§Étape 6/Ajouts (handlePageChange)`
- **Change_summary** : Pattern identique à `updateUrlParams` existant.
- **Proof** :
  - Before: `router.push(\`${pathname}?${current.toString()}\`, { scroll: false })`
  - After:
    ```typescript
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`, { scroll: false });
    ```

### N-004 — withMongo wrapper

- **Applied_to** : `§Étape 1`
- **Change_summary** : Snippet `getJobs` réécrit avec `withMongo(async (db) => { ... })` complet, incluant le mapping et le `Promise.all`.
- **Proof** :
  - Before: Snippet montrait `db.collection(...).find(...)` sans wrapper
  - After: Snippet complet avec `const { items, total } = await withMongo(async (db) => { const [rawItems, total] = await Promise.all([...]); return { items: mapped, total }; });`

### N-005 — Wireframe mobile + Pagination responsive

- **Applied_to** : `§Schémas` (nouveau §Schéma UI Mobile), `§Étape 5` (JSX responsive), `§Fonctionnel détaillé #8`
- **Change_summary** : Wireframe mobile ajouté. Composant Pagination avec `hidden sm:flex` sur boutons first/last et numéros, label `"Page N / Total"` sur mobile uniquement.
- **Proof** :
  - Before: Un seul wireframe desktop, Pagination sans classes responsives
  - After: Wireframe mobile distinct ; JSX avec `className="hidden sm:flex"` sur ChevronsLeft/ChevronsRight et `<div className="hidden sm:flex items-center gap-1">` pour les numéros ; `<span className="flex sm:hidden ...">Page {currentPage} / {totalPages}</span>`

---

## Coverage

- **Accepted** : 8
- **Applied** : 8
- **Partially applied** : 0
- **Rejected** : 0
- **Open questions** : Aucune — Q1 (B-002→A), Q2 (N-005→A), Q3 (N-001→A) résolues avec les options recommandées
- **Notes** : Toutes les suggestions de l'audit ont été intégrées. La spec v2 est auto-suffisante pour implémentation. Lancer `/spec-3-audit` pour vérification finale ou procéder à l'implémentation.
