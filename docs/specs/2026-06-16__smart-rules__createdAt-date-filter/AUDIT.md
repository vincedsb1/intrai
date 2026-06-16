---
id: 2026-06-16__smart-rules__createdAt-date-filter
audited_version: 1
status: PASS
score: 90
date: 2026-06-16
---

# Audit — Smart Rules Date Filter (createdAt)

## Résumé
✅ **PASS** — Spec est solide, complète et prête pour implémentation. 
**Points forts** : Schémas clairs (UI + flux), 7 étapes précises avec code snippets, tests couverts (unit + intégration), risques identifiés et mitigés, documentation adéquate. 
**Suggestions** : 5 clarifications mineures sur les imports, type signatures, et edge cases — aucune bloquante, utiles pour éviter surprise lors du coding.

---

## Checks bloquants
_[Aucun]_

---

## Checks non bloquants

### N-001 [Architecture] Imports & setup Vitest incomplets
**Qu'est-ce que** : Code des tests utilise `vi.useFakeTimers()` sans import explicite de Vitest.  
**Impact** : Dev peut oublier `import { describe, it, expect, vi } from "vitest"`.  
**Fix** : Ajouter bloc import au top du snippet Étape 5.  
**Target section** : Étape 5 — Tests, bloc code `rules.engine.test.ts`

```typescript
// AJOUTER AU TOP du code :
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

---

### N-002 [DataModel] Magic number -1 dans calculateAgeInDays
**Qu'est-ce que** : Fonction retourne `-1` si createdAt invalide, logique implicite.  
**Impact** : Code moins maintenable. Futur dev peut ne pas comprendre pourquoi -1 break olderThan.  
**Fix** : Ajouter constante `const INVALID_AGE = -1;` en top du module. JSDoc sur fonction.  
**Target section** : Étape 2 — Engine, avant `calculateAgeInDays()`

```typescript
// Constante pour signaler createdAt invalide
const INVALID_AGE = -1;

/**
 * Calcule l'âge d'une offre en jours (UTC).
 * @param createdAt Date de création (Date ou string ISO)
 * @returns Nombre de jours (>= 0), ou INVALID_AGE si invalide
 */
function calculateAgeInDays(createdAt: Date | string | null | undefined): number {
  if (!createdAt) return INVALID_AGE;
  // ... reste inchangé
}
```

---

### N-003 [UX] getOperatorOptionsForField() plumbing incomplet
**Qu'est-ce que** : Étape 3 montre la fonction helper mais pas comment elle est utilisée dans le rendu.  
**Impact** : Dev doit deviner comment adapter le select d'operator.  
**Fix** : Ajouter un snippet montrant comment le select utilise `getOperatorOptionsForField(condition.field)`.  
**Target section** : Étape 3 — UI Modal, après la définition de `getOperatorOptionsForField`

```typescript
{/* Opérateur — adapter selon le field */}
<select
  value={condition.operator}
  onChange={(e) =>
    updateCondition(condition.id, "operator", e.target.value)
  }
  className="..."
