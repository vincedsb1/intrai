---
id: 2026-06-15__inbox__server-pagination
audited_version: 3
status: PASS
score: 88
date: 2026-06-15
---

# Audit — 2026-06-15__inbox__server-pagination (v3)

## Résumé

**PASS — 0 blocker, 5 non-blockers.**

La spec v3 résout les 2 blockers de l'audit v2 : `visitedCount` est explicitement recalculé depuis `jobs` (A-001), et `getAvailableCountries` accepte désormais `workMode`+`q` pour ne retourner que les pays pertinents (A-002). Les 8 non-blockers sont également traités (constante centralisée, guard `q`, cap `limit`, dark mode disabled, router.push documenté, etc.). Les schémas sont complets (desktop + mobile + états + Mermaid), le plan en 8 étapes est précis, les edge cases couverts, rollback documenté.

Cinq non-blockers subsistent : (1) `isEasyApply` et `country` ne sont pas passés à `getAvailableCountries` — cohérence partielle du dropdown pays ; (2) `handleBulkClean` ne nettoie que la page courante avec la pagination, comportement non documenté ; (3) `INBOX_PAGE_SIZE` mentionné comme import dans `InboxView` alors que `pageSize` vient des props ; (4) `handleUndoTrash` — `updateSidebarCount` désormais non-optimiste (après API) — changement silencieux ; (5) snippet §Étape 1 n'inclut pas l'import de `INBOX_PAGE_SIZE` dans `jobs.service.ts`. Aucun de ces points ne bloque l'implémentation.

---

## Checks bloquants (blocking_gaps)

Aucun.

---

## Checks non bloquants (non_blocking_gaps)

**N-001 [Architecture] — `isEasyApply` et `country` absents de `getAvailableCountries`**
- **What** : `getAvailableCountries` accepte maintenant `workMode` et `q` mais pas `isEasyApply` ni `country`. Si l'utilisateur a `?easy=true&country=France`, le dropdown pays affiche tous les pays des offres remote (workMode filtrée) mais incluant des pays sans offres easy-apply. Cliquer un pays sans offre easy-apply retourne 0 résultats.
- **Why** : Cohérence partielle du dropdown pays — meilleure qu'avant (A-002 fixé pour les cas courants) mais pas totale. L'A-002 ciblait surtout `mode`+`q` comme filtres courants. Le filtre `easy` est binaire (faible prévalence), `country` est le filtre sélectionné dans le dropdown lui-même (le dropdown ne peut pas auto-filtrer sur son propre filtre).
- **Fix** : Ajouter `isEasyApply?: boolean` à la signature de `getAvailableCountries` et passer `isEasyApply` depuis `InboxPage`. Le filtre `country` n'est pas applicable (le dropdown pays ne se filtre pas sur lui-même).
- **Target** : `## Étape 1`, `## Étape 4`

**N-002 [UX] — Comportement de `handleBulkClean` avec pagination non documenté**
- **What** : Avec la pagination, `jobs` = 20 items de la page courante. `visitedIds` est re-syncé depuis `initialJobs` (page courante). En conséquence, `handleBulkClean` ne nettoie que les offres visitées de la **page courante**. Si l'utilisateur a visité des jobs sur la page 1 puis navigue en page 2, le bouton "Nettoyer" sur la page 2 ne traite pas les jobs visités de la page 1.
- **Why** : Ce changement comportemental est significatif par rapport à l'ancienne implémentation (qui nettoyait TOUS les jobs visités en mémoire). Non documenté dans §Fonctionnel détaillé ni §Risques.
- **Fix** : Ajouter dans §Fonctionnel détaillé #16 : "BulkClean Toast ne présente que les jobs visités de la **page courante** (scopé à `jobs` de la page). Les jobs visités sur d'autres pages ne sont pas nettoyés depuis cette vue." Et dans §Risques : "Utilisateur peut avoir des jobs visités non nettoyés sur d'autres pages (pagination scopée visitedIds)."
- **Target** : `## Fonctionnel détaillé`, `## Risques & mitigations`

**N-003 [Architecture] — Import `INBOX_PAGE_SIZE` dans `InboxView` superflu**
- **What** : §Étape 0 indique "Importer dans `InboxPage`, `InboxView` (calcul totalPages), et comme default dans `getJobs`." Mais dans `InboxView`, `totalPages = Math.ceil(total / pageSize)` utilise la prop `pageSize` — pas directement `INBOX_PAGE_SIZE`. L'import dans `InboxView` n'est pas nécessaire.
- **Why** : Instruction trompeuse pour l'implémenteur.
- **Fix** : Corriger §Étape 0 : "Importer dans `InboxPage` (passé comme prop `pageSize` et comme `limit`) et dans `server/jobs.service.ts` (default `limit`). `InboxView` utilise la prop `pageSize` — pas d'import direct nécessaire."
- **Target** : `## Étape 0`

**N-004 [Architecture] — Import `INBOX_PAGE_SIZE` absent du snippet §Étape 1**
- **What** : Le snippet de `getJobs` dans §Étape 1 utilise `INBOX_PAGE_SIZE` (ligne `const limit = filters.limit ?? INBOX_PAGE_SIZE`) mais n'inclut pas la déclaration `import { INBOX_PAGE_SIZE } from "@/lib/constants"` en tête du fichier. L'implémenteur pourrait oublier cet import.
- **Why** : `server/jobs.service.ts` n'importe actuellement rien depuis `lib/constants` — l'import est nouveau.
- **Fix** : Ajouter en tête du snippet §Étape 1 : `import { INBOX_PAGE_SIZE } from "@/lib/constants";`
- **Target** : `## Étape 1`

