---
name: ui-review
description: Review UI implementation, layout, accessibility, responsiveness, and visual consistency against project conventions.
---

# [PROTOCOL] UI/UX Audit & Compliance Absolute Skill (/ui-review)

**Version : 4.0.0 — "Forensic Auditor"**

> OBJECTIF : Auditeur impitoyable, **exécutif** (pas déclaratif).
> La conformité est binaire : **PASS** ou **FAIL** — avec **patch concret** (diff exact, pas description).
> Score pondéré 0 → 100. < 80 = page non-shippable.

---

## Philosophie

Cette v4 corrige les angles morts de v3.x identifiés lors d'audits de pages long-form et tabular registry (18 violations réelles, dont seulement 5 détectées par v3.1.0). Les principes :

1. **Exécuter avant de décrire** : commencer par des commandes `grep` qui produisent une liste exhaustive de violations. Pas d'inférence avant.
2. **Référentiel négatif explicite** : lister les classes interdites (slate, indigo, rose, emerald, amber, blue, bg-white, hex bruts, emojis Unicode) en plus du référentiel positif (tokens sémantiques).
3. **Patterns transverses** : auditer des **chaînes couplées** (long form → StickyActionBar + Cmd+Enter + kbd hint + aria-busy + pb-40) comme une seule unité, pas en éléments indépendants.
4. **Inférences sémantiques** : reconnaître quand un pattern HTML natif est incompatible avec une exigence design (ex : `<select>` natif + icônes ⇒ migrer en custom dropdown).
5. **Diff concret** : tout FAIL doit s'accompagner du diff avant/après exact, prêt à appliquer.

---

## Référentiel de Vérité (SoT)

Croiser le code avec `docs/rules/UI/` (00 à 09). Toute déviation = FAIL.

- **00_DESIGN_LANGUAGE.md** — Philosophie (Apple HIG + identité)
- **01_DESIGN_TOKENS_AND_VARIABLES.md** — Tokens sémantiques, palette, typographie, anti-coral guard
- **02_WEB_COMPONENTS.md** — Composants web (Badge, Switch, StickyActionBar, IconTile, Tabs)
- **03_WEB_MOTION_ACCESSIBILITY.md** — Motion, a11y, raccourcis clavier (Cmd+Enter global)
- **04_SCREEN_PATTERNS.md** — Patterns (Dense Tabular List, Multi-form, Sticky Bar)
- **06_COMPONENT_PATTERNS_AND_STATES.md** — Inputs, disabled strict, ToggleGroup 3-way
- **07_SCREEN_ANATOMY_RULES.md** — Wrapper, safe areas, navigation
- **09_MOCKUP_BRIEF_[GEMINI].md** — Brief mockup (PARTIE C — patterns trader pro)

---

## I. PHASE 0 — PRE-FLIGHT GREP BLACKLIST (EXÉCUTABLE)

**L'IA DOIT exécuter ces commandes EN PREMIER**, avant toute analyse contextuelle. Chaque match = **FAIL automatique** documenté avec fichier + ligne + colonne.

### 0.1 Palette Tailwind par défaut (INTERDITE — utiliser tokens sémantiques)

```bash
# Slate/zinc/gray par défaut → utiliser foreground/muted-foreground/border
grep -rEn 'slate-(50|100|200|300|400|500|600|700|800|900|950)|zinc-[0-9]|gray-[0-9]|neutral-[0-9]' \
  frontend/app frontend/components

# Indigo/violet/sky/blue/cyan → utiliser primary (Coral) ou secondary (Navy) ou info
grep -rEn 'indigo-[0-9]|violet-[0-9]|sky-[0-9]|blue-[0-9]|cyan-[0-9]|fuchsia-[0-9]|purple-[0-9]' \
  frontend/app frontend/components

# Rose/red/pink → utiliser destructive
grep -rEn 'rose-[0-9]|red-[0-9]|pink-[0-9]' frontend/app frontend/components

# Emerald/green/teal/lime → utiliser success
grep -rEn 'emerald-[0-9]|green-[0-9]|teal-[0-9]|lime-[0-9]' frontend/app frontend/components

# Amber/yellow/orange → utiliser warning
grep -rEn 'amber-[0-9]|yellow-[0-9]|orange-[0-9]' frontend/app frontend/components

# bg-white / text-white littéraux (sauf sur primary-foreground / destructive-foreground)
grep -rEn 'bg-white\b|text-white\b' frontend/app frontend/components
```

**Verdict** : chaque match = FAIL `-10pts` par occurrence. Le fichier mappé doit migrer vers les tokens sémantiques.

### 0.2 Hex en dur dans le code (sauf `@theme` block CSS)

```bash
# Hex bruts dans TSX/JSX — interdit (sauf SVG fill explicite ou commentaire)
grep -rEn '#[0-9a-fA-F]{3,8}\b' frontend/app frontend/components --include='*.tsx' --include='*.ts'
```

**Verdict** : tout match dans `className` ou `style` = FAIL `-10pts`. Acceptable uniquement dans `@theme` block (`globals.css`).

### 0.3 Emojis Unicode (DOIVENT être remplacés par icônes lucide flat)

```bash
# Emojis dans le code (sauf fichiers .md de doc)
grep -rEn '[\x{2600}-\x{27BF}]|[\x{1F300}-\x{1F9FF}]|★|⛔|→|✓|✗|▾|🗑|←|⚠|☑|☒' \
  frontend/app frontend/components --include='*.tsx' --include='*.ts'
```

**Verdict** : chaque emoji = FAIL `-5pts`. Migrer vers `lucide-react` (Star, Ban, ArrowRight, Check, X, ChevronDown, Trash2, ArrowLeft, AlertTriangle).

**Cas particulier `<select><option>{"★ "}…</option>` (interdit techniquement)** : `<option>` HTML natif ne peut contenir aucun SVG. Si la sémantique exige des icônes, **migrer vers custom dropdown** (button + popover listbox). Voir Section 4.7.

### 0.4 Classes Tailwind brutes vs tokens sémantiques (mapping rapide)

