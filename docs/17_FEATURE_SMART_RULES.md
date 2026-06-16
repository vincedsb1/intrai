# Plan d'implémentation : Règles de Filtrage Avancées (Smart Rules)

**Date** : 2026-01-28
**Statut** : Planifié
**Contexte** : Le filtrage par mots-clés simples (Blacklist) montre ses limites. L'utilisateur a besoin de logique conditionnelle complexe (ex: exclusion géographique combinée au mode de travail).

## 1. Concept & UX

### 1.1 Vision
Nous allons créer un moteur de règles conditionnelles de type **"Si... Alors..."**.
L'UX ne doit pas ressembler à un éditeur de code, mais à un **constructeur de phrases en langage naturel**.

**Exemple visuel d'une règle (Card) :**
```text
┌─────────────────────────────────────────────────────────────┐
│ 🔴 Règle : Anti-Présentiel hors Nantes                      │
│                                                             │
│ SI  [Ville] [n'est pas] "Nantes"                            │
│ ET  [Mode de travail] [est l'un de] "Sur site", "Hybride"   │
│                                                             │
│ ALORS => Déplacer vers [Filtrés]                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 UX du "Rule Builder" (Modal d'édition)
L'interface de création se compose de :
1.  **Nom de la règle** (pour s'y retrouver).
2.  **Liste de Conditions** : Chaque ligne représente un critère.
    - Dropdown **Champ** (ex: Ville, Titre, Mode).
    - Dropdown **Opérateur** (ex: Contient, Est, N'est pas).
    - Input **Valeur** (Texte libre ou Multi-select selon le champ).
    - Bouton suppression (X) en bout de ligne.
3.  **Bouton "+ Ajouter une condition"** : Ajoute une ligne liée par un opérateur logique implicite **ET** (pour cette v1, le "ET" est le plus intuitif pour filtrer. Le "OU" se fait souvent en créant deux règles distinctes).
4.  **Action** : Fixée à "Filtrer" pour l'instant (mais extensible vers "Sauvegarder" ou "Taguer" plus tard).

## 2. Modèle de Données (Générique)

Nous allons modifier le modèle `Settings` pour inclure un tableau de `rules`.

### 2.1 Types TypeScript (`lib/types.ts`)

```typescript
export type RuleField = "title" | "company" | "location" | "workMode" | "description";
export type RuleOperator = 
  | "equals"       // Strictement égal
  | "not_equals"   // Différent de
  | "contains"     // Contient (case insensitive)
  | "not_contains" // Ne contient pas
  | "in"           // Est dans la liste (pour enums)
  | "not_in";      // N'est pas dans la liste

export interface RuleCondition {
  id: string; // uuid pour gestion UI (keys)
  field: RuleField;
  operator: RuleOperator;
  value: string | string[]; // string pour texte, string[] pour multi-select
}

export interface SmartRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: "FILTER"; // Extensible ("TARGET", "TAG"...)
}

