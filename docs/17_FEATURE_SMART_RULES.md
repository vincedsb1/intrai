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