| Brut interdit | Token sémantique | Quand |
|---|---|---|
| `slate-700`, `slate-900` | `text-foreground` | Texte principal |
| `slate-500`, `slate-400` | `text-muted-foreground` | Texte secondaire |
| `slate-300`, `slate-200` | `border-border` / `border-border/50` | Bordures |
| `slate-100` | `bg-muted` | Hover, fond doux |
| `slate-50` | `bg-muted/50` | Fond très subtil |
| `bg-white` | `bg-card` / `bg-popover` | Surfaces |
| `indigo-600`, `blue-600` | `bg-primary text-primary-foreground` | CTA principal |
| `rose-600` | `bg-destructive text-destructive-foreground` | Destructive |
| `rose-50/100` + `rose-700` | `bg-destructive/5 text-destructive border-destructive/30` | Banner erreur |
| `emerald-600` | `bg-success text-success-foreground` | Validation |
| `emerald-50` + `emerald-700` | `bg-success/5 text-success border-success/30` | Banner succès |
| `amber-50/100` + `amber-800` | `bg-warning/5 text-warning-foreground border-warning/30` | Banner warning |

---

## II. PHASE 1 — ANTI-CORAL PARASITISME

Référence : `01 §1` (guard table).

> Le **coral (`#df6035`)** est le **signal d'action**. Sa rareté garantit son efficacité (loi 60/30/10). Tout usage non-actionnel est un FAIL.

### Détecter les abus de Coral

```bash
# 1. Badges en outline-soft-primary — ne doivent jamais être informationnels
grep -rEn 'outline-soft-primary' frontend/app frontend/components

# 2. text-primary / bg-primary / border-primary
grep -rEn 'text-primary\b|bg-primary\b|border-primary\b|ring-primary\b' \
  frontend/app frontend/components
```

Pour chaque match, **vérifier sémantiquement** :
- ✅ **PASS** : CTA principal (Launch, Save, Submit, Confirm, Apply)
- ✅ **PASS** : État actif (sidebar item sélectionné, tab sélectionné, option choisie)
- ✅ **PASS** : Ring focus
- ✅ **PASS** : Feedback "action prête" (paste JSON valide → Apply button passe en Coral)
- ❌ **FAIL** : Badge compteur (`<Badge>3 items</Badge>`)
- ❌ **FAIL** : Métadonnée de statut neutre
- ❌ **FAIL** : Accent décoratif (illustration, séparateur, ombre)
- ❌ **FAIL** : Icône informationnelle (chevron, ellipsis)

**Patch type** :
```diff
- <Badge variant="outline-soft-primary">{count} items</Badge>
+ <Badge variant="outline-soft-muted">{count} items</Badge>
```

---

## III. PHASE 2 — PAGE WRAPPER STRUCTURE

Référence : `07 §3.1` + `04 §StickyActionBar`.

### 2.1 Wrapper standardisé

Toute page DOIT envelopper son contenu :

```tsx
<div className="mx-auto w-full max-w-{4xl|6xl|7xl} space-y-6 pb-{8|40}">
  {/* contenu */}
</div>
```

Vérifications :
1. `mx-auto` + `max-w-*` cohérent avec le type de contenu :
   - `max-w-4xl` (896px) → settings, formulaire simple
   - `max-w-6xl` (1152px) → grid dashboard
   - `max-w-7xl` (1280px) → tabular registry, long form complexe
2. `space-y-6` ou `space-y-8` pour le rythme vertical
3. `pb-40` **OBLIGATOIRE** si la page contient un `<StickyActionBar>` (sinon le dernier contenu est masqué)
4. `pb-8` minimum sinon

### 2.2 Détection : StickyActionBar présent → wrapper doit avoir pb-40+

```bash
# Lister les pages avec StickyActionBar
grep -rEn '<StickyActionBar\b' frontend/app frontend/components

# Pour chaque page matchée, vérifier que le wrapper a pb-32, pb-40 ou plus
grep -En 'mx-auto.*max-w-.*pb-(8|12|16|20|24|28)' frontend/app/<page>/page.tsx
```

Si match : FAIL — patch ajouter `pb-40`.

---

## IV. PHASE 3 — COMPLIANCE MATRIX PAR TYPE DE PAGE

Pour chaque page auditée, identifier le **type** puis vérifier la matrix.

| Pattern → Type page | StickyActionBar | Cmd+Enter | kbd hint `⌘↵` | aria-busy | font-mono dates/IDs | IconTile section header | Progressive Disclosure |
|---|---|---|---|---|---|---|---|
| **Long form** (page avec formulaire multi-section) | **OBLIGATOIRE** | **OBLIGATOIRE** | **OBLIGATOIRE** | **OBLIGATOIRE** | si présent | **OBLIGATOIRE** | recommandé |
| **Dashboard** (page avec KPIs / cards résumé) | optionnel (bulk) | non | non | sur boutons action | OBLIGATOIRE sur dates | **OBLIGATOIRE** | non |
| **Registry / Tabular list** | optionnel (bulk delete) | non | non | sur boutons action | OBLIGATOIRE sur IDs/dates/metrics | recommandé | non |
| **Modal / Drawer** | non (footer interne) | OBLIGATOIRE (Enter submit) | non | OBLIGATOIRE | si dates | non | non |
| **Settings page** | OBLIGATOIRE (Save) | recommandé | recommandé | OBLIGATOIRE | si dates | OBLIGATOIRE | OBLIGATOIRE par section |

### 3.1 Détection automatique du type

```bash
# Long form = page avec >= 1 <form> ET un bouton submit avec submitting state
grep -rEn '<form\b|useState<.*[Ss]ubmitting' frontend/app/<page>/page.tsx

# Dashboard = page avec des Cards de KPIs
grep -rEn '<IconTile|<Card.*Header.*type-title3' frontend/app/<page>/page.tsx

# Registry = page avec une table dense
grep -rEn 'sticky top-0.*backdrop-blur.*grid grid-cols' frontend/app/<page>/page.tsx
```

---

## V. PHASE 4 — SCANNER PAR COMPOSANT

Pour CHAQUE composant détecté, audit dédié. Chaque check produit PASS / FAIL + patch.

### 4.1 `<h1>`, `<h2>`, `<h3>` (titres)

Vérifications :
- ✅ Classe `.type-title1` / `.type-title2` / `.type-title3` (référence 01 §2)
- ✅ `text-balance` sur titres courts (1-3 mots)
- ✅ `text-pretty` sur paragraphes descriptifs sous le titre
- ✅ `text-foreground` (pas `slate-900`)
- ❌ FAIL si `text-xl font-semibold` brut (= violation typographique)

**Patch type** :
```diff
- <h1 className="text-xl font-semibold text-slate-900">Stratégies & Objectifs</h1>
+ <h1 className="type-title1 text-balance text-foreground">Stratégies &amp; Objectifs</h1>
```

### 4.2 `<input type="date">`