>
  {getOperatorOptionsForField(condition.field).map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

---

### N-004 [Tests] Setup intégration tests unclear
**Qu'est-ce que** : Snippet intégration appelle `settings.updateSettings()` + `jobs.findOne()` sans setup/setup mocking.  
**Impact** : Dev peut ne pas savoir si tests utilisent DB réelle ou mock, comment initialiser.  
**Fix** : Ajouter commentaire ou note sur la stratégie : "Supposé utiliser DB réelle (ou @databases-test mock si dispo)".  
**Target section** : Étape 5 — Tests, avant bloc intégration

```markdown
**Intégration tests** (supposé avec DB réelle ou mock intégration Vitest) :
```

---

### N-005 [Types] RuleCondition.value validation côté client unstated
**Qu'est-ce que** : Type change de `string | string[]` à `string | string[] | number`, mais aucune note sur validation.  
**Impact** : Dev peut se demander s'il faut valider `value` dans Modal.  
**Fix** : Ajouter note dans Étape 1 ou Étape 3 : "Input type='number' force validation côté client ; no extra validation needed".  
**Target section** : Étape 1 — Types, après la définition de RuleCondition

```markdown
**Note** : Pour createdAt, `value` est un nombre (jours). 
Input `type="number"` dans Modal (Étape 3) force la validation côté client.
```

---

### N-006 [Docs] newerThan placeholder manquant
**Qu'est-ce que** : Spec architecture pour numeric fields futurs, mais section docs ne mentionne pas newerThan.  
**Impact** : Dev futur qui ajoute newerThan oublie de mettre à jour docs.  
**Fix** : Dans docs/17_FEATURE_SMART_RULES.md §7, ajouter ligne : "Opérateur futur : `newerThan` (offres récentes) — [architecture ready]".  
**Target section** : Étape 6 — Documentation, section §7

```markdown
### Opérateurs supportés
- `"olderThan"` (v1.1) : Offres créées il y a >= N jours
- `"newerThan"` (future) : Offres créées il y a <= N jours — architecture ready
```

---

### N-007 [Edge case] Old rules sans createdAt restent valides
**Qu'est-ce que** : Spec dit "non-breaking" mais ne documente pas explicitement.  
**Impact** : Dev peut craindre que rules anciennes cassent.  
**Fix** : Ajouter une ligne dans la section Compat.  
**Target section** : Étape 1 ou Schémas, section "Compat & breaking changes"

```markdown
✅ **Règles existantes sans createdAt** : Restent valides, ignorées lors filtrage (ne matchent pas olderThan). Zero impact.
```

---

### N-008 [Performance] calculateAgeInDays précision ceil() justification
**Qu'est-ce que** : Code utilise `Math.ceil()` pour arrondir à la hausse, justification = inclusif.  
**Impact** : Logique correcte mais pas expliquée.  
**Fix** : Ajouter JSDoc sur la fonction avec exemple.  
**Target section** : Étape 2, sur calculateAgeInDays

```typescript
/**
 * Calcule l'âge d'une offre en jours (UTC), arrondi à la hausse.
 * Ex: Job créé à 23h59 aujourd'hui → age = 0 jours
 *     Job créé à 00h01 hier → age = 1 jour
 * @returns Nombre entier >= 0, ou INVALID_AGE si null
 */
function calculateAgeInDays(...
```

---

### N-009 [Schémas] Flux Mermaid: API method not specified
**Qu'est-ce que** : Flux dit "POST /api/settings" mais ne mentionne la méthode dans l'étape de sauvegarde (PUT vs PATCH vs POST).  
**Impact** : Mineur — code use PATCH existant, mais diagramme dit POST.  
**Fix** : Changer "POST" → "PATCH" dans Mermaid et ajouter note "réutilise endpoint existant".  
**Target section** : Schéma de flux (Mermaid)

```mermaid
D --> E["Serveur sauvegarde<br/>dans Settings.rules<br/>(PATCH /api/settings)"]
```

---

### N-010 [Documentation] Timezone rationale insufficient
**Qu'est-ce que** : Spec dit "UTC" mais ne documente pas la décision (pourquoi pas local ?).  
**Impact** : Très mineur — intégré dans specs.  
**Fix** : Ajouter ligne dans ARCHITECTURE.md update.  
**Target section** : Étape 6 — Docs, section ARCHITECTURE.md

```markdown
**Timezone strategy** : UTC (cohérent avec MongoDB, server-side evaluation). 
Limitation : Age calculé en UTC peut décaler d'une journée pour utilisateurs hors UTC.
Acceptable pour ce use-case (filtrage offres, pas time-sensitive).
```

---

## Questions
```text
Q1 [Tests] Vitest setup : Utilisez-vous une fixture "beforeAll" pour initialiser Settings collection une fois, 
ou "beforeEach" pour reset entre tests ? (Suggestion: beforeEach pour isolation)

Q2 [Edge case] Que se passe-t-il si Job.createdAt est une string ISO invalide ? 
(Code suppose date valide, peut break si DB corrompue — acceptable ?)

Q3 [Operator scope] V1 implémente juste "olderThan". L'ajout de "newerThan" v1.x nécessitera une migration de code 
ou une réversion complet ? (Réponse attendue : juste ajouter opérateur, aucune breaking change)

Q4 [Modal] Quand user change field de "Titre" → "Créé il y a...", l'opérateur sélectionné switch automatiquement vers "olderThan" ? 
(Suggestion: OUI, updateCondition(..., "operator", "olderThan"))

Q5 [Mobile] Input type="number" sur mobile : Affiche clavier numérique OK ? 
(Suggestion: ajouter inputmode="numeric" pour meilleur UX mobile)

Q6 [LocalStorage] Règles stockées en DB, aucun localStorage ? 
(Réponse attendue: correct, Settings est backend source of truth)

Q7 [API validation] Côté serveur /api/settings, validez-vous le type RuleCondition.value (number pour createdAt, string pour autres) ? 
(Suggestion: OUI, zod/validation schema)

Q8 [Rollback] Plan dit "git revert". Quid si version prod a 10 règles createdAt créées ? 
(Elles resteraient en DB mais seraient ignorées lors ingestJob — acceptable)

Q9 [Future] Quand vous ajoutez salary (numeric), réutiliserez-vous calculateAgeInDays pattern ou créerez une fonction générique ? 
(Open question, design decision future)

Q10 [Tests] Intégration tests: Faut-il couvrir "multiple rules with createdAt + other fields, first match wins" ? 
(Suggestion: OUI, ajouter test scenario)
```

---

## Repo mismatches

### M-001 : Résumé exécutable mentionne "newerThan" mais spec dit "olderThan uniquement"
**Détail** : Résumé (ligne 21) dit "opérateurs (`olderThan` / `newerThan`)" mais Out-of-scope (ligne 36) dit "v1 = olderThan uniquement".  
**Clarification** : Résumé doit dire "olderThan (newerThan future)" pour cohérence.  
**Target** : Ligne 21, remplacer "opérateurs (`olderThan` / `newerThan`)" par "opérateur `olderThan` (newerThan future)"

---

## Suggested edits (patchs textuels)

### Edit A — Résumé exécutable clarification
**Location** : Ligne 21  
**Avant** : `opérateurs (`olderThan` / `newerThan`)`  
**Après** : `opérateur `olderThan` (support `newerThan` architecutré pour futur)`

---

### Edit B — Ajouter imports Vitest au Étape 5
**Location** : Étape 5, top du code `rules.engine.test.ts`  
**Ajouter avant `describe`** :
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

---

### Edit C — Étape 2 : Ajouter constante + JSDoc
**Location** : Étape 2, avant `function calculateAgeInDays`  
**Ajouter** :
```typescript
const INVALID_AGE = -1; // Signifie createdAt invalide/null

/**
 * Calcule l'âge d'une offre en jours (UTC), arrondi ceil (inclusif).
 * Exs: Créé à 23h59 aujourd'hui → 0 jours
 *      Créé hier → 1 jour
 * @returns Nombre entier >= 0, ou INVALID_AGE (-1) si invalide
 */
```

---

### Edit D — Étape 3 : Clarifier getOperatorOptionsForField usage
**Location** : Étape 3, après définition `getOperatorOptionsForField`  
**Ajouter snippet** :
```typescript
// Adapter le select d'operator pour afficher les opérateurs disponibles selon le field
<select
  value={condition.operator}
  onChange={(e) =>
    updateCondition(condition.id, "operator", e.target.value)
  }
  className="w-1/4 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-100"
>
  {getOperatorOptionsForField(condition.field).map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

---

### Edit E — Étape 3 : Ajouter inputmode pour mobile
**Location** : Étape 3, input type="number"  
**Ajouter** : `inputmode="numeric"`
```typescript
<input
  type="number"
  inputmode="numeric"  // AJOUTER
  value={condition.value as number || ""}
  ...
/>
```

---

### Edit F — Étape 5 : Ajouter note sur DB setup intégration
**Location** : Avant bloc code intégration tests  
**Ajouter** :
```markdown
**Intégration test** (supposé utiliser DB réelle ou Vitest mock) :
```

---

### Edit G — Mermaid : Corriger POST → PATCH
**Location** : Schéma flux, ligne "POST /api/settings"  
**Avant** : `POST /api/settings`  
**Après** : `PATCH /api/settings (réutilise endpoint)`

---

### Edit H — Résumé exécutable : In-scope vs Out-of-scope alignement
**Location** : Périmètre, Out-of-scope, ligne newerThan  
**Ajouter note** :
```markdown
- `newerThan` (offres récentes) : v1 = `olderThan` uniquement ; `newerThan` architecutré pour v1.x
```

---

## Verdict

**STATUS: ✅ PASS**

Critères vérifiés :
- ✅ Schémas clairs et utilisables (UI ASCII + Mermaid flux + types)
- ✅ Zéro blocker (tous les points d'incertitude sont mineurs, clarifications utiles)
- ✅ Tests traités : Unit tests Vitest complets + intégration
- ✅ Documentation : 2 fichiers à mettre à jour, contenu fourni
- ✅ Rollback plan : Simple et efficace (git revert)
- ✅ Périmètre clair : olderThan v1, architecture pour futur
- ✅ Stratégie cohérente : PATCH, non-breaking, localisé

**Score : 90/100**

**Points forts** :
- Étapes d'implémentation précises avec code prêt à copier
- Tests couvrent unit + intégration + edge cases
- 6 risques identifiés avec mitigations

**Suggestions** :
- 8 clarifications mineures (imports, JSDoc, mobile UX, DB setup)
- Tous les edits sont < 5 lignes

---

## Next

✅ **Prêt pour l'implémentation** : Lance `/implement` pour générer une branche et coder les Étapes 1–7.

Ou si tu veux challenger les décisions architecturales : `/spec-4-challenge`.

