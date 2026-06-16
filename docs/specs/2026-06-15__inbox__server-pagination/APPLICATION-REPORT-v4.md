# Application Report — 2026-06-15__inbox__server-pagination (v3 → v4)

## Triage

### Depuis AUDIT v3

- **N-001** → ACCEPT (Q1=A) — `isEasyApply` ajouté à la signature de `getAvailableCountries` et passé depuis InboxPage
- **N-002** → ACCEPT — comportement BulkClean page-scopé documenté dans §Fonctionnel #17 et §Risques
- **N-003** → ACCEPT — §Étape 0 corrigée : "InboxView" retiré de la liste d'imports (utilise prop `pageSize`)
- **N-004** → ACCEPT — import `INBOX_PAGE_SIZE` ajouté en tête du bloc §Étape 1
- **N-005** → ACCEPT — note non-optimiste `updateSidebarCount` ajoutée dans §Étape 6 / handleUndoTrash

---

## Application proofs

### N-001 — `isEasyApply` dans `getAvailableCountries`

- **Applied_to** : `§Résumé exécutable`, `§Fonctionnel détaillé #15`, `§Étape 1`, `§Étape 4`, `§Architecture / Data flow (tableau + flux lecture + flux filtre + flux changement de page)`, `§Mermaid`
- **Change_summary** : Signature étendue avec `isEasyApply?: boolean`, filtre DB appliqué, appel InboxPage mis à jour, toutes les occurrences de `getAvailableCountries` dans la spec mises à jour.
- **Proof** :
  - Before: `getAvailableCountries(filters: { status?, workMode?, q? })` / appel: `getAvailableCountries({ status: "INBOX", workMode, q })`
  - After:
    ```typescript
    export async function getAvailableCountries(filters: {
      status?: JobStatus;
      workMode?: string;
      q?: string;
      isEasyApply?: boolean; // ← AJOUT
    }): Promise<string[]> {
      // ...
      if (filters.isEasyApply === true) query.isEasyApply = true; // ← AJOUT
    }
    // InboxPage:
    getAvailableCountries({ status: "INBOX", workMode, q, isEasyApply }) // ← AJOUT
    ```

---

### N-002 — BulkClean page-scopé documenté

- **Applied_to** : `§Fonctionnel détaillé`, `§Risques & mitigations`, `§Résumé exécutable`
- **Change_summary** : Item #17 ajouté dans §Fonctionnel détaillé. Ligne ajoutée dans §Risques.
- **Proof** :
  - Before: Non mentionné
  - After:
    - §Fonctionnel #17: "BulkClean scope : `visitedIds` est re-syncé depuis `initialJobs` (page courante uniquement). En conséquence, `handleBulkClean` ne nettoie que les offres visitées de la page affichée. [...]"
    - §Risques: `| BulkClean ne nettoie que la page courante | Accepté | Comportement voulu avec la pagination ; l'utilisateur nettoie page par page |`

---

### N-003 — Import `INBOX_PAGE_SIZE` dans §Étape 0 corrigé

- **Applied_to** : `§Étape 0`
- **Change_summary** : "InboxView" retiré de la liste d'imports. Note explicite ajoutée : "`InboxView` utilise la prop `pageSize` — pas d'import direct nécessaire."
- **Proof** :
  - Before: "Importer dans : `server/jobs.service.ts`, `app/(tabs)/inbox/page.tsx`, `components/InboxView.tsx` (calcul totalPages)"
  - After: "Importer dans : `server/jobs.service.ts` / `app/(tabs)/inbox/page.tsx`. Note : `InboxView` utilise la prop `pageSize` — pas d'import direct nécessaire."

---

### N-004 — Import `INBOX_PAGE_SIZE` dans snippet §Étape 1

- **Applied_to** : `§Étape 1`
- **Change_summary** : Bloc "Ajouter en tête du fichier" ajouté avant le snippet `getJobs`.
- **Proof** :
  - Before: snippet `getJobs` commence directement avec `export async function getJobs(filters: {`
  - After:
    ```typescript
    // Ajouter en tête de server/jobs.service.ts :
    import { INBOX_PAGE_SIZE } from "@/lib/constants";
    ```

---

### N-005 — Note non-optimiste `updateSidebarCount` dans handleUndoTrash

- **Applied_to** : `§Étape 6 / handleUndoTrash`
- **Change_summary** : Commentaire inline + note explicative après le snippet.
- **Proof** :
  - Before: `updateSidebarCount(1);` sans contexte
  - After:
    ```typescript
    updateSidebarCount(1); // Appelé APRÈS succès API (non-optimiste — cohérent avec Q5:B)
    ```
    + Note : "dans la version actuelle du repo, `updateSidebarCount(1)` est appelé avant l'API (optimiste). Le changement ici le place après — délai ~200ms avant mise à jour du compteur sidebar. Acceptable car `router.refresh()` recharge de toute façon la vue."

---

## Coverage

- **Accepted** : 5
- **Applied** : 5
- **Partially applied** : 0
- **Rejected** : 0
- **Open questions** : Aucune — Q1=A (isEasyApply dans getAvailableCountries), Q2=A (BulkClean documenté)
- **Notes** : Tous les non-blockers de l'audit v3 sont traités. La spec v4 est auto-suffisante pour implémentation immédiate.