**OBLIGATOIRE** : `font-mono` dans className (alignement vertical scannable).

```bash
grep -rEn '<input[^>]*type="date"' frontend/app frontend/components
```

Pour chaque match, vérifier `font-mono` dans `className`. Sinon FAIL.

### 4.3 `<input>` numériques (`type="number"`, `inputMode="decimal"`, `inputMode="numeric"`)

**OBLIGATOIRE** : `font-mono tabular-nums`

Pattern strict :
```tsx
className="type-body w-full min-h-9 rounded-md border border-transparent bg-input px-2 py-1 text-right font-mono tabular-nums transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:border-border/40 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60"
```

### 4.4 `<input>` text génériques + `<textarea>`

Pattern strict (référence 06 §4) :
```tsx
className="type-body flex min-h-11 w-full rounded-md border border-transparent bg-input px-3 py-2 transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
```

Checks :
- ✅ `min-h-11` (touch target 44px)
- ✅ `bg-input` (pas `bg-white`)
- ✅ `border-transparent` au repos (`border-primary` au focus)
- ✅ `focus-visible:ring-1 focus-visible:ring-primary` (Coral focus ring)
- ❌ FAIL si `border-slate-300`, `border-gray-300`, etc.

### 4.5 `<label>` (contraste hiérarchique)

**RÈGLE** : le label DOIT être moins fort que l'input (hiérarchie inversée intentionnelle, référence 06 §4).

Pattern correct :
```tsx
<label className="type-callout mb-1.5 block font-medium text-muted-foreground">
  Stratégie
</label>
```

