# Plan de Refonte UI (v2)

Ce document décrit le plan d'implémentation pour la refonte de l'interface utilisateur d'`intrai`, basé sur `MAQUETTE_UI_new.html`. L'objectif est de moderniser l'UI avec une sidebar responsive, des animations soignées, et un design système plus épuré (Glassmorphism, ombres douces).

## 1. Styles Globaux & Thème (`app/globals.css`)

Mise à jour pour supporter les animations et le style visuel de la maquette.

- **Couleurs**:
  - Background principal: `#F1F5F9` (Slate 100/150).
  - Slate Dark: `#1e293b` (pour contrastes forts).
- **Utilitaires**:
  - `.glass`: Fond blanc/translucide avec `backdrop-blur`.
  - `.scrollbar-hide`: Masquer la scrollbar tout en gardant le scroll.
  - Custom Scrollbar: Fine et discrète (`w-1.5`, `rounded`).
- **Animations**:
  - `@keyframes enter`: Apparition fluide (fade + slide up).
  - `@keyframes slideUpToast`: Animation du Toast depuis le bas.
  - `.stagger-*`: Classes utilitaires pour décaler l'apparition des listes.

## 2. Architecture Layout (`app/layout.tsx` ou `app/(tabs)/layout.tsx`)

Passage d'un layout "Tabs-only" à une structure hybride **Sidebar (Desktop) / Header + Tabs (Mobile)**.

### Desktop (md:flex)
- **Sidebar gauche fixe** (`w-[280px]`):
  - Logo "intrai." avec gradient.
  - Navigation verticale (Inbox, Traitées, Filtrés, Réglages).
  - Indicateur de statut système en bas.
- **Main Content droite** (`flex-1`):
  - Header sticky (Date, Search, Notifs).
  - Zone de contenu scrollable.

### Mobile (hidden md:flex)
- **Header Sticky** (`glass`):
  - Logo + Toggle Recherche.
  - **Tabs Nav Horizontale**: Scrollable, style "Pill" segmenté.
- **Main Content**: Pleine largeur sous le header.

## 3. Nouveaux Composants

### `components/Sidebar.tsx`
- Navigation latérale pour desktop.
- Props: `activeTab`, `onTabChange` (ou via routing Next.js `usePathname`).
- Design: Boutons avec indicateur actif (barre latérale bleue + fond léger).

### `components/MobileHeader.tsx`
- En-tête mobile combinant Logo, Search Toggle, et Navigation Tabs.
- Design: Glassmorphism.

### `components/FilterBar.tsx`
- Extraction de la logique de filtres de `InboxView`.
- Design: Boutons "Pill" avec icônes.
- Filtres: Mode (Remote/Hybrid), Easy Apply, Pays.

### `components/Toast.tsx`
- Remplacement du toaster existant.
- Design: Flottant, fond sombre (`slate-900`), flou (`backdrop-blur`).
- Position: Centré en bas.
- Types: `success` (Saved), `trash` (Ignored).

## 4. Mise à jour Composants Existants

### `components/JobCard.tsx`
- **Style**: `rounded-2xl`, `shadow-soft`, bordures plus fines.
- **Actions**:
  - **Mobile**: Boutons toujours visibles (cercles).
  - **Desktop**: Actions flottantes apparaissant au `hover` (plus propre).
- **Badges**: Refonte visuelle (couleurs plus douces, style "Tag").
- **Logo**: Fallback avec gradient léger si pas d'image.

### `components/InboxView.tsx`
- Intégration du `FilterBar`.
- Gestion des états vides (Empty States) avec illustrations (icônes grisées).
- Groupement par date avec headers discrets.

### `components/SettingsView.tsx`
- Abandon des listes simples pour un design en **Cartes**.
- Sections: "Mots-clés Automatiques", "Blacklist".
- Design des tags plus interactif (`hover:red` pour supprimer).

## 5. Plan d'Action (Checklist)

1.  [ ] **Styles**: Mettre à jour `app/globals.css` (Animations, Scrollbar).
2.  [ ] **Composants UI**: Créer `Sidebar`, `MobileHeader`, `FilterBar`, `Toast`.
3.  [ ] **Refonte JobCard**: Mettre à jour `JobCard.tsx`.
4.  [ ] **Layout**: Refondre `app/(tabs)/layout.tsx` pour intégrer Sidebar/MobileHeader.
    *Note: Adapter la logique de navigation (actuellement par dossiers `/app/(tabs)/*` vs `activeTab` state dans la maquette). On gardera le routing Next.js.*
5.  [ ] **Vues**: Mettre à jour `InboxView` et `SettingsView`.
6.  [ ] **Vérification**: Tester le responsive (Mobile vs Desktop) et les animations.

## Note Technique sur la Navigation
La maquette utilise un `useState` pour les tabs (`activeTab`).
L'application Next.js utilise le routing (`/inbox`, `/settings`, etc.).
**Décision**: On conserve le routing Next.js.
- La `Sidebar` et `MobileHeader` utiliseront `<Link>` et `usePathname` pour déterminer l'état actif.
