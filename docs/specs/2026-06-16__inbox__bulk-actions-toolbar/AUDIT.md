---
id: 2026-06-16__inbox__bulk-actions-toolbar
audited_version: 1
status: FAIL
score: 72
date: 2026-06-16
---

# Audit — Inbox Bulk Actions Toolbar

## Résumé

**Verdict : FAIL** (3 blockers identifiés)

Spec bien structurée, schémas clairs, plan détaillé. Mais **3 gaps bloquants** rendent le plan d'implémentation ambigu :
1. Étape 5 (GET /api/jobs?filterOlderThan=N) est marquée optionnel mais **utilisée obligatoirement** en Étape 2 pour compter les offres (race condition potentielle)
2. **Aucune clarté sur la suppression de SmartRules** — quand user supprime une règle auto-créée dans /settings, les offres FILTERED restent bloquées. C'est attendu ou un bug UX?
3. **Radix UI dépendance** — si npm install échoue, zéro fallback clair (HTML natif? Shadcn?)

Scores par catégorie :
- **Périmètre** : ✅ Clair
- **Schémas** : ✅ Complets (UI, flux, états)
- **Étapes** : ⚠️ Dépendances cachées (Étape 2 ↔ Étape 5)
- **Tests** : ⚠️ Cases manquantes (race conditions, rollback d'offres)
- **API** : ✅ Contrat clair
- **Risques** : ⚠️ Mitigation insuffisante (Radix UI)
- **Docs** : ✅ À jour
- **Rollout** : ⚠️ Rollback incomplet (offres filtrées restent bloquées)

---

## Checks bloquants (blocking_gaps)

### A-001 [BLOCKER] [Architecture]
**Étape 5 optionnel mais utilisé en Étape 2 — dépendance cachée**

- **What** : Spec dit Étape 5 (GET /api/jobs?filterOlderThan=N) est optionnel, mais Étape 2 (FilterOldJobsDialog) l'utilise pour afficher le count estimé au step 2. Si Étape 5 n'est pas implémentée, le dialog affichera `undefined` ou 0.
- **Why** : Lors de la rédaction de SPEC, Étape 5 a été marginalisée comme "optimization optionnelle", mais le flow utilisateur en dépend vraiment.
- **Impact** : Implementation des Étapes 1-4 serait incomplète. Developer aurait du mal à savoir si Étape 5 est vraiment optionnel ou mandatory.
- **Fix** : Reclasser Étape 5 comme **MUST-HAVE** (déplacer avant Étape 2 ou intégrer en Étape 2). OU clarifier que le count step 2 est calculé **côté client après le [Filtrer] final** (mais ce serait incorrect, car on ne compte qu'après PATCH).
- **Target section** : "Plan d'implémentation (étapes stables)" — réordonnancer les étapes ou fusionner Étape 2 + 5.

### A-002 [BLOCKER] [Compatibility / UX Design]
**Suppression de SmartRules auto-créées — offres FILTERED restent bloquées**

- **What** : Spec dit que les utilisateurs peuvent voir la règle auto-créée dans /settings et la supprimer. Mais quand une SmartRule est supprimée via /api/settings PATCH (avec rules[].length--), les offres marquées category=FILTERED ne reviennent **jamais** en INBOX. Elles restent filtrées à jamais.
- **Why** : Les règles s'évaluent lors de l'ingest (ingestJob), pas lors du fetch. Donc si une offre est déjà marquée FILTERED, il n'y a aucun événement qui la re-évalue.
- **Impact** : UX confusion : user crée une règle "Auto: 14 jours", voit 50 offres filtrées, puis supprime la règle dans /settings. Les 50 offres restent invisibles. User pense c'est un bug.
- **Fix** : Clarifier dans la spec que **cette limitation est attendue** (suppression de règles ne libère pas les offres déjà filtrées). Ajouter un warning UX dans /settings : "Suppression d'une règle n'affichera pas les offres déjà filtrées. Contactez support pour une reset."
  OU implémenter un cleanup : quand une règle est supprimée, ré-évaluer toutes les offres FILTERED de cette règle et les marquer INBOX si elles ne matchent plus aucune autre règle.
- **Target section** : "Fonctionnel détaillé" → section "Edge cases" — ajouter "Suppression de règles".

### A-003 [BLOCKER] [Dependencies]
**Radix UI installation peut échouer — zéro fallback clair**

- **What** : Spec impose "@radix-ui/react-dropdown-menu@^2.0.0" en Étape 1, mais ne document aucun fallback si npm install échoue (version conflict, peer deps, etc.).
- **Why** : Dans un vrai projet, Radix peut avoir incompatibilité avec React 19.2.3 ou Tailwind 4, ou version conflict avec autre lib.
- **Impact** : Si Étape 1 échoue, toutes les étapes suivantes bloquées. Developer n'a aucune guidance sur quoi faire.
- **Fix** : Ajouter une section "Fallback if Radix UI install fails" — soit :
  - Option A : Utiliser HTML natif <select> + Tailwind positionnement custom (moins accessible mais fonctionne)
  - Option B : Utiliser Headless UI si déjà dispo (vérifier package.json)
  - Option C : Retarder le choix jusqu'au moment de l'implémentation et documenter les options.
- **Target section** : "Plan d'implémentation — Étape 1" ou section "Risques & mitigations" → élaborer "Radix UI install fails".

---

## Checks non bloquants (non_blocking_gaps)

### B-001 [INFO] [Performance]
**Évaluation O(N) offres lors du PATCH — pas de benchmark réel**

- **What** : Spec dit "Optimiser si N > 1000", mais aucun test benchmark n'a été fait. Nombre réel d'offres INBOX unknow.
- **Fix** : À l'implémentation, mesurer le temps de PATCH avec une vraie base de données (1000+, 10000+, 100000+ jobs). Si > 2s, ajouter indexation ou batch processing.
- **Severity** : Low (risque identifié, mitigation possible post-implémentation).

### B-002 [INFO] [Observabilité]
**Pas de logs — debugging en production sera difficile**

- **What** : Spec dit "Q11: Aucun logs". Si une création de règle échoue silencieusement en prod, aucune trace.
- **Why** : User a choisi "pas de logs" pour simplicité (Q11:C).
- **Fix** : À l'implémentation, ajouter au minimum :
  - `console.error()` pour les erreurs API (client-side)
  - Pas besoin de server-side logs si c'est une action utilisateur (pas critique).
- **Severity** : Low (documentation suffisante, erreurs catchées + toastées).

### B-003 [INFO] [Tests]
**Race condition : offre créée entre estimation (Étape 2) et [Filtrer]**

- **What** : Spec identifie le risque ("Offre créée entre estimation et [Filtrer]") mais pas de test d'intégration spécifique.
- **Fix** : Ajouter test : "Créer 2 règles olderThan en succession rapide → doit créer 2 règles indépendantes sans collision".
- **Severity** : Low (risque très faible, acceptable).

### B-004 [INFO] [Data Model]
**Sidebar count après filtrage — pas clarifié**

- **What** : Quand les offres sont marquées FILTERED via cette action, le count sidebar doit diminuer. Mais est-ce que FILTERED est exclu du count total? Spec ne le clarifie pas (on le sait par ARCHITECTURE, mais pas répété ici).
- **Fix** : Clarifier dans "Données & Source de vérité" : "getJobs(status=INBOX) exclut category=FILTERED par défaut. Donc count sidebar baisse automatiquement après router.refresh()."
- **Severity** : Very Low (déjà clarifié en ARCHITECTURE).

### B-005 [INFO] [UX]
**Nombre "0 offres à filtrer" — bouton [Filtrer] disabled mais UX pas clarifié**

- **What** : Spec dit "bouton [Filtrer] disabled" si estimatedCount === 0, mais ne dit pas si dialog peut se fermer ou si user reçoit un message d'erreur.
- **Fix** : Clarifier : "Si 0 offres à filtrer, afficher message 'Aucune offre ne correspond à ce critère' et bouton [Filtrer] disabled. User peut cliquer [Retour] ou [Annuler]."
- **Severity** : Very Low (comportement logique, facile à inférer).

### B-006 [INFO] [Rollback]
**Rollback plan ne couvre pas les offres déjà filtrées**

- **What** : Plan dit "Revert commits + restore button", mais ne mentionne pas que les offres FILTERED resteront bloquées après rollback (voir A-002).
- **Fix** : Ajouter note : "Rollback application code ne restaure pas les offres déjà filtrées. Si vraiment nécessaire, faire un DB cleanup manuel ou utiliser un script de migration."
- **Severity** : Low (edge case de rollback).

---

## Questions (max 15, copiable)

```text
Q1 [Architecture]
Étape 5 (GET /api/jobs?filterOlderThan=N) est-elle MUST-HAVE ou optionnelle?
Si optionnelle, comment le dialog Étape 2 comptera-t-il les offres pour la confirmation?
A) MUST-HAVE (fusionner avec Étape 2)
B) Optionnel, compter côté client après le [Filtrer]
C) Optionnel, afficher "estimation" flou (ex: "~10 offres")

Q2 [UX / Compatibility]
Quand une SmartRule auto-créée est supprimée dans /settings:
A) Les offres FILTERED reviennent en INBOX (implémenter cleanup)
B) Les offres FILTERED restent bloquées (limitation acceptée, warning UX)
C) Les offres FILTERED restent bloquées, mais user peut supprimer manuellement chaque offre

Q3 [Dependencies]
Si Radix UI install échoue:
A) Utiliser HTML natif select + Tailwind positioning (fallback)
B) Aborter l'implémentation et attendre resolution
C) Essayer Headless UI ou autre lib

Q4 [Performance]
À quelle limite on considère O(N) comme problématique?
A) < 500ms (strict)
B) < 2s (acceptable)
C) < 5s (pas critique)
D) À benchmark à l'implémentation

Q5 [Tests]
Couvrir la race condition "offre créée pendant le PATCH"?
A) Oui, test explicite
B) Non, risque accepté (très faible)

Q6 [Logs]
Ajouter console.error pour les erreurs API (client)?
A) Oui
B) Non (user a choisi Q11:C, pas de logs)

Q7 [Rollback]
Si rollback post-déploiement, accepter que offres filtrées restent bloquées?
A) Oui, c'est une limitation acceptée
B) Non, faire un DB cleanup script

Q8 [Radix UI Version]
Quelle version mineure de Radix UI?
A) ^2.0.0 (latest majeure)
B) ^2.1.0 (min stable)
C) À décider lors de npm install

Q9 [FilterOldJobsDialog]
Si user ferme le dialog sans cliquer [Filtrer], l'état local (days, step) doit-il reset?
A) Oui, reset à state initial (days="", step=1)
B) Non, garder les données (user peut rouvrir et reprendre)

Q10 [Sidebar Sync]
Après router.refresh() et offres filtrées, comment le count sidebar se synchronise?
A) Automatiquement (getJobs exclut FILTERED par défaut)
B) Via un event custom (comme inbox-count-update)
C) Via un refetch explicite du count

Q11 [SmartRule Name Collision]
Si user crée deux règles "Auto: 14 jours", est-ce un problème?
A) Non, chaque règle a un UUID unique
B) Oui, générer un nom unique (Auto: 14 jours #1, #2)

Q12 [Étapes Dépendances]
Ordonnancement des étapes:
A) Actuellement correct (1→2→3→4→5→6)
B) Fusionner 2+5 (compter les offres avant step 2)
C) Autre

Q13 [Validation Input]
Min jours = 1, max = 365. Exclus 0 et 366?
A) Oui, strict (1-365 inclusive)
B) Oui mais 0 = "Offres créées aujourd'hui"?

Q14 [Toast Duration]
Toast "success" disparaît après 4s. Custom ou hérité de Toast.tsx?
A) Hérité (même que "Offre sauvegardée")
B) Custom (2s, plus court)

Q15 [Radix UI Components]
Quels composants Radix au minimum?
A) Root, Trigger, Content, Item, Separator (basique)
B) + Arrow, Sub, Group (avancé)
```

---

## Repo mismatches (si détectés)

Aucun mismatch critique détecté. Spec reste cohérent avec :
- ✅ ARCHITECTURE.md (Smart Rules v1.1, FILTERED category, getJobs exclusion)
- ✅ lib/types.ts (SmartRule, RuleCondition, RuleOperator "olderThan" existent)
- ✅ server/rules.engine.ts (evaluateRule OK)
- ✅ Toast.tsx (type "success" supporté)
- ⚠️ SettingsView.tsx (assumé qu'il affiche les SmartRules — à vérifier à l'implémentation)

---

## Suggested edits (patchs textuels)

### Edit 1 — Section "Plan d'implémentation" : clarifier dépendance Étape 2 ↔ 5

**Target** : "Plan d'implémentation (étapes stables)" (avant Étape 1)

**Patch proposé** :
```markdown
### Dépendances entre étapes
- Étape 1 : Indépendante (ajoute dépendance)
- Étapes 2-4 : Formant le flux principal (créer dialog → menu → API)
- Étape 5 : **DÉPENDANTE de Étape 2** pour afficher le count. À implémenter AVANT ou EN PARALLÈLE avec Étape 2.
  - Si report, Étape 2 affichera "estimé" sans count réel
- Étape 6 : Dépendante de 2-5 (testage des composants créés)

### Recommandation d'ordre
**Ordre idéal** : 1 → 5 → 2 → 3 → 4 → 6
Ou fusionner 2+5 pour clarifier.
```

### Edit 2 — Section "Fonctionnel détaillé" : ajouter edge case suppression

**Target** : "Fonctionnel détaillé" > "Edge cases" (ajouter case)

**Patch proposé** :
```markdown
- **Suppression de SmartRule auto-créée** : Quand l'utilisateur supprime une règle dans /settings (via [X] sur la carte de règle), les offres déjà marquées category=FILTERED ne reviennent **pas** en INBOX. C'est une limitation acceptée. Mitigation UX : ajouter un warning dans SettingsView : "Supprimer une règle n'affichera pas les offres déjà filtrées par celle-ci."
```

### Edit 3 — Section "Risques & mitigations" : élaborer Radix UI

**Target** : "Risques & mitigations" table, ligne Radix UI

**Patch proposé** :
```markdown
| Radix UI install fail | Moyen | Feature non-implémentable | Avant Étape 1 : tester `npm install @radix-ui/react-dropdown-menu` en local. Si conflict, option fallback : utiliser HTML natif `<div>` positionné en absolu + Tailwind (moins accessible, mais fonctionne). Sinon, utiliser Headless UI si déjà dispo. |
```

### Edit 4 — Section "Questions restantes" : résoudre les 3 blockers

**Target** : "Questions restantes (objectif : vide)"

**Patch proposé** :
```markdown
1. ⚠️ **Étape 5 dépendance cachée** — À clarifier si MUST-HAVE pour Étape 2. Décision : fusionner ou réordonnancer (spec-5-revise).
2. ⚠️ **Suppression de SmartRules** — Offres filtrées restent bloquées. C'est accepté ou à implémenter un cleanup? (spec-5-revise).
3. ⚠️ **Radix UI fallback** — Si npm install échoue, quelle est l'alternative? (spec-5-revise).
```

### Edit 5 — Section "Plan d'implémentation — Étape 2" : utiliser Étape 5 ou estimer côté client?

**Target** : Étape 2, sous "Détails d'implémentation"

**Patch proposé** :
```typescript
  // Ligne "const handleNext = async () => {"
  // Option A (si Étape 5 implémentée) :
  // Fetch count du serveur via GET /api/jobs?filterOlderThan=${n}&status=INBOX
  
  // Option B (si Étape 5 pas implémentée) :
  // Afficher "estimation en cours..." et recalculer après [Filtrer]
  
  // Code spec assume Option A (Étape 5 MUST-HAVE)
```

---

## Verdict

**Status** : **FAIL**

**Raison** : 3 blockers non-résolus rendent l'implémentation ambiguë sans clarifications supplémentaires.

**Score** : 72/100
- Périmètre : +20 (clair)
- Schémas : +20 (complets)
- Plan étapes : +15 (bon, mais dépendances cachées -5)
- Tests : +8 (défini, mais gaps identifiés -2)
- Docs : +9 (à jour)
- Risques : +5 (identifiés, mais mitigation insuffisante -3)
- **Total** : 20+20+15+8+9+5 = 77 → -5 pour blockers = **72**

---

## Next

**Si blockers résolus → PASS** : Implémenter directement.

**Actuellement FAIL** : Lance **/spec-5-revise** pour :
1. Clarifier Étape 5 comme MUST-HAVE et réordonnancer si nécessaire
2. Documenter le comportement attendu lors de suppression de SmartRules
3. Ajouter fallback plan pour Radix UI
4. Répondre aux 15 questions (ou sélectionner les critiques)

Puis relancer `/spec-3-audit` sur la version révisée.