❌ FAIL si :
- `text-foreground font-semibold` (label trop fort, écrase l'input)
- `text-xs uppercase tracking-wide` (style "form de saisie d'usine")

### 4.6 `disabled:*` modifiers (DISABLED STRICT — 4 INDICES)

**RÈGLE** : un élément désactivé DOIT communiquer son état via AU MOINS 4 indices visuels :

```tsx
disabled:cursor-not-allowed
disabled:border-border/40
disabled:bg-muted
disabled:text-muted-foreground
disabled:opacity-60
```

```bash
# Détecter les disabled incomplets
grep -rEn 'disabled:opacity-50\b(?![^"]*disabled:cursor-not-allowed)' \
  frontend/app frontend/components
```

❌ FAIL si seulement `disabled:opacity-50` sans les autres → patch ajouter les 4 indices manquants.

### 4.7 `<select>` natif

**RÈGLE** : un `<option>` HTML ne peut contenir **aucun élément React** (SVG, icône, badge). Si la sémantique exige des marqueurs visuels par item, le `<select>` natif est **techniquement incompatible**.

```bash
# Détecter les <select> avec contenu non-textuel dans les options
grep -rPn '<option[^>]*>[^<]*[★⛔→✓✗▾🗑]' frontend/app frontend/components
grep -rEn '<option[^>]*>\{[^}]*\?.*[":]' frontend/app frontend/components
```

Si match : FAIL. **Migrer vers custom dropdown** (button + popover listbox) :

```tsx
<button
  type="button"
  role="combobox"
  aria-haspopup="listbox"
  aria-expanded={open}
  className="type-body flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-transparent bg-input px-3 py-2 hover:bg-muted focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
>
  <span className="flex items-center gap-2">
    {item.hasObjectives && <Star className="h-4 w-4 text-primary" fill="currentColor" />}
    {item.hasVeto && <Ban className="h-4 w-4 text-destructive" />}
    <span className="truncate font-mono">{item.label}</span>
  </span>
  <ChevronDown className="h-4 w-4 text-muted-foreground" />
</button>
{open && (
  <div role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
    {items.map(it => (
      <button key={it.value} role="option" aria-selected={it.value === value} ...>
        {/* icons + label */}
      </button>
    ))}
  </div>
)}
```

### 4.8 `<button type="submit">` principal (CTA)

Pattern strict :
```tsx
<button
  type="submit"
  form="<form-id>"
  disabled={submitDisabled}
  aria-busy={submitting || undefined}
  className="type-headline flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-primary-foreground shadow-sm dark:shadow-none transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
>
  {submitting ? "Launching…" : "Launch"}
  <kbd className="hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 type-caption font-mono text-primary-foreground/80 sm:inline-flex">
    ⌘↵
  </kbd>
</button>
```

Checks couplés (TOUS obligatoires sur long form) :
- ✅ `bg-primary text-primary-foreground` (Coral)
- ✅ `min-h-11`
- ✅ `aria-busy={submitting || undefined}`
- ✅ `<kbd>⌘↵</kbd>` enfant (visible sm:inline-flex)
- ✅ `disabled:cursor-not-allowed disabled:opacity-50`
- ✅ `form="<form-id>"` si bouton hors du `<form>` (lift pattern)
- ✅ `active:scale-[0.98]` (micro-feedback)
- ✅ `focus-visible:ring-2 focus-visible:ring-ring`

### 4.9 `<details>` / Collapsible (Progressive Disclosure)

**RÈGLE** : tout bloc > 60 lignes marqué "optionnel", "avancé", "workflow IA", "presets" DOIT être en `<details>` natif (ou Collapsible custom).

Pattern :
```tsx
<details className="group rounded-xl border border-border/50 bg-card shadow-xs dark:shadow-none">
  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 transition-colors hover:bg-muted/30">
    <div className="flex items-center gap-2">
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      <span className="type-callout font-medium text-foreground">Section optionnelle</span>
    </div>
    <span className="type-caption text-muted-foreground">Optionnel</span>
  </summary>
  <div className="space-y-3 border-t border-border/40 p-4">
    {/* contenu révélé */}
  </div>
</details>
```

### 4.10 Header de section avec `<IconTile>`

**RÈGLE** : tout `<h2>` ou `<h3>` qui ouvre une section significative DOIT être précédé d'un `<IconTile>` (référence 01 §12, 02 §IconTile).

Pattern :
```tsx
<header className="flex items-center gap-3">
  <IconTile variant="primary" size="sm">
    <Target className="h-5 w-5" />
  </IconTile>
  <h2 className="type-title3 text-balance text-foreground">Objectifs & Contraintes</h2>
</header>
```

Variants disponibles : `primary` (Coral, action), `success`, `destructive`, `warning`, `muted` (neutre informationnel). Anti-coral : ne pas mettre `primary` sur une section informationnelle.

### 4.11 Banner messages (error / warning / success / info)

Pattern strict :
```tsx
// Error
<div className="type-callout rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">

// Warning
<div className="type-callout rounded-md border border-warning/30 bg-warning/5 p-3 text-warning-foreground">

// Success
<div className="type-callout rounded-md border border-success/30 bg-success/5 p-3 text-success">

// Info (rare — préférer warning si rappel doux)
<div className="type-callout rounded-md border border-info/30 bg-info/5 p-3 text-info">
```

❌ FAIL si `bg-rose-50 text-rose-700`, `bg-amber-50 text-amber-800`, `bg-emerald-50 text-emerald-700`.

---

## VI. PHASE 5 — WORKFLOW AUDIT CROSS-COMPONENT

Inférences transverses : auditer des **chaînes couplées** comme une unité.

### 5.1 Chaîne "Long form interactive"

Si la page contient :
- `<form id="...">` avec champs éditables
- `useState<...>` + `setSubmitting`
- Bouton `type="submit"`

Alors **TOUS** ces éléments doivent être présents (chaîne 5/5) :

1. ✅ `useEffect(() => { window.addEventListener("keydown", onKey) ... }` détectant `e.key === "Enter" && (e.metaKey || e.ctrlKey)` + `form.requestSubmit()`
2. ✅ Bouton submit avec `<kbd>⌘↵</kbd>` enfant
3. ✅ Bouton submit avec `aria-busy={submitting || undefined}`
4. ✅ Bouton submit avec `min-h-11`
5. ✅ Bouton submit avec `bg-primary text-primary-foreground` (Coral)

Si **N/5** manquants → FAIL `-3pts × N`.

### 5.2 Chaîne "Long form avec actions multiples"

Si la page contient un long form avec actions Save + Reset + Delete (≥ 3 actions destinées au footer) :

1. ✅ `<StickyActionBar>` présent
2. ✅ `<StickyActionBar.Summary>` avec récap dynamique (dirty count, validation state)
3. ✅ `<StickyActionBar.Actions>` avec les boutons
4. ✅ Save en Coral, Delete avec confirm inline, Reset en outline neutre
5. ✅ Wrapper page parent avec `pb-40`

Si **N/5** manquants → FAIL `-4pts × N`.

### 5.3 Chaîne "Multi-form sur même page"

Si la page contient ≥ 2 `<form id="...">` :

1. ✅ Chaque form a un `id` unique
2. ✅ Les boutons submit dans la sticky bar référencent le form via `form="<id>"` (lift pattern)
3. ✅ État global lifted vers le parent (`onStateChange` callback de chaque form)
4. ✅ Cmd+Enter handler global qui détecte le form actif (ex: depuis `mode` ou `strategyName`)

### 5.4 Chaîne "Dense Tabular List"

Si la page contient ≥ 3 rows partageant des colonnes alignées (ex: checkbox + label + select + input + flag) :

1. ✅ Header row sticky : `sticky top-0 z-10 grid grid-cols-12 gap-3 bg-muted/50 backdrop-blur-sm type-overline text-muted-foreground`
2. ✅ Chaque row : `grid grid-cols-12 items-center gap-3 border-b border-border/40 px-3 py-2 hover:bg-muted/30`
3. ✅ Colonnes nommées dans l'ordre logique (`On` → `Label` → `Op` → `Value` → `Flag`)
4. ✅ Inputs numériques en `font-mono tabular-nums`
5. ✅ Row inactive (toggle off) → `opacity-60` (pas `grayscale` ni `opacity-50`)

❌ FAIL si rows en `flex items-center gap-2 py-1.5` (liste plate, gaspille 50% de l'espace).

### 5.5 Chaîne "Feedback Coral sur action prête"

Si un bouton "Apply" / "Confirm" / "Validate" est conditionnellement actif (ex: après parse JSON valide) :

1. ✅ Détecter l'état "prêt" via memo / state (parsable, valid, populated)
2. ✅ Quand non-prêt : `border-border bg-card text-foreground hover:bg-muted` (neutre)
3. ✅ Quand prêt : `bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]` (Coral vibrant)
4. ✅ Disabled physique uniquement si vraiment bloquant (input vide), pas si juste "pas prêt"

---

## VII. PHASE 6 — RAPPORT STRUCTURÉ AVEC DIFF CONCRET

### Format de sortie obligatoire

```markdown
# UI Audit — <page-path>  <!-- remplacer par le chemin réel de la page -->

## Score : N/100

| Catégorie | Score | Note |
|---|---|---|
| Phase 0 (palette + emojis + hex) | X/30 |  |
| Phase 1 (anti-coral) | X/10 |  |
| Phase 2 (wrapper) | X/10 |  |
| Phase 3 (matrix par type) | X/15 |  |
| Phase 4 (composants) | X/20 |  |
| Phase 5 (workflow cross-component) | X/15 |  |

## FAIL (blocages)

### FAIL-001 : Palette Tailwind par défaut (`-10pts`)
**Fichier** : `frontend/components/<module>/<Component>.tsx:107`
**Référence** : `01 §1` (zéro-hex / tokens sémantiques)

\`\`\`diff
- <label className="w-48 text-sm text-slate-700">{label}</label>
+ <label className="type-callout col-span-5 truncate text-foreground">{label}</label>
\`\`\`

### FAIL-002 : `<select>` natif avec emojis (`-15pts`)
**Fichier** : `frontend/app/<page>/page.tsx:258`
**Référence** : Section 4.7 + `01` (no-emoji)
**Action** : Migrer vers custom dropdown avec lucide `<Star>` + `<Ban>`. Voir Section 4.7 pour le pattern complet.

## WARN (suggestions)

### WARN-001 : Label trop fort (`-1pt`)
**Fichier** : `frontend/app/<page>/page.tsx:432`
**Référence** : `06 §4` (contraste hiérarchique)

\`\`\`diff
- <label className="text-foreground font-semibold mb-2">Date de début</label>
+ <label className="type-callout mb-1.5 block font-medium text-muted-foreground">Date de début</label>
\`\`\`

## PASS (validés)

- ✅ Wrapper standard `mx-auto max-w-7xl space-y-6 pb-40`
- ✅ IconTile sur header de section
- ✅ Cmd+Enter handler global (chaîne 5/5)
```

---

## VIII. PHASE 7 — SCORING PONDÉRÉ

| Type de violation | Pénalité par occurrence |
|---|---|
| Palette Tailwind par défaut (slate, indigo, rose, emerald, amber, blue, etc.) | **-10pts** |
| Hex en dur dans `className` ou `style` | **-10pts** |
| `bg-white` / `text-white` littéral | **-8pts** |
| Emoji Unicode dans le code | **-5pts** |
| Anti-coral parasite (`outline-soft-primary` informationnel) | **-5pts** |
| `<select>` natif avec contenu non-textuel | **-15pts** (refacto majeur) |
| StickyActionBar manquante sur long form | **-15pts** |
| Dense Tabular List manquante (liste plate ≥ 3 rows) | **-10pts** |
| Progressive Disclosure manquante (bloc > 60 lignes "optionnel") | **-8pts** |
| Cmd+Enter handler manquant sur long form | **-5pts** |
| `<kbd>⌘↵</kbd>` manquant sur bouton submit principal | **-3pts** |
| `aria-busy` manquant pendant submit | **-3pts** |
| `min-h-11` manquant sur CTA | **-3pts** |
| `font-mono` manquant sur date / number input | **-2pts** |
| `text-balance` manquant sur titre | **-1pt** |
| `text-pretty` manquant sur paragraphe descriptif | **-1pt** |
| Label en `text-foreground font-semibold` (contraste inversé) | **-2pts** |
| Disabled strict incomplet (< 4 indices) | **-2pts** |
| IconTile manquant sur header de section | **-2pts** |
| Card padding non uniforme (`p-4 lg:p-6` au lieu de `p-6`) | **-1pt** |
| `pb-40` manquant sur wrapper avec StickyActionBar | **-5pts** (le dernier contenu est masqué) |

**Seuils** :
- **100-90** : Production-ready ✅
- **89-80** : Quelques retouches mineures
- **79-60** : Refactor nécessaire avant merge
- **< 60** : Non-shippable ❌

---

## IX. APPENDIX — CHECKLIST EXHAUSTIVE (à exécuter ligne par ligne)

### A. Palette & couleurs
- [ ] `grep 'slate-[0-9]'` → 0 match
- [ ] `grep 'indigo-[0-9]'` → 0 match
- [ ] `grep 'rose-[0-9]'` → 0 match
- [ ] `grep 'emerald-[0-9]'` → 0 match
- [ ] `grep 'amber-[0-9]'` → 0 match
- [ ] `grep 'blue-[0-9]'` → 0 match
- [ ] `grep bg-white\b` → 0 match
- [ ] `grep text-white\b` (hors `text-primary-foreground` / `text-destructive-foreground`) → 0 match
- [ ] `grep #[0-9a-fA-F]{3,8}` hors `@theme` → 0 match
- [ ] `grep '★|⛔|→|✓|✗|▾|🗑'` → 0 match

### B. Typographie
- [ ] `<h1>` utilise `.type-title1` + `text-balance`
- [ ] `<h2>` utilise `.type-title2` ou `.type-title3` + `text-balance`
- [ ] `<p>` descriptif utilise `.type-body` + `text-pretty` + `text-muted-foreground`
- [ ] Labels utilisent `.type-callout mb-1.5 block font-medium text-muted-foreground`
- [ ] Caption / footnote utilise `.type-caption` ou `.type-footnote text-muted-foreground`
- [ ] Toutes valeurs numériques (dates, IDs, metrics, prices) en `font-mono` (`tabular-nums` si alignement vertical)

### C. Inputs
- [ ] `<input type="date">` → `font-mono`
- [ ] `<input>` numérique → `font-mono tabular-nums text-right`
- [ ] `<input type="text">` → pattern complet 06 §4
- [ ] `<select>` natif sans contenu non-textuel (sinon migrer)
- [ ] `<textarea>` → pattern complet 06 §4
- [ ] Tous les inputs ont `focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary`

### D. Boutons
- [ ] CTA principal : `bg-primary text-primary-foreground min-h-11 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring`
- [ ] Bouton submit : `aria-busy`, `<kbd>`, `form="<id>"` si lifted
- [ ] Bouton secondaire : `border border-border bg-card hover:bg-muted`
- [ ] Bouton destructive : `border-destructive/40 bg-card text-destructive hover:bg-destructive/5`
- [ ] Disabled strict (4 indices) sur tous

### E. Layout & wrapper
- [ ] Wrapper page : `mx-auto w-full max-w-{4xl|6xl|7xl} space-y-6 pb-{8|40}`
- [ ] `pb-40` si `<StickyActionBar>` présent
- [ ] Cards : `rounded-xl border border-border/50 bg-card p-6 shadow-xs dark:shadow-none` (uniforme, pas responsive)
- [ ] Sections avec header : `<IconTile>` + `<h2 type-title3 text-balance>`

### F. Patterns transverses
- [ ] Long form → chaîne 5/5 (Cmd+Enter + kbd + aria-busy + min-h-11 + bg-primary)
- [ ] Long form ≥ 3 actions → `<StickyActionBar>` avec Summary + Actions
- [ ] Multi-form → lift state + `form="<id>"` + handler Cmd+Enter avec routing
- [ ] Liste ≥ 3 rows alignées → Dense Tabular List avec sticky header
- [ ] Bloc > 60 lignes "optionnel" → `<details>` Progressive Disclosure
- [ ] Bouton "Apply" conditionnel → feedback Coral quand action prête

### G. Accessibilité
- [ ] Boutons interactifs ont `aria-*` appropriés (`aria-pressed`, `aria-checked`, `aria-expanded`, `aria-haspopup`)
- [ ] Modales : `role="dialog"` + `aria-modal="true"` + focus trap + Escape close
- [ ] Listbox custom : `role="listbox"` + chaque item `role="option" aria-selected`
- [ ] Switch custom : `role="switch" aria-checked`
- [ ] Contraste WCAG AA : `text-muted-foreground` jamais sur texte critique petit (<14px regular)

### H. Motion
- [ ] Pas de `transition-all` brut (préférer `transition-colors`, `transition-transform`, `transition-all motion-safe:`)
- [ ] `active:scale-[0.98]` sur CTA principaux
- [ ] `motion-safe:` sur animations longues
- [ ] `dark:shadow-none` sur élévations claires

---

## X. RÈGLE D'OR DE L'AUDITEUR

Si le code est fonctionnel mais "tassé", "informationnel surdimensionné", ou "mou" (cf. 00 + 09) : c'est un **FAIL** structurel. La respiration, la hiérarchie typographique, la rareté du Coral et la précision des patterns transverses sont des **exigences techniques**, pas des options cosmétiques.

> **Verdict trader pro** (cf. 09 PARTIE C) : la page doit pouvoir être scannée en **0.5 seconde** par un utilisateur expert. Si l'œil hésite, si le Coral est dilué, si les valeurs numériques ne s'alignent pas verticalement, si les actions principales sont perdues en flow normal : la page n'est pas shippable.

---

## APPENDIX Z — MASTER CHECKLIST 150 POINTS

> **Référentiel forensique exhaustif** (8 dimensions × ~19 items). À utiliser en complément des Phases 0-7 pour une revue de qualité absolue.
> Format : **# | Item | Grep / heuristique | Référence SoT**
> Une cellule "—" en colonne Grep signifie : check **visuel** ou **manuel** (pas d'auto-détection).

### Z.1 — TYPOGRAPHIE & MICRO-TYPO

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 1 | Plus Jakarta Sans pour le texte UI | `@theme.--font-sans` doit être Jakarta | 01 §2 |
| 2 | Geist Mono pour toutes les données numériques | `grep -L 'font-mono' <fichier-avec-input-number>` | 01 §2 + 09 PARTIE C |
| 3 | Geist Mono pour `snake_case` variables techniques | — | 01 §2 |
| 4 | Hiérarchie iOS 17 (Display → Caption) — classes `.type-*` | `grep -cE 'text-(xs\|sm\|base\|lg\|xl\|2xl)\b' = 0` | 01 §2 |
| 5 | Interlignage corps 1.5-1.6 | `.type-body` line-height | 01 §2 |
| 6 | `text-balance` sur titres H1-H3 | `grep -L 'text-balance' <h1\|h2\|h3>` | 01 §2 |
| 7 | `text-pretty` sur paragraphes | `grep -L 'text-pretty' <p type-body>` | 01 §2 |
| 8 | Espace insécable `&nbsp;` avant `!?:`  | `grep -nE ' [!?:]\b'` (texte FR) | 09 PARTIE C |
| 9 | Espace insécable avant emojis | — (manuel) | 09 PARTIE C |
| 10 | Pas d'orphelins (1 mot ligne finale titre) | `text-balance` couvre auto | 01 §2 |
| 11 | Max 3 niveaux typographiques / carte | — (manuel) | 04 |
| 12 | Alignement vertical décimales via mono | `tabular-nums` accompagne `font-mono` | 01 §2 |
| 13 | Tracking gros titres `-0.02em` | `.type-title1/2` tracking-tight | 01 §2 |
| 14 | Tracking petits textes `+0.02em` | `.type-overline tracking-wider` | 01 §2 |
| 15 | Réduction poids en Dark Mode (anti-halo) | `dark:font-medium` sur titres bold | 03 §motion |
| 16 | Capitalisation `type-overline` (uppercase + tracking) | `.type-overline` token | 01 §2 |
| 17 | `line-clamp-N` pour texte long | `grep 'line-clamp'` au besoin | 04 |
| 18 | Pas de serif | grep `font-serif` = 0 | 01 §2 |
| 19 | Taille mini captions ≥ 12px | `.type-caption` = 13px | 01 §2 |
| 20 | Inputs ≥ 16px (anti-zoom iOS) | `.type-body` sur inputs = 16px | 06 §4 |

### Z.2 — COULEURS & CONTRASTE

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 21 | Règle 60/30/10 (Neutre/Structure/Accent) | — (audit visuel) | 00 + 01 §1 |
| 22 | Coral `#df6035` exclusif aux CTA | Phase 1 audit anti-coral | 01 §1 |
| 23 | Coral pour états actifs (sidebar, tab) | `aria-current="page"` → `text-primary bg-primary/10` | 01 §1 |
| 24 | Navy `#2f4b79` pour éléments structurels | `bg-secondary text-secondary-foreground` | 01 §1 |
| 25 | Zéro hex hardcodé (tokens uniquement) | `grep '#[0-9a-fA-F]{3,8}' frontend/app frontend/components` = 0 | 01 §1 |
| 26 | Contraste WCAG AA 4.5:1 texte normal | — (manuel) | 03 §a11y |
| 27 | Contraste 3:1 mini UI (bordures, icônes) | — (manuel) | 03 §a11y |
| 28 | `muted` `#f9fafb` fonds secondaires | `bg-muted` partout au lieu de `bg-slate-50` | 01 §1 |
| 29 | `background` `#e8ebed` fond page | `bg-background` racine | 01 §1 |
| 30 | Rouge = Erreur/Destruction uniquement | Phase 4.11 banners audit | 01 §1 |
| 31 | Vert = Succès uniquement | Phase 4.11 banners audit | 01 §1 |
| 32 | Orange = Alerte uniquement | Phase 4.11 banners audit | 01 §1 |
| 33 | Pas de mélange bleu système / bleu marque | — | 01 §1 |
| 34 | Opacité `text-foreground/60` textes tertiaires | `text-muted-foreground` préféré | 01 §1 |
| 35 | Profondeur Dark : Canvas < Surface < Elevated | `bg-background < bg-card < bg-popover` | 01 §1 |
| 36 | Pas de noir pur en Dark | `bg-background` = #121212 dans `@theme` | 01 §1 |
| 37 | Bordure subtile `border-border/50` | `grep 'border-border\b'` (vs `/50`, `/40`) | 01 §1 |
| 38 | Input fond distinct (`bg-input`) | `grep 'bg-input'` sur inputs | 01 §1 |
| 39 | Ring focus visible en Coral | `focus-visible:ring-primary` | 01 §1 |
| 40 | Pas d'ombres en Dark Mode | `dark:shadow-none` sur tous les `shadow-*` | 01 §6 |

### Z.3 — ESPACEMENT & LAYOUT (4PX GRID)

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 41 | Multiples de 4px | `grep -E 'p-[1-9][0-9]?\b'` (Tailwind = 4px base) | 01 §3 |
| 42 | Padding page mobile 16px (`px-4`) | — | 07 §wrapper |
| 43 | Padding page desktop 24px (`lg:px-6`) | — | 07 §wrapper |
| 44 | Card padding `p-6` (24px) | Phase 7 scoring | 04 §card |
| 45 | Card dense `p-4` | acceptable si dense, sinon `p-6` uniforme | 04 §card |
| 46 | Gap sections `gap-8` (32px) | `space-y-6` à `space-y-8` | 07 §wrapper |
| 47 | Gap composants proches `gap-2` (8px) | — | 04 |
| 48 | `max-w-4xl` (896px) contenus textuels | Phase 2 audit | 07 |
| 49 | `max-w-7xl` (1280px) dashboards | Phase 2 audit | 07 |
| 50 | `mx-auto` pour centrer | Phase 2 audit | 07 |
| 51 | Safe-area bottom `pb-8` ou `pb-safe` | iOS Home Indicator | 07 |
| 52 | Pas de contenu collé bords viewport | wrapper `px-*` obligatoire | 07 |
| 53 | Grille responsive 1 / md:2 / xl:4 | — | 04 |
| 54 | `grid-flow-dense` pour bento mixed spans | `grep 'grid-flow-dense'` | 04 |
| 55 | Alignement grille `stretch` par défaut | pas `items-start` global | 04 |
| 56 | `row-span` toujours préfixé d'un breakpoint | `grep -E 'class[^"]*row-span-[0-9]'` sans `(md\|lg\|xl):` = warn | 04 |
| 57 | `h-dvh` au lieu de `h-screen` sur mobile | `grep 'h-screen'` = warn (préférer h-dvh) | 07 |
| 58 | `pb-40` si Sticky Action Bar | Phase 2.2 audit | 04 + 07 |
| 59 | Espace négatif généreux | — (manuel) | 00 |
| 60 | Alignement optique icônes dans boutons | `inline-flex items-center gap-N` | 02 §button |

### Z.4 — COMPOSANTS : ANATOMIE & ÉTATS

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 61 | CTA primaire `min-h-11` (44px) | Phase 4.8 audit | 06 §button |
| 62 | Composant dense `min-h-9` (36px) | acceptable secondary | 06 |
| 63 | Card radius `rounded-2xl` (16px) | `grep 'rounded-xl.*bg-card'` = FAIL | 01 §4 (révisé 2026-05-12) |
| 64 | Bouton radius `rounded-xl` (12px) | `grep 'rounded-md.*bg-primary'` = FAIL | 01 §4 (révisé 2026-05-12) |
| 65 | Input radius `rounded-md` (6px) | — | 01 §4 |
| 66 | Nested Radius Rule (enfant < parent) | — (manuel) | 01 §4 |
| 67 | États boutons : Idle/Hover/Active/Focus/Disabled | `grep -L 'focus-visible:.*disabled:'` sur button = warn | 06 §button |
| 68 | Loading : spinner + `aria-busy="true"` | `grep -L 'aria-busy' <bouton submit>` | 06 §button |
| 69 | Disabled : 4 indices (cursor + opacity + bg + border) | Phase 4.6 audit | 06 §4 |
| 70 | Switch iOS (44x24px), transition 200ms | — | 02 §switch |
| 71 | IconTile 44px container, fond `bg-/10`, icône 20px | `<IconTile size="default">` + `<X className="size-5">` | 01 §12 + 02 §IconTile |
| 72 | StickyActionBar `backdrop-blur-xl` + shadow-top | Phase 4 audit | 04 §sticky |
| 73 | Badge pill-shape `rounded-full type-caption` | — | 02 §12 |
| 74 | Badge `outline-soft-*` (border 30% + texte plein) | `grep 'outline-soft-' badge.tsx` | 02 §12 |
| 75 | Input : label visible + id unique + `aria-describedby` | — (manuel) | 06 §4 |
| 76 | Select : trigger avec chevron rotation au clic | `<ChevronDown> + transition-transform group-data-[state=open]:rotate-180` | 02 §select |
| 77 | Checkbox carré 16-18px, `rounded-sm` | — | 02 §checkbox |
| 78 | Radio cercle, point central coral | — | 02 §radio |
| 79 | Textarea : `min-h-24` ou auto-grow | — | 06 §4 |
| 80 | Progress Bar épaisseur 3-4px, success ou primary | — | 02 §progress |

### Z.5 — INTERACTION & MOTION

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 81 | Pas de `transition-all` brut | `grep -E 'transition-all\b(?!.*motion-safe)' = warn` | 03 §motion |
| 82 | Durée tap 100ms | — | 03 §motion |
| 83 | Durée boutons 180ms (`duration-200` Tailwind) | — | 03 §motion |
| 84 | Durée panels/cards 280ms (`duration-300`) | — | 03 §motion |
| 85 | Easing `cubic-bezier(0.2, 0, 0, 1)` | `--ease-out-quart` ou Tailwind `ease-[cubic-bezier(0.2,0,0,1)]` | 03 §motion |
| 86 | `motion-safe:active:scale-95` sur cliquables | `grep 'active:scale-'` sur boutons | 03 §motion |
| 87 | Fallback `reduced-motion` | `motion-safe:` ou `motion-reduce:` | 03 §a11y |
| 88 | Feedback visuel immédiat sur clic | `active:` + `aria-pressed` | 03 §motion |
| 89 | Skeleton screens pendant fetch | `<Skeleton>` component | 04 §skeleton |
| 90 | Délai anti-flash 200ms sur skeleton | `setTimeout(showSkeleton, 200)` ou `delay-200` | 04 §skeleton |
| 91 | Hover states clairs (fond ou ombre) | `hover:bg-muted` ou `hover:shadow-sm` | 02 |
| 92 | Transition fluide Light↔Dark | `transition-colors` sur racine | 03 §motion |
| 93 | Scroll fluide (`scroll-smooth`) | `<html className="scroll-smooth">` | 07 |
| 94 | `backdrop-blur-xl` sur headers sticky | StickyActionBar | 02 §sticky |
| 95 | Pas d'auto-play vidéos/anims lourdes | — | 03 §a11y |
| 96 | Modales : fermeture par Escape | `useEffect + keydown Escape` | 03 §a11y |
| 97 | Modales : fermeture par clic overlay (sauf critiques) | `onClick={onClose}` sur backdrop | 02 §dialog |
| 98 | Haptic feedback simulé visuellement | `active:scale-[0.98]` + opacity | 03 §motion |
| 99 | Animation de sortie (exit) sur toasts | Framer Motion ou `transition-opacity` | 04 §toast |
| 100 | Indicateur progression si chargement > 1s | `<Progress>` ou spinner labellisé | 04 §progress |

### Z.6 — ACCESSIBILITÉ & ARIA

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 101 | Navigation clavier (Tab order) logique | — (manuel) | 03 §a11y |
| 102 | `focus-visible:ring-*` sur tous interactifs | `grep -L 'focus-visible:'` sur `<button>` `<a>` `<input>` | 03 §a11y |
| 103 | `aria-label` sur boutons icon-only | `grep -E '<button[^>]*>\s*<[A-Z][a-z]+ '` sans `aria-label` = FAIL | 03 §a11y |
| 104 | `aria-hidden="true"` sur icônes décoratives | `grep -L 'aria-hidden' <lucide icon décoratif>` | 03 §a11y |
| 105 | `aria-current="page"` sur item nav actif | — | 03 §a11y |
| 106 | `role="alert"` sur bannières erreur critiques | `grep 'role="alert"'` sur banner destructive | 03 §a11y |
| 107 | Contraste 4.5:1 texte secondaire en dark | — (manuel via DevTools) | 03 §a11y |
| 108 | Pas que la couleur pour info (ajouter texte/icône) | Status badge a label + variant | 03 §a11y |
| 109 | Skip-links vers contenu principal | `<a href="#main">Skip</a>` | 07 |
| 110 | Labels formulaires toujours visibles (pas placeholder seul) | `grep '<input.*placeholder="' sans `<label>'` voisin = warn | 06 §4 |
| 111 | Groupement via `<fieldset><legend>` | `grep -L 'fieldset' <radio group>` | 06 |
| 112 | Support pinch-to-zoom mobile | `<meta name="viewport" content="...user-scalable=yes">` (default) | 07 |
| 113 | Taille texte ajustable sans casser layout | `rem` ou `em` partout | 01 §2 |
| 114 | Pas de `tabIndex > 0` | `grep -E 'tabIndex={[1-9]'` = FAIL | 03 §a11y |
| 115 | Modales : focus-trap | composant `<Dialog>` Radix | 02 §dialog |
| 116 | `aria-invalid="true"` sur champs en erreur | `grep -L 'aria-invalid' <input invalide>` | 03 §a11y |
| 117 | Identification liens externes | `<ExternalLink>` icon ou `rel="external"` | 03 §a11y |
| 118 | Alt-text descriptif images non-décoratives | `grep '<img' sans `alt=`'` = FAIL | 03 §a11y |
| 119 | Temps lecture toasts ≥ 5s | `duration: 5000` sur toast | 04 §toast |
| 120 | `<html lang="fr">` | `grep 'lang=' app/layout.tsx` | 07 |

### Z.7 — UX PATTERNS & CHARGE COGNITIVE

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 121 | Loi de Hick : limiter options au premier regard | — (manuel) | 04 |
| 122 | Progressive Disclosure (`<details>`) | Phase 4.9 audit | 04 §collapsible |
| 123 | Loi de Fitts : zones interactives larges, près pouces | `min-h-11` sur mobile CTA | 06 §button |
| 124 | Z-Pattern marketing | — | 04 |
| 125 | F-Pattern pages denses | — | 04 |
| 126 | Un seul sujet/concept par Card | — (manuel) | 04 §card |
| 127 | Empty States : icône + explication + action | Phase 4 audit pattern empty | 04 §empty |
| 128 | Bannière Dirty si modif non sauvée | `<StickyActionBar.Summary>` montre dirty count | 04 §sticky |
| 129 | Confirmation avant action destructive | inline-confirm pattern ou `<AlertDialog>` | 02 §dialog |
| 130 | Auto-save vs validation manuelle explicite | choisir l'un, jamais les deux | 04 |
| 131 | Affordance : cliquables ressemblent à boutons | pas de `<div onClick>` brut | 06 §button |
| 132 | Cohérence : mêmes icônes pour mêmes actions | — (manuel) | 02 |
| 133 | Recherche via `Cmd+K` / `Ctrl+K` | `useEffect` global keydown | 03 §shortcuts |
| 134 | Breadcrumbs pour navigation profonde | `<Breadcrumb>` component | 04 §breadcrumb |
| 135 | Sidebar desktop multi-tasking | `<Sidebar>` component | 07 |
| 136 | Bottom Nav mobile (si app mobile-first) | — | 07 |
| 137 | États Skeleton pendant SSR | `<Suspense fallback={<Skeleton />}>` | 04 §skeleton |
| 138 | UI s'efface devant le contenu | — (philosophie) | 00 |
| 139 | Pas de pop-ups intrusifs (modales au chargement) | — (audit visuel) | 04 §dialog |
| 140 | Éviter jargon (sauf cible expert) | — | 00 |

### Z.8 — POLISH & STYLE VISUEL

| # | Item | Grep / heuristique | Réf. SoT |
|---|---|---|---|
| 141 | `shadow-xs` light mode uniquement | `grep 'shadow-xs'` sans `dark:shadow-none` adjacent = warn | 01 §6 |
| 142 | Bordures cards `border-border/50` | `grep 'border-border\b'` sans `/50` ou `/40` | 01 §1 |
| 143 | Icônes lucide outline 20px (`size-5`) | `grep '<[A-Z][a-z]+ ' sans `className="size-` = warn | 02 §icons |
| 144 | Masque hex pour graphes progression | — | 02 §progress |
| 145 | Gradients légers uniquement | `grep 'bg-gradient-'` review manuel | 01 §1 |
| 146 | `backdrop-blur` pour profondeur | StickyActionBar + Modal | 02 §sticky |
| 147 | Alignement icônes sidebar (même largeur box) | `<SidebarItem>` standardisé | 07 |
| 148 | Cohérence arrondis partout | sweep `rounded-*` | 01 §4 |
| 149 | Pas de séparateurs si espace blanc suffit | `<hr>` minimisé | 04 |
| 150 | Finitions "iOS-inspired" (fluidité, rebond, profondeur) | — (philosophie) | 00 + 09 |

---

### Comment exploiter la checklist Z

1. **Audit rapide (PR review)** : exécuter Phase 0-5 (~5 min). Renvoie 80% des FAIL.
2. **Audit forensique (avant release)** : compléter avec Appendix Z (~30 min). Renvoie les 20% restants (polish, a11y avancée, motion fine, FR typo).
3. **Score combiné** : Phase 7 weighted (-pts par violation) + Appendix Z = checklist binaire (✅/❌). Page production-ready si `phase7_score ≥ 90` ET `appendix_z_pass_rate ≥ 95%`.

> **Note de provenance** : Cette checklist Z fusionne 4 sources — règles internes UI 00→09, audit forensique Gemini "150-point premium UI", patterns Apple HIG (iOS 17 / Sonoma), et inspirations Linear / Vercel. Toute divergence avec `01_DESIGN_TOKENS_AND_VARIABLES.md` doit être arbitrée dans la SoT, pas dans cette checklist.