**N-005 [UX] — `updateSidebarCount(1)` dans `handleUndoTrash` désormais non-optimiste**
- **What** : Dans la version actuelle du repo, `handleUndoTrash` appelle `updateSidebarCount(1)` AVANT l'appel API (feedback immédiat). Le snippet de la spec appelle `updateSidebarCount(1)` APRÈS `await fetch(...)`. Pendant le temps de l'appel API, le compteur sidebar reste incorrect (n'a pas encore été restauré).
- **Why** : Changement comportemental silencieux — cohérent avec l'approche "non-optimiste" du Undo (Q5:B), mais non documenté explicitement.
- **Fix** : Ajouter une note dans §Étape 6 / handleUndoTrash : "Note : `updateSidebarCount(1)` est appelé après le succès API (non-optimiste) — cohérent avec Q5:B où le Undo est server-authoritative. Le sidebar se met à jour après ~200ms (temps API) plutôt qu'immédiatement."
- **Target** : `## Étape 6 / handleUndoTrash`

---

## Questions (copiable)

```text
Q1 [N-001] Passer isEasyApply à getAvailableCountries ?
   A) Oui — ajouter isEasyApply à la signature et passer depuis InboxPage
   B) Non — accepter l'incohérence partielle (cas easy=true rare, impact faible)

Q2 [N-002] Documenter le comportement BulkClean page-scopée dans §Fonctionnel ?
   A) Oui — ajouter note #16bis + §Risques
   B) Non — comportement implicite avec la pagination, laissez tel quel
```

---

## Repo mismatches (détectés)

| Spec dit | Repo montre |
|----------|------------|
| §Étape 4bis : `router.replace(\`${window.location.pathname}${query}\`)` | `DesktopHeader.tsx:41` — `router.replace(query \|\| "?")` — bug non encore corrigé (attendu, sera fixé à l'implémentation) |
| §Étape 6 : `const visitedCount = jobs.filter(...)` | `InboxView.tsx:165` — `const visitedCount = baseInboxJobs.filter(...)` — attendu, sera corrigé |
| §Étape 0 : `lib/constants.ts` avec `INBOX_PAGE_SIZE` | Fichier absent du repo — sera créé |
| §Étape 5 : `components/Pagination.tsx` | Fichier absent — sera créé |
| `getJobs()` retourne `{ items, total }` | `server/jobs.service.ts:9` — retourne `Job[]` directement — sera mis à jour |
| `getAvailableCountries()` | Absente de `server/jobs.service.ts` — sera créée |

Tous ces mismatches sont attendus (spec non encore implémentée) et correctement couverts par le plan.

---

## Suggested edits (patchs textuels)

### Fix N-001 — Ajouter `isEasyApply` à `getAvailableCountries` (si Q1=A)

**Target §Étape 1** — modifier la signature :

```typescript
export async function getAvailableCountries(filters: {
  status?: JobStatus;
  workMode?: string;
  q?: string;
  isEasyApply?: boolean; // ← AJOUT
}): Promise<string[]> {
  return await withMongo(async (db) => {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.status === "INBOX") query.category = { $ne: "FILTERED" };
    if (filters.workMode && filters.workMode !== "all") query.workMode = filters.workMode;
    if (filters.isEasyApply === true) query.isEasyApply = true; // ← AJOUT
    if (filters.q?.trim()) {
      const trimmed = filters.q.trim().slice(0, 200);
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: new RegExp(escaped, "i") }, { company: new RegExp(escaped, "i") }];
    }
    // ...
  });
}
```

**Target §Étape 4** — mettre à jour l'appel :

```typescript
getAvailableCountries({ status: "INBOX", workMode, q, isEasyApply })
```

### Fix N-002 — Documenter BulkClean page-scopée

**Target §Fonctionnel détaillé** — après item #16, ajouter :

```
16bis. BulkClean Toast : `visitedCount` et le nettoyage sont scopés à la page courante.
  Les jobs visités sur d'autres pages ne sont pas comptés ni nettoyés depuis la vue actuelle.
  Comportement attendu avec la pagination — l'utilisateur nettoie page par page.
```

**Target §Risques** — ajouter ligne :

```
| Jobs visités sur page N non nettoyés depuis page M | Faible | Comportement voulu avec pagination. L'utilisateur revient sur chaque page pour nettoyer. |
```

### Fix N-004 — Ajouter import dans snippet §Étape 1

**Target §Étape 1** — en tête du bloc de code `getJobs` :

```typescript
// Ajouter en haut de server/jobs.service.ts :
import { INBOX_PAGE_SIZE } from "@/lib/constants";
```

---

## Verdict

**PASS**

- Schémas : ✓ Desktop + Mobile + États + Mermaid (complets, utilisables)
- Blockers : 0
- Tests/doc/rollback : ✓ documentés et justifiés
- Périmètre : ✓ clair (in/out définis)
- Stratégie : ✓ HYBRID cohérente avec le plan

Les 5 non-blockers sont corrigeables en quelques lignes chacun (Q1 et Q2 sont les seules décisions ouvertes). La spec est prête pour implémentation dans l'état actuel. Si Q1=A, un `/spec-5-revise` rapide consolide en v3.1 avant implémentation — optionnel.

→ Tu peux implémenter directement (sans revise), ou lancer **/spec-5-revise** pour les deux questions optionnelles.