// Mise à jour de l'interface Settings
export interface Settings {
  whitelist: string[];
  blacklist: string[];
  rules: SmartRule[]; // Nouveau champ
  updatedAt: Date | string;
}
```

## 3. Implémentation Backend (`server/`)

### 3.1 Moteur de Règles (`server/rules.engine.ts`)
Création d'un service pur (sans dépendance DB directe) capable d'évaluer un `Job` contre une `SmartRule`.

**Algorithme `evaluateRule(job, rule)` :**
1.  Si `!rule.enabled` -> return `false`.
2.  Pour chaque `condition` dans `rule.conditions` :
    - Extraire la valeur du champ correspondant dans le `job`.
    - Normaliser (lowercase, trim).
    - Comparer avec `condition.value` selon `condition.operator`.
    - Si une condition est fausse -> return `false` (Logique AND).
3.  Si toutes conditions vraies -> return `true`.

### 3.2 Intégration dans l'Ingestion (`server/jobs.service.ts`)
Dans la fonction `ingestJob` :
1.  Récupérer `settings`.
2.  Check Blacklist (inchangé, rapide et prioritaire).
3.  **Nouveau : Check Smart Rules**.
    - Boucler sur `settings.rules`.
    - Si `evaluateRule(job, rule)` est vrai :
        - `category = "FILTERED"`
        - `matchedKeyword = "Règle : " + rule.name` (pour l'affichage UX qu'on vient de créer).
        - Break loop.
4.  Check Whitelist (inchangé).

## 4. Implémentation Frontend (`components/`)

### 4.1 `SettingsRules.tsx` (Nouveau Composant)
- Affiche la liste des cartes de règles existantes.
- Toggle pour activer/désactiver une règle rapidement.
- Bouton "Modifier" et "Supprimer".
- Bouton "Nouvelle Règle".

### 4.2 `RuleEditorModal.tsx` (Nouveau Composant)
- Formulaire dynamique.
- Gestion des états locaux pour les conditions (ajout/suppression de lignes).
- **Intelligence UX** : Le champ "Valeur" change selon le "Champ" sélectionné.
    - Si Champ = `workMode` -> Afficher un Select : "Remote", "Hybrid", "On-site".
    - Si Champ = `title` -> Afficher un Input Text.

## 5. Plan d'Action

1.  **Types** : Mettre à jour `lib/types.ts` avec les interfaces `SmartRule`.
2.  **Moteur** : Créer `server/rules.engine.ts` (TDD recommandé : facile à tester unitairement).
3.  **Backend** :
    - Mettre à jour `server/settings.service.ts` pour initialiser `rules: []`.
    - Intégrer le moteur dans `server/jobs.service.ts`.
4.  **UI** :
    - Créer le composant `RuleEditorModal`.
    - Créer la vue liste `SettingsRules` et l'intégrer dans `SettingsView`.

## 6. Évolutivité
Ce système est "future-proof".
- Besoin de filtrer sur le salaire ? -> Ajouter `salary` dans `RuleField` et des opérateurs numériques (`>`, `<`).
- Besoin de taguer automatiquement ? -> Ajouter `action: "TAG"` dans `SmartRule`.

## 7. Support des Champs Temporels (v1.1)

### 7.1 Nouvelle capacité
Règles supportent désormais la **date de création** des offres. Voir `/docs/specs/2026-06-16__smart-rules__createdAt-date-filter/SPEC.md` pour le détail complet.

**Exemple** : "Filtrer les offres publiées il y a plus de 7 jours"

### 7.2 Implémentation (v1.1)
- Nouveau field : `"createdAt"` (Date MongoDB, préexistant)
- Opérateur : `"olderThan"` (inclusif, valeur en jours)
- Architecture : Calcul côté serveur (UTC), aucune migration DB requise
- Tests : Unit tests Vitest complets (7 tests)

### 7.3 Détails techniques
- Calcul d'âge : `Math.ceil((now - createdAt) / (1000*60*60*24))`
- Timezone : UTC (cohérent avec MongoDB)
- Opérateur : `"olderThan"` = offres créées il y a >= N jours
- Opérateur futur : `"newerThan"` (offres récentes) — architecture ready

### 7.4 UX
- Modal : Field "Créé il y a...", input numérique (jours)
- Display : "posté il y a plus de 7 jours"

## 8. Bulk Actions Toolbar (v1.2)

### 8.1 Présentation
La page `/inbox` intègre une **barre d'actions groupées** (Toolbar) permettant à l'utilisateur d'exécuter des opérations batch rapidement. Accès via un **menu déroulant (Dropdown)** situé en haut à droite.

### 8.2 Actions disponibles
1. **Marquer tout comme vu** (existant)
   - Historique : Bouton texte → Migré vers Dropdown
   - Comportement : Immédiat, pas de dialogue

2. **Filtrer les offres > N jours** (NOUVEAU)
   - Icône : ⚙️ (Settings/Wrench)
   - UX : Dialogue en 2 étapes
   - Workflow : Input jours → Confirmation → Création SmartRule automatique

### 8.3 Composants UI
- **InboxView.tsx** : Dropdown Radix UI @radix-ui/react-dropdown-menu
  - Trigger : Icône ⚙️ (lucide-react)
  - Menu items : Actions disponibles
  
- **FilterOldJobsDialog.tsx** (NOUVEAU)
  - Formulaire 2 étapes
  - Étape 1 : Input numérique (1-365 jours)
  - Étape 2 : Confirmation avec comptage réel des offres à filtrer

### 8.4 Flux technique détaillé

**Étape 1 — Saisie**
```
Input: nombre de jours (ex: 30)
Validation: 1 ≤ n ≤ 365
API Call: GET /api/jobs?status=INBOX&filterOlderThan=30
└─> Retour: { items: [], total: 12 }
```

**Étape 2 — Confirmation**
```
Display: "12 offres de plus de 30 jours seront filtrées"
Button "Filtrer" → Créer SmartRule + onSubmit()
```

**Étape 3 — Création de la règle (InboxView.handleCreateFilterRule)**
```
1. GET /api/settings (récupérer règles existantes)
2. Créer SmartRule:
   {
     id: crypto.randomUUID(),
     name: "Auto: 30 jours",
     enabled: true,
     conditions: [
       {
         id: crypto.randomUUID(),
         field: "createdAt",
         operator: "olderThan",
         value: 30
       }
     ],
     action: "FILTER"
   }
3. PATCH /api/settings avec rules: [...oldRules, newRule]
   └─> Réponse: { settings, filteredCount: 12 }
4. Toast: "12 offres filtrées (> 30 jours)"
5. router.refresh() → Mise à jour Inbox
```

### 8.5 API Contracts

**GET /api/jobs?filterOlderThan=N**
```
Endpoint: GET /api/jobs?status=INBOX&filterOlderThan=14
Response:
{
  "items": [],
  "total": 8
}
Description: Retour d'estimation pour le dialogue (lecture seule, pas de modification DB)
```

**PATCH /api/settings (nouveau champ `filteredCount`)**
```
Request:
{
  "rules": [
    { id, name, enabled, conditions, action }
  ]
}

Response:
{
  "settings": { ... },
  "filteredCount": 12  // Nombre de jobs filtrés par la nouvelle règle
}
Description: Applique la règle aux offres existantes et retourne le count
```

### 8.6 Stockage & Durée

- **Stockage** : MongoDB, collection `settings.rules[]`
- **Atomicité** : Opérateur MongoDB `$push` pour éviter les pertes concurrentes
- **Durée** : Règle persiste jusqu'à suppression manuelle
- **Comportement** : Les offres filtrées disparaissent immédiatement de l'Inbox

### 8.7 Tests

- **Unit Tests** : `components/__tests__/FilterOldJobsDialog.test.tsx` (10 tests)
  - Validation input (1-365)
  - Étapes du dialogue
  - API calls
  - Error handling

- **Integration Tests** : `__tests__/inbox-filter-integration.test.ts` (21 tests)
  - Contrats API (GET /api/jobs?filterOlderThan, PATCH /api/settings)
  - Format SmartRule
  - Flux complet (dialog → API → refresh)
  - Backward compatibility
  - Edge cases

### 8.8 Backward Compatibility

- ✅ Endpoint GET /api/jobs conserve contrat existant
- ✅ PATCH /api/settings retourne `filteredCount: 0` si pas de nouvelle règle
- ✅ "Marquer tout comme vu" fonctionne identiquement
- ✅ Règles existantes ne sont pas modifiées lors de l'ajout d'une nouvelle
