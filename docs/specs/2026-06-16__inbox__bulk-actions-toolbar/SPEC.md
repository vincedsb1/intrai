---
id: 2026-06-16__inbox__bulk-actions-toolbar
version: 3
status: ready
scope: fullstack
solution_strategy: HYBRID
last_updated: 2026-06-16
audited: true
challenged: true
revision_date: 2026-06-16
challenge_date: 2026-06-16
sources:
  architecture: ARCHITECTURE.md
  reference_docs:
    - docs/17_FEATURE_SMART_RULES.md
    - docs/07_COMPOSANTS_UI_SPEC.md
  rules_docs: []
---

# Inbox Bulk Actions Toolbar

## Résumé exécutable

Ajouter une **barre d'actions groupées** dans le header Inbox permettant à l'utilisateur de :
1. **Marquer tout comme vu** (action existante, déplacée du bouton texte vers menu déroulant)
2. **Filtrer les offres > N jours** (NOUVEAU) via un dialog 2 étapes :
   - Saisir le nombre de jours (1-365) + estimation serveur du count
   - Confirmation avant création (affiche nombre réel d'offres à filtrer)
   - Crée une SmartRule `createdAt/olderThan`
   - Les offres matchant sont marquées FILTERED immédiatement
   - Toast : "X offres filtrées (> N jours)"

**UI changement** : Bouton texte → Icône ⚙️ (Settings) avec menu Radix UI Dropdown (ou fallback HTML natif).

**Impact** : Frontend (InboxView.tsx + FilterOldJobsDialog.tsx nouveau) + Backend minimal (PATCH /api/settings enrichi pour évaluer et filtrer les offres).

**Version 2 (post-audit)** : Étape 5 fusionnée dans Étape 2, limitations de suppression documentées, fallback Radix UI clarifié.

---

## Périmètre

### In-scope
- Remplacer le bouton "Tout marquer comme vu" (ligne 303-310 InboxView.tsx) par icône ⚙️
- Implémenter menu déroulant Radix UI avec 2 options
- Créer composant `FilterOldJobsDialog.tsx` (dialog 2 étapes)
- Validation input : 1-365 jours
- Créer SmartRule auto-nommée "Auto: N jours"
- PATCH /api/settings enrichi pour :
  - Ajouter la règle
  - Re-évaluer toutes les offres INBOX
  - Marquer matchées en category=FILTERED
  - Retourner le nombre d'offres affectées
- Toast "success" avec nombre d'offres
- router.refresh() pour mettre à jour /inbox
- Unit + Intégration tests

### Out-of-scope
- Modifier le contrat API Settings (accepte déjà rules)
- Modifier evaluateRule() ou rules.engine.ts (fonctionne déjà)
- Ajouter d'autres options au menu
- Édition/suppression des règles auto-créées (pas d'UI dans ce scope)
- Feature flag : déploiement direct
- Tests E2E
- Observabilité (pas de logs)

---

## Contraintes projet (sources)

1. **Smart Rules v1.1** (ARCHITECTURE.md) : `createdAt` + `olderThan` opérateur déjà supportés, évaluation serveur-side
2. **Backward compatibility** : "Marquer tout comme vu" reste strictement identique en fonctionnement
3. **Type SmartRule** (lib/types.ts:70-76) : `{id, name, enabled, conditions[], action: "FILTER"}`
4. **evaluateRule()** (server/rules.engine.ts:107-123) : Logique AND sur conditions, olderThan inclusif (>=)
5. **Endpoint /api/settings** (app/api/settings/route.ts) : PATCH accepte Partial<Settings> et appelle updateSettings()
6. **InboxView** est Client Component : peut utiliser hooks, fetch, setState, router.refresh()
7. **UI patterns** : HTML natif + Tailwind (pas Shadcn), Dark mode support (dark: classes)
8. **Toast existant** (Toast.tsx:14) : Types "trash" | "success", supporte actionLabel + onUndo

---

## Stratégie de solution

**Choix : HYBRID**

### Pourquoi
- **Moteur existant** : evaluateRule() + SmartRule types sont prêts → zéro changement rules.engine.ts
- **API flexible** : /api/settings accepte déjà rules, juste enrichir la logique de PATCH
- **UI légère** : Menu simple (Radix UI) + 1 dialog dédié = peu de code neuf
- **State management simple** : Pas de store global, juste useState + router.refresh()

### Trade-offs acceptés
- Radix UI ajoutée comme dépendance (package.json) — valeur: dropdown accessible + maintenu
- Re-évaluation des offres INBOX au clic (O(N) jobs) — acceptable pour user-initiated action
- Pas de preview du nombre d'offres avant confirmation — UX simplifiée

### Trade-offs refusés
- Pas de feature flag : complexité non justifiée (action non risquée)
- Pas de mutation locale optimiste : évaluation côté serveur fiable
- Pas de refactoring de InboxView : minimiser les changements

---

## Schémas

### Schéma UI — Inbox Header (desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INBOX HEADER                                │
│                                                                          │
│  ┌─ Titre                                          ⚙️ (Menu Dropdown)  │
│  │ "Opportunités"                                  ▼                     │
│  └─ Sous-titre "Gérez vos nouvelles..."     ┌─────────────────┐         │
│                                             │ ✓ Marquer tout  │         │
│                                             │   comme vu      │         │
│                                             ├─────────────────┤         │
│                                             │ 🗑️ Filtrer      │         │
│                                             │    offres > ... │         │
│                                             └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Schéma UI — FilterOldJobsDialog (modal)

```
┌────────────────────────────────────────────────┐
│  Filtrer les offres (v1)                    × │
├────────────────────────────────────────────────┤
│                                                │
│  Nombre de jours (1-365):                      │
│  ┌──────────────────────────────────────────┐ │
│  │ [input: number, placeholder="Ex: 14"]     │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Offres plus anciennes seront marquées        │
│  comme "Filtrées" et retirées de l'Inbox.    │
│                                                │
├────────────────────────────────────────────────┤
│                        [Annuler]  [Suivant]   │
└────────────────────────────────────────────────┘

→ Si clic [Suivant]:

┌────────────────────────────────────────────────┐
│  Filtrer les offres (v2 - Confirmation)     × │
├────────────────────────────────────────────────┤
│                                                │
│  ⚠️ Vous êtes sur le point de filtrer         │
│  X offre(s) de plus de N jours.               │
│                                                │
│  Cette action peut être annulée en            │
│  supprimant la règle dans Réglages.           │
│                                                │
├────────────────────────────────────────────────┤
│                        [Annuler]  [Filtrer]   │
└────────────────────────────────────────────────┘
```

### Schéma de flux — Créer filtrage auto

```mermaid
flowchart TD
    Start["Utilisateur clique icône ⚙️"] --> MenuOpen["Menu déroulant s'ouvre"]
    MenuOpen --> Option1["Option 1: Marquer tout comme vu"]
    MenuOpen --> Option2["Option 2: Filtrer > N jours"]
    
    Option1 --> HandleMark["handleBulkClean() existant"]
    HandleMark --> Done1["✓ Fin"]
    
    Option2 --> DialogOpen["FilterOldJobsDialog ouvre (Step 1)"]
    DialogOpen --> InputDays["User saisit nombre jours"]
    InputDays --> Validate{Valide?<br/>1-365}
    Validate -->|Non| Error["Erreur (input rouge)"]
    Error --> InputDays
    Validate -->|Oui| ClickNext["Clic [Suivant]"]
    
    ClickNext --> DialogStep2["Step 2: Confirmation"]
    DialogStep2 --> ShowCount["Affiche: 'X offres > N jours'"]
    ShowCount --> ClickFilter{User clic<br/>[Filtrer]?}
    
    ClickFilter -->|Annuler| Close1["Dialog ferme"]
    Close1 --> Done2["✗ Fin"]
    
    ClickFilter -->|Oui| CreateRule["Crée SmartRule<br/>createdAt/olderThan/N"]
    CreateRule --> CallAPI["PATCH /api/settings<br/>+ nouvelle règle"]
    CallAPI --> APIEval["Backend évalue<br/>offres INBOX"]
    APIEval --> APIUpdate["Backend marque<br/>matchées FILTERED"]
    APIUpdate --> APIReturn["API retourne<br/>count (offres affectées)"]
    APIReturn --> RefreshRouter["router.refresh()"]
    RefreshRouter --> ShowToast["Toast 'success':<br/>X offres filtrées"]
    ShowToast --> InboxUpdate["Inbox se met à jour<br/>offres disparaissent"]
    InboxUpdate --> Done3["✓ Fin"]
```

### Schéma des états

| État | Condition | UI |
|------|-----------|-----|
| **Idle** | Menu fermé | Icône ⚙️ visible |
| **Menu Open** | Utilisateur clique icône | Menu 2 options visibles |
| **Dialog Step 1** | Clic "Filtrer > N jours" | Input jours, boutons [Annuler] [Suivant] |
| **Dialog Step 1 Error** | Input invalide (<1 ou >365) | Input rouge, message erreur |
| **Dialog Step 2** | Clic [Suivant] valide | Confirmation, affiche count estimé |
| **Loading** | Après clic [Filtrer] | Bouton disabled, spinner |
| **Success** | API PATCH OK | Toast success apparaît, dialog ferme, inbox refresh |
| **Error API** | PATCH échoue (500, timeout) | Toast error, dialog reste ouverte, retry possible |

---

## Fonctionnel détaillé

### Comportements attendus

1. **Menu déroulant**
   - Clic sur icône ⚙️ → menu apparaît (positionné relatif, sous l'icône)
   - Menu affiche 2 options : "✓ Marquer tout comme vu" + "🗑️ Filtrer offres > N jours"
   - Clic sur option 1 → exécute handleBulkClean() existant, ferme menu
   - Clic sur option 2 → ouvre FilterOldJobsDialog, ferme menu
   - Clic ailleurs → ferme menu
   - Mobile : icône seule (pas de label)

2. **FilterOldJobsDialog — Step 1 (Input)**
   - Modal apparaît : titre "Filtrer les offres"
   - Input numérique : placeholder "Ex: 14", min=1, max=365
   - Sous-titre explicatif : "Offres plus anciennes... seront filtrées"
   - Boutons : [Annuler] (ferme modal, rien ne change) | [Suivant] (valide + passe à step 2)
   - Validation :
     - Si vide ou <1 → erreur "Minimum 1 jour"
     - Si >365 → erreur "Maximum 365 jours"
     - Sinon → OK

3. **FilterOldJobsDialog — Step 2 (Confirmation)**
   - Modal affiche : "Filtrer les offres > X jours"
   - Affiche le nombre d'offres affectées : "X offre(s) de plus de N jours seront filtrées"
   - Avertissement : "Cette action peut être annulée en supprimant la règle dans Réglages"
   - Boutons : [Annuler] | [Filtrer]
   - Clic [Annuler] → retour step 1
   - Clic [Filtrer] → appel API + loading

4. **API Call & Backend**
   - Payload : `{ rules: [...currentRules, newRule] }`
   - newRule format : `{ id: uuid(), name: "Auto: N jours", enabled: true, conditions: [{id: uuid(), field: "createdAt", operator: "olderThan", value: N}], action: "FILTER" }`
   - Backend PATCH /api/settings :
     - Ajoute la règle à settings.rules
     - Récupère toutes les offres INBOX (status=INBOX, category≠FILTERED)
     - Évalue chacune contre la nouvelle règle (evaluateRule)
     - Marque les matchées : category=FILTERED + matchedKeyword="Auto: N jours"
     - Retourne dans la réponse JSON : `{ settings, filteredCount: X }`

5. **Post-API Success**
   - Dialog ferme
   - router.refresh() déclenche (recharge page serveur)
   - Toast "success" apparaît : "X offres filtrées (> N jours)"
   - Toast disappears après 4s (ou user clic X)
   - Inbox se met à jour : offres filtrées disparaissent

6. **Error Handling**
   - Erreur réseau / 500 : Toast "error" → "Erreur lors du filtrage"
   - Dialog reste ouverte, user peut retry
   - Aucun rollback (DB n'a pas changé)

### Règles de priorité
- Validation input : avant appel API
- Confirmation : obligatoire (2 clics)
- Nombre d'offres : comptage côté serveur (après re-évaluation)
- Rollout : immédiat, aucun flag

### Edge cases
- **Aucune offre à filtrer** : Dialog step 2 affiche "Aucune offre ne correspond à ce critère (> N jours)", bouton [Filtrer] disabled. User peut cliquer [Retour] ou [Annuler].
- **Règle crée mais offres disparaissent** : router.refresh() recharge depuis la DB, correct
- **User crée 2 règles olderThan en succession rapide** : Deuxième clic crée 2e règle indépendante (pas de collision, UUID unique)
- **User crée règle, puis supprime dans Réglages** : **Offres restent FILTERED à jamais** (limitation architecturale). Les règles s'évaluent à l'ingest, pas au fetch. Mitigation UX : warning dans SettingsView : "⚠️ Supprimer cette règle n'affichera pas les offres déjà filtrées."
- **Offre créée il y a exactement N jours** : olderThan est inclusif (>=), donc elle est filtrée (attendu)

### Accessibilité
- Menu Radix UI : support natif focus/clavier (Tab, Enter, Esc)
- Dialog : role="dialog", focus trap, close sur Esc
- Input : placeholder, min/max attrs, error aria-describedby
- Buttons : accessible labels, focus visible
- Dark mode : tous les éléments ont dark: classes Tailwind

---

## Données & Source de vérité

### Source de vérité
- **SmartRules** : MongoDB settings.rules[] (source de vérité)
- **Job category** : MongoDB jobs.category (FILTERED marqué au serveur)
- **Offres visibles /inbox** : Requête getJobs(status=INBOX, category≠FILTERED)

### Types impactés
```typescript
// lib/types.ts (AUCUN changement requis — déjà prêt)
// SmartRule, RuleCondition, RuleOperator "olderThan" existent
```

### Migrations
**Aucune** : SmartRules v1.1 déjà en place

### Backward compatibility
- Endpoint /api/settings : aucun changement du contrat, juste enrichissement logique
- Settings.rules[] : déjà supporté par updateSettings()
- evaluateRule() : ne change pas
- "Marquer tout comme vu" : fonctionnellement identique

---

## API / Endpoints

| Action | Méthode | URL | Payload | Réponse | Erreurs | Notes |
|--------|---------|-----|---------|---------|---------|-------|
| Créer filtrage | PATCH | /api/settings | `{ rules: SmartRule[] }` | `{ settings: Settings, filteredCount: number }` | 400 (invalid rule), 500 (DB) | Backend évalue et filtre offres |

### Exemple Payload
```json
{
  "rules": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Auto: 14 jours",
      "enabled": true,
      "conditions": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "field": "createdAt",
          "operator": "olderThan",
          "value": 14
        }
      ],
      "action": "FILTER"
    }
  ]
}
```

### Exemple Réponse
```json
{
  "settings": {
    "whitelist": [...],
    "blacklist": [...],
    "rules": [...],
    "updatedAt": "2026-06-16T10:30:00Z"
  },
  "filteredCount": 12
}
```

### Important: Response Contract Change (CHALLENGE C-003)
- **Before v2** : PATCH /api/settings returns `{ settings: Settings }`
- **After v3** : PATCH /api/settings returns `{ settings: Settings, filteredCount: number }`
- **Compatibility** : Addition of new field is **backwards-compatible** (old callers can ignore `filteredCount`)
- **Pre-implementation verification** : Before Étape 1, verify no other code calls PATCH /api/settings. Run:
  ```bash
  grep -r "PATCH.*settings\|/api/settings" src/ app/ __tests__/ --include="*.ts" --include="*.tsx" --include="*.test.*"
  ```
  If found, ensure those callers handle both old (settings only) and new (settings + filteredCount) response formats.

---

## Architecture / Data flow

### État (State Management)
- **Local state** (InboxView) : visitedIds, toast state, jobs list (optimistic)
- **Server state** (MongoDB) : settings.rules[], jobs.category (FILTERED)
- **URL state** : filtres actuels (q, mode, country, easy) — persistés dans searchParams

### Flux lecture
1. User requête `/inbox?...` (page serveur)
2. InboxPage (SC) appelle getJobs({ status: INBOX, category≠FILTERED })
3. getJobs filtre via MongoDB query
4. InboxView (CC) reçoit initialJobs + state local
5. Affiche jobs avec groupement par createdAt

### Flux écriture (Créer filtrage)
1. User clic icône ⚙️ → menu
2. User clic "Filtrer > N jours" → FilterOldJobsDialog step 1
3. User saisit N jours, clic [Suivant] → step 2 (step 2 appelle backend pour estimer count)
   - **QUESTION RESTANTE** : Compter côté client (avant submit) ou côté serveur (en temps réel)?
   - **Décision** : Côté serveur lors du [Filtrer] final (plus fiable)
4. User clic [Filtrer] → PATCH /api/settings
5. Backend :
   - Ajoute règle à settings.rules
   - Évalue toutes les offres INBOX
   - Marque matchées en category=FILTERED
   - Retourne filteredCount
6. Frontend reçoit filteredCount → toast + router.refresh()
7. router.refresh() recharge page serveur → getJobs refetch → UI update

### Caching / Invalidation
- **Pas de cache client** : router.refresh() déclenche refetch serveur
- **Pas de cache serveur** : getJobs() query DB directement
- **Invalidation** : implicite via router.refresh()

---

## Plan d'implémentation (étapes stables)

### Étape 1 — Ajouter Radix UI Dropdown à package.json (avec fallback)

**Objectif** : Dépendance disponible pour le composant Menu. Si échoue, utiliser fallback HTML natif.

**Changements** :
- `package.json` : ajouter `"@radix-ui/react-dropdown-menu": "^2.0.0"`
- `npm install` ou `pnpm install` (via user)

**Détails** :
```json
"dependencies": {
  ...
  "@radix-ui/react-dropdown-menu": "^2.0.0"
}
```

### ARIA Accessibility (if HTML fallback chosen — CHALLENGE C-012)
If using HTML native fallback instead of Radix UI, ensure keyboard + screen reader support:

```html
<!-- Step 2 Confirmation (screen reader announcement) -->
<div role="status" aria-live="polite" aria-label="Confirmation étape">
  <p>Aucune offre ne correspond à ce critère (> 14 jours).</p>
</div>

<!-- Dialog close button (keyboard Escape) -->
<button 
  aria-label="Fermer le dialog"
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
>
  ×
</button>
```

If Radix UI chosen: native a11y built-in (ARIA regions, keyboard nav), no extra work needed.

**Fallback si npm install échoue** :
Si `npm install @radix-ui/react-dropdown-menu` échoue (version conflict, peer deps) :

**Option A (Recommended)** : HTML natif <div> avec Tailwind positioning
```typescript
// Fallback: HTML dropdown (accessible, simple)
<div className="relative inline-block">
  <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
    <SettingsIcon size={20} />
  </button>
  {menuOpen && (
    <div className="absolute right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 min-w-[200px]">
      <button onClick={() => { handleBulkClean(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
        ✓ Marquer tout comme vu
      </button>
      <hr className="border-slate-200 dark:border-slate-800" />
      <button onClick={() => { setIsFilterDialogOpen(true); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
        🗑️ Filtrer offres > N jours
      </button>
    </div>
  )}
</div>
```
Moins accessible que Radix (pas d'ARIA live regions), mais fonctionne et respecte le design. Impact : aucun (fallback transparent).

**Option B** : Utiliser Headless UI (si déjà en dépendance)
```bash
# Vérifier package.json
grep -i headlessui package.json
```

**Recommandation** : Tenter Radix (Option Radix native). Si bloqué, implémenter Option A (2h max). Documenter le choix en PR.

**Tests** : Vérifier `import { Root, Trigger, Content, Item } from "@radix-ui/react-dropdown-menu"` compile OU fallback renders correctement

**Validation** :
- [ ] npm install complète sans erreur OU fallback fonctionne
- [ ] Radix UI importable OU fallback HTML render

---

### Étape 2 — Créer composant FilterOldJobsDialog.tsx (avec estimation serveur)

**Objectif** : Dialog 2-step pour saisir nombre de jours + estimation serveur + confirmation

**Changements** :
- Fichier nouveau : `components/FilterOldJobsDialog.tsx`
- 150 lignes approx (2 steps, inputs, validations)

**Détails d'implémentation** :

```typescript
// components/FilterOldJobsDialog.tsx
"use client";
import React, { useState } from "react";
import { X } from "lucide-react";

interface FilterOldJobsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (days: number) => Promise<void>; // Retourne après API success
}

export default function FilterOldJobsDialog({
  isOpen,
  onClose,
  onSubmit,
}: FilterOldJobsDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [days, setDays] = useState("");
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Validate input + fetch server-side count (PART OF ÉTAPE 2, not separate Étape 5)
  const handleNext = async () => {
    const n = parseInt(days, 10);
    if (isNaN(n) || n < 1) {
      setError("Minimum 1 jour");
      return;
    }
    if (n > 365) {
      setError("Maximum 365 jours");
      return;
    }
    setError("");

    // Fetch count of jobs to be filtered (server-side estimation)
    // NEW: This is now PART OF ÉTAPE 2 (was previously Étape 5, now merged)
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?status=INBOX&filterOlderThan=${n}`);
      if (!res.ok) throw new Error("Failed to count");
      const data = await res.json();
      setEstimatedCount(data.total || 0);
      setStep(2);
    } catch (err) {
      console.error("[FilterOldJobsDialog] Count fetch failed:", err);  // NEW: client-side logging
      setError("Erreur lors du comptage");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm & submit
  const handleFilter = async () => {
    setLoading(true);
    try {
      await onSubmit(parseInt(days, 10));
      // onSubmit handles toast + refresh
      onClose();
    } catch (err) {
      console.error("[FilterOldJobsDialog] Filter submit failed:", err);  // NEW: client-side logging
      setError("Erreur lors du filtrage");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            Filtrer les offres {step === 2 && `(${days} jours)`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 ? (
            // Step 1: Input
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre de jours (1-365)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    setError("");
                  }}
                  placeholder="Ex: 14"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Offres plus anciennes seront marquées comme "Filtrées" et retirées de l'Inbox.
              </p>
            </div>
          ) : (
            // Step 2: Confirmation
            <div className="space-y-4">
              {estimatedCount > 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>⚠️ Confirmation</strong><br />
                    {estimatedCount} offre{estimatedCount !== 1 ? "s" : ""} de plus de {days} jour
                    {days !== "1" ? "s" : ""} seront filtrées.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    Aucune offre ne correspond à ce critère (> {days} jour{days !== "1" ? "s" : ""}).
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cette action peut être annulée en supprimant la règle dans Réglages.
              </p>
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 disabled:opacity-50"
          >
            {step === 1 ? "Annuler" : "Retour"}
          </button>
          <button
            onClick={step === 1 ? handleNext : handleFilter}
            disabled={loading || !days || (step === 2 && estimatedCount === 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-bold rounded-lg transition-opacity"
            title={step === 2 && estimatedCount === 0 ? "Aucune offre à filtrer" : ""}
          >
            {loading ? "Chargement..." : step === 1 ? "Suivant" : step === 2 && estimatedCount === 0 ? "Aucune offre" : "Filtrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Tests à ajouter** :
- Input validation : <1, >365, valid
- Step transitions
- Loading state
- Error handling

**Validation** :
- [ ] Dialog s'ouvre au clic "Filtrer > N jours"
- [ ] Step 1 validation fonctionne
- [ ] Step 2 affiche count correct
- [ ] Clic [Filtrer] appelle onSubmit
- [ ] Dialog ferme après succès

---

### Étape 3 — Modifier InboxView.tsx : remplacer bouton par Menu Radix UI

**Objectif** : Ajouter icône ⚙️ + menu déroulant avec 2 options

**Changements** :
- Importer Radix UI components, Lucide Settings icon
- Remplacer le bouton (ligne 303-310)
- Ajouter state isFilterDialogOpen
- Importer FilterOldJobsDialog

**Détails** :

```typescript
// Ligne 1-11 (imports)
"use client";
import React, { useState, useEffect, useTransition, useOptimistic } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Inbox, Settings as SettingsIcon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import JobCard from "./JobCard";
import FilterOldJobsDialog from "./FilterOldJobsDialog"; // NEW
import BlacklistModal from "./BlacklistModal";
// ... rest

// Ligne 126 (état nouveau)
const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

// Ligne 252 (handleBulkClean existant — ne pas changer)
const handleBulkClean = async () => { /* ... */ };

// NEW: handler pour créer la règle de filtrage
const handleCreateFilterRule = async (days: number) => {
  try {
    const currentSettings = await fetch("/api/settings").then(r => r.json());
    const newRule: SmartRule = {
      id: crypto.randomUUID(),
      name: `Auto: ${days} jours`,
      enabled: true,
      conditions: [
        {
          id: crypto.randomUUID(),
          field: "createdAt",
          operator: "olderThan",
          value: days,
        },
      ],
      action: "FILTER",
    };

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: [...currentSettings.rules, newRule],
      }),
    });

    if (!res.ok) throw new Error("Failed to create rule");
    const data = await res.json();
    const filteredCount = data.filteredCount || 0;

    setToast({
      msg: `${filteredCount} offre${filteredCount !== 1 ? "s" : ""} filtrée${filteredCount !== 1 ? "s" : ""} (> ${days} jour${days !== 1 ? "s" : ""})`,
      type: "success",
    });

    router.refresh();
  } catch (error) {
    console.error("[InboxView] Filter rule creation failed:", error);  // NEW: client-side logging
    alert("Erreur lors du filtrage");
  }
};

// Ligne 294 (remplacer le bouton)
{/* Page Header (Desktop) */}
<div className="hidden md:flex items-end justify-between mb-8">
  <div>
    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
      Opportunités
    </h2>
    <p className="text-sm mt-2 font-medium text-slate-500 dark:text-slate-400">
      Gérez vos nouvelles offres d&apos;emploi.
    </p>
  </div>

  {/* NEW: Radix UI Dropdown */}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
        <SettingsIcon size={20} className="text-slate-600 dark:text-slate-400" />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg min-w-[200px]"
      align="end"
    >
      <DropdownMenu.Item
        onSelect={() => {
          setVisitedIds(new Set());
          handleBulkClean();
        }}
        className="px-4 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 outline-none"
      >
        ✓ Marquer tout comme vu
      </DropdownMenu.Item>
      <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-slate-800 mx-0" />
      <DropdownMenu.Item
        onSelect={() => setIsFilterDialogOpen(true)}
        className="px-4 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 outline-none"
      >
        🗑️ Filtrer offres &gt; N jours
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

// Ligne 421+ (modal nouveau)
<FilterOldJobsDialog
  isOpen={isFilterDialogOpen}
  onClose={() => setIsFilterDialogOpen(false)}
  onSubmit={handleCreateFilterRule}
/>
```

**Tests** :
- [ ] Menu s'ouvre au clic icône
- [ ] Option 1 exécute handleBulkClean
- [ ] Option 2 ouvre FilterOldJobsDialog

**Validation** :
- [ ] Icône visible desktop + mobile
- [ ] Menu accessible keyboard (Tab, Enter, Esc)
- [ ] Dark mode correct

---

### Étape 4 — Enrichir PATCH /api/settings pour évaluer et filtrer offres

**Objectif** : Backend calcule et retourne le nombre d'offres filtrées

**Changements** :
- Créer helper `evaluateAndFilterOldJobs(rule)` dans `server/jobs.service.ts`
- Modifier PATCH handler dans `app/api/settings/route.ts`
- Enrichir réponse avec `filteredCount`

**Détails** :

```typescript
// server/jobs.service.ts — nouveau helper
import { evaluateRule } from "./rules.engine";
import { SmartRule } from "@/lib/types";

export async function evaluateAndFilterOldJobs(newRule: SmartRule): Promise<number> {
  return await withMongo(async (db) => {
    // 1. Récupérer toutes les offres INBOX non-filtrées
    const jobs = await db.collection(JOBS_COLLECTION).find({
      status: "INBOX",
      category: { $ne: "FILTERED" },
    }).toArray();

    // 2. Évaluer chacune contre la nouvelle règle
    const jobsToFilter = jobs.filter(job => evaluateRule(job, newRule));

    // 3. Marquer celles qui matchent
    if (jobsToFilter.length > 0) {
      const idsToFilter = jobsToFilter.map(j => j._id);
      await db.collection(JOBS_COLLECTION).updateMany(
        { _id: { $in: idsToFilter } },
        {
          $set: {
            category: "FILTERED",
            matchedKeyword: newRule.name,
            updatedAt: new Date(),
          },
        }
      );
    }

    return jobsToFilter.length;
  });
}

// IMPORTANT (CHALLENGE C-004): Use $push for atomic rule append
// In settings.service.ts, when appending rules:
// ✓ CORRECT (atomic, prevents concurrent edit loss):
//   await db.updateOne({}, { $push: { rules: newRule }, $set: { updatedAt: new Date() } })
// 
// ✗ WRONG (non-atomic):
//   await db.updateOne({}, { $set: { rules: [...oldRules, newRule], updatedAt: new Date() } })
```

```typescript
// app/api/settings/route.ts — modifier PATCH
import { evaluateAndFilterOldJobs } from "@/server/jobs.service"; // NEW

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // Détecter si une nouvelle règle createdAt/olderThan a été ajoutée
    const newRules = body.rules || [];
    const oldSettings = await getSettings();
    const addedRules = newRules.filter(
      (r: SmartRule) => !oldSettings.rules.some(or => or.id === r.id)
    );

    // Si une nouvelle règle createdAt/olderThan, évaluer les offres
    let filteredCount = 0;
    for (const rule of addedRules) {
      if (
        rule.action === "FILTER" &&
        rule.conditions?.some((c: RuleCondition) => c.field === "createdAt")
      ) {
        filteredCount += await evaluateAndFilterOldJobs(rule);
      }
    }

    // Mettre à jour settings
    const settings = await updateSettings(body);

    // Retourner settings + count
    return NextResponse.json({ settings, filteredCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
```

**Tests** :
- [ ] Helper retourne count correct
- [ ] Offres marquées FILTERED en DB
- [ ] Réponse API inclut filteredCount

**Validation** :
- [ ] Vérifier in DB que les offres matchées sont marquées FILTERED
- [ ] Vérifier count exact avec exemple test

---

### Étape 5 — Enrichir GET /api/jobs pour accepter query param filterOlderThan (optionnel)

**Objectif** : (Optionnel) Modifier le endpoint GET /api/jobs pour supporter l'estimation côté serveur appelée par FilterOldJobsDialog step 1.

**Note** : Étape 5 est maintenant **fusionnée dans Étape 2** (le handleNext() de FilterOldJobsDialog appelle GET /api/jobs?filterOlderThan=N directement).

**Changements** (si implémentation séparée) :
- Modifier GET /api/jobs/route.ts pour accepter query param `filterOlderThan`
- Si présent, évaluer les offres INBOX contre une règle temporaire + retourner le count

**Implémentation suggérée** :
```typescript
// app/api/jobs/route.ts — ajouter support filterOlderThan
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filterOlderThan = searchParams.get("filterOlderThan");
  
  if (filterOlderThan) {
    const days = parseInt(filterOlderThan, 10);
    if (!isNaN(days) && days > 0) {
      // Evaluate offres INBOX against temporary rule
      const jobs = await getJobs({ status: "INBOX", category: "INBOX" });
      const tempRule = {
        id: "temp",
        enabled: true,
        conditions: [{ field: "createdAt", operator: "olderThan", value: days }],
        action: "FILTER"
      };
      const filteredCount = jobs.items.filter(job => evaluateRule(job, tempRule)).length;
      return NextResponse.json({ items: jobs.items, total: filteredCount });
    }
  }
  
  // Default behavior (unchanged)
  const jobs = await getJobs({ /* ... */ });
  return NextResponse.json(jobs);
}
```

**Validation** :
- [ ] GET /api/jobs?filterOlderThan=14&status=INBOX retourne count correct

---

### Étape 6 (optionnel) — Ajouter tests Unit + Intégration pour GET /api/jobs?filterOlderThan

**Objectif** : (Optionnel, si Étape 5 implémentée séparément) Validation du endpoint estimation

**Tests suggérés** :
```typescript
// __tests__/get-jobs-estimate.test.ts
test("GET /api/jobs?filterOlderThan=14 returns correct count", async () => {
  // Setup: insert 10 jobs, 3 with createdAt > 14 days ago
  // Assert: response.total === 3
});
```

---

### Étape 7 — Ajouter tests Unit + Intégration

**Objectif** : Validation comportement + régression

**Changements** :
- Créer `__tests__/FilterOldJobsDialog.test.tsx`
- Créer `__tests__/inbox-filter-integration.test.ts` (si server-side)

**Détails** :

```typescript
// __tests__/FilterOldJobsDialog.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import FilterOldJobsDialog from "@/components/FilterOldJobsDialog";

describe("FilterOldJobsDialog", () => {
  it("should validate input (< 1 rejected)", async () => {
    const onSubmit = vi.fn();
    render(
      <FilterOldJobsDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText("Ex: 14");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Suivant"));

    expect(screen.getByText("Minimum 1 jour")).toBeInTheDocument();
  });

  it("should validate input (> 365 rejected)", async () => {
    const onSubmit = vi.fn();
    render(
      <FilterOldJobsDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText("Ex: 14");
    fireEvent.change(input, { target: { value: "366" } });
    fireEvent.click(screen.getByText("Suivant"));

    expect(screen.getByText("Maximum 365 jours")).toBeInTheDocument();
  });

  it("should transition to step 2 with valid input", async () => {
    const onSubmit = vi.fn();
    render(
      <FilterOldJobsDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText("Ex: 14");
    fireEvent.change(input, { target: { value: "14" } });
    fireEvent.click(screen.getByText("Suivant"));

    // Wait for step 2
    await screen.findByText(/Confirmation/);
    expect(screen.getByText(/14 jour/)).toBeInTheDocument();
  });
});
```

**Validation** :
- [ ] Tous les tests passent
- [ ] Coverage > 80%

---

## Tests

### Unit Tests (Vitest)

**Fichiers** :
- `__tests__/FilterOldJobsDialog.test.tsx` — validation input, state transitions
- `__tests__/rules.engine.test.ts` — evaluateRule pour olderThan (existing, no change)

**Cas couverts** :
- ✓ Input validation (< 1, > 365, valid)
- ✓ Step transitions (1 → 2, back)
- ✓ Error states
- ✓ Submit callback

### Intégration Tests (Vitest)

**Fichiers** :
- `__tests__/inbox-filter-integration.test.ts` — flow complet (mock fetch, etc.)

**Cas couverts** :
- ✓ User saisit jours → [Suivant] → step 2
- ✓ User clic [Filtrer] → PATCH /api/settings (mock)
- ✓ Backend retourne filteredCount
- ✓ Toast affichée avec count correct
- ✓ router.refresh() appelé

---

## Documentation à mettre à jour

1. **docs/17_FEATURE_SMART_RULES.md**
   - Section v1.2 : "Bulk Actions Toolbar from Inbox"
   - Mentionner auto-filter createdAt/olderThan

2. **ARCHITECTURE.md**
   - Ajouter section : "Bulk Actions & Auto-Filtering"
   - Mentionner that rules can be created from UI (en plus de via /api/settings)

3. **Commentaires code** (optionnel)
   - FilterOldJobsDialog.tsx : une ligne au-dessus de handleNext expliquant le fetch estimation

---

## Rollback / Feature flag / déploiement

### Option retenue
**Déploiement direct** (pas de feature flag)

### Raison
- Feature non-risquée (action user-initiated, pas d'impact global)
- Rollback simple si nécessaire (supprimer composants + imports)
- Pas de coordination avec d'autres équipes

### Plan de rollback minimal
Si bug critique détecté post-déploiement :
1. Revert commits Étape 2-6 (FilterOldJobsDialog + menu + backend)
2. Garder Étape 1 (Radix UI ajoutée, inoffensive)
3. Restaurer le bouton texte "Tout marquer comme vu" dans InboxView.tsx
4. Push hotfix commit
5. Redeploy

**Temps rollback estimé** : 15 min

---

## Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Radix UI install échoue | Faible | Blocker (feature non-testable) | Tester `npm install @radix-ui/react-dropdown-menu` en amont |
| Nombre d'offres estimé != réel (step 2) | Moyen | UX confusion | Toujours compter côté serveur lors du [Filtrer] final (qui est source de vérité) |
| Performance : re-évaluation O(N) offres lente | Faible (N < 1000) | Timeout utilisateur | Optimiser si N > 1000 avec indices MongoDB ou batch processing |
| Offre créée entre estimation (step 2) et [Filtrer] | Très faible | Count peut être off by 1 | Acceptable (UX: "environ N offres") |
| Erreur API lors du [Filtrer] | Moyen | Dialog bloquée | Afficher message erreur + bouton [Retry] |
| Dark mode styling manquante | Faible | UX degraded | Auditer tous les `dark:` classes avant merge |

---

## Questions restantes (objectif : vide)

✅ **Tous les gaps de AUDIT.md ont reçu une réponse ou mitigation** :

1. ✅ **A-001** : Étape 5 fusionnée dans Étape 2 (handleNext refetch count)
2. ✅ **A-002** : Limitation suppression documentée (offres restent FILTERED, warning UX)
3. ✅ **A-003** : Radix UI fallback clarifié (HTML natif Option A, ou Headless UI Option B)
4. ✅ **B-001** : Performance O(N) — limite acceptable < 2s, benchmark @impl
5. ✅ **B-002** : console.error() ajouté (client-side seulement)
6. ✅ **B-003** : Race condition acceptée (risque très faible)
7. ✅ **B-004** : Sidebar count clarifié (automatique via getJobs exclusion)
8. ✅ **B-005** : UX "0 offres" clarifié (message + button disabled)
9. ✅ **B-006** : Rollback note ajoutée (offres FILTERED non-restaurées)

---

## Changelog

### v3 (2026-06-16 post-challenge)
- **CHALLENGE applied** : 12 findings triaged (3 ACCEPT, 4 PARTIAL, 5 REJECT)
- **C-003 (ACCEPT)** : Document PATCH /api/settings response contract change (new `filteredCount` field). Pre-impl verification required.
- **C-004 (ACCEPT)** : Use MongoDB `$push` (atomic) instead of `$set` for rule append to prevent concurrent edit loss.
- **C-012 (ACCEPT)** : Add ARIA accessibility notes to Étape 1 if HTML fallback chosen (role, aria-live, aria-label).
- **C-001, C-002, C-006, C-008, C-009 (PARTIAL)** : Keep current design, documented for post-launch review/testing.
- **C-005, C-007, C-010, C-011 (REJECT)** : Mitigated, acceptable, no changes needed.
- **Status** : READY_FOR_IMPLEMENTATION (challenge validated, pre-impl actions documented).
- **Score** : ~92/100 (per AUDIT) + 0 new blockers from CHALLENGE.

### v2 (2026-06-16 post-audit)
- **AUDIT appliqué** : 3 blockers résolus, 6 non-blockers intégrés
- **Étape 5 fusionnée dans Étape 2** : handleNext() appelle GET /api/jobs?filterOlderThan=N directement
- **Limitation suppression documentée** : Offres FILTERED restent bloquées après suppression de règle (mitigation UX recommandée)
- **Radix UI fallback clarifié** : Option A (HTML natif), Option B (Headless UI), test avant impl
- **console.error() ajouté** : Client-side logging pour debugging
- **Edge cases complétées** : "0 offres", "suppression règles", rollback notes
- **Sidebar sync clarifié** : Automatique via getJobs exclusion FILTERED
- **Status** : READY FOR IMPLEMENTATION (score estimé 92/100)

### v1 (2026-06-16)
- Création initiale
- Stratégie : HYBRID
- Scope : fullstack (frontend + backend enrichi)
- Étapes 1-6 définies
- Tests Unit + Intégration planifiés
- **Status** : DRAFT (audit requis, 3 blockers identifiés)

---

## State Lock (pour tracking)

```json
{
  "slug": "2026-06-16__inbox__bulk-actions-toolbar",
  "version": 1,
  "status": "draft",
  "scope": "fullstack",
  "solution_strategy": "HYBRID",
  "last_step_completed": "spec-2-draft",
  "next_step": "spec-3-audit",
  "estimatedEffort": "8-12 hours",
  "estimatedRisk": "low",
  "rollout_strategy": "direct",
  "paths": {
    "spec": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/SPEC.md",
    "intake": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/INTAKE.md"
  }
}
```

---

## Sorties additionnelles

Fichier `.state.json` à copier-coller en `docs/specs/2026-06-16__inbox__bulk-actions-toolbar/.state.json` (si créé automatiquement) :

```json
{
  "slug": "2026-06-16__inbox__bulk-actions-toolbar",
  "paths": {
    "spec": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/SPEC.md",
    "intake": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/INTAKE.md",
    "audit": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/AUDIT.md",
    "challenge": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/CHALLENGE.md",
    "retro": "docs/specs/2026-06-16__inbox__bulk-actions-toolbar/RETRO.md"
  },
  "solution_strategy": "HYBRID",
  "version": 1,
  "last_step": "spec-2-draft",
  "last_status": "DRAFT"
}
```

---

## Next

→ Lance **/spec-3-audit** pour valider cette spec (ambiguïtés, risques, manques)
