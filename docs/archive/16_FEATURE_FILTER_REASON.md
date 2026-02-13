# Plan d'implémentation : Affichage Raison Filtrage & Icône IA

**Date** : 2026-01-28
**Statut** : Planifié
**Contexte** : Amélioration de l'UX dans l'onglet "Filtrés" et distinction visuelle entre le filtrage par règles (Blacklist) et l'analyse IA.

## 1. Objectif
- **Vue Filtrés** : Afficher explicitement pourquoi une offre a été filtrée (ex: "Mot-clé : Angular") sur la carte.
- **JobCard** : Distinguer visuellement l'alerte "IA" (analyse de l'auteur) de l'alerte "Règle" (Blacklist).
  - IA : Icône Robot (`Bot`).
  - Filtre : Icône Bouclier (`ShieldAlert`).

## 2. Modifications Techniques

### 2.1 Composant `JobCard` (`components/JobCard.tsx`)

#### Imports
- Ajouter `Bot` depuis `lucide-react`.
- Conserver `ShieldAlert`.

#### Logique d'affichage
Actuellement, le composant affiche uniquement l'analyse IA en bas de contenu.
Nous allons modifier cette section pour créer une zone de "Méta-informations de tri" qui pourra contenir l'un ou l'autre (ou les deux).

**Pseudo-code de la zone "Warnings" :**
```tsx
<div className="mt-3 space-y-2">
  {/* 1. Raison du Filtrage (Prioritaire si visible) */}
  {(isFilteredView || job.category === 'FILTERED') && job.matchedKeyword && (
     <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
        <ShieldAlert size={14} className="shrink-0 text-red-600 dark:text-red-500" />
        <span className="font-medium">Filtre : {job.matchedKeyword}</span>
     </div>
  )}

  {/* 2. Analyse IA (Si présente) */}
  {job.aiAnalysis?.isPlatformOrAgency && (
     <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400">
        <Bot size={14} className="shrink-0 text-amber-600 dark:text-amber-500" />
        <span className="font-medium">IA : {job.aiAnalysis.reason}</span>
     </div>
  )}
</div>
```

### 2.2 Données (`lib/types.ts`)
- Vérifier que `matchedKeyword` est bien présent dans l'interface `Job` (Déjà confirmé : `matchedKeyword?: string | null`).

## 3. Impact Visuel
- **Couleurs** :
  - Filtre (Blacklist) : Rouge (`red-50` / `text-red-800`) pour signifier une exclusion bloquante.
  - IA (Avertissement) : Ambre/Orange (`amber-50` / `text-amber-800`) pour signifier une suspicion/info.
- **Alignement** :
  - Si les deux sont présents, ils s'empileront proprement (`space-y-2`).
  - L'utilisateur a demandé "sur la même ligne" : si l'espace le permet (Desktop), on pourra utiliser `flex flex-wrap gap-2` au lieu de `space-y-2`.

## 4. Étapes d'exécution
1.  Modifier `components/JobCard.tsx` pour importer `Bot`.
2.  Implémenter le rendu conditionnel pour `matchedKeyword` avec le style `red`.
3.  Remplacer l'icône et le style de la section IA par `Bot`.
4.  Vérifier le rendu dans la vue `/filtered`.

## 5. Questions / Validation
- Le champ `matchedKeyword` est-il bien peuplé par le backend lors de l'ingestion ? (À vérifier dans `server/jobs.service.ts` si besoin, mais supposé acquis par le modèle de données).
