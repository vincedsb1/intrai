---
name: ui-review
description: Auditer ou améliorer l’interface Web d’une cible précise selon le design system, le responsive, les états et
  l’accessibilité. Ne pas utiliser pour une revue centrée uniquement sur le parcours ou la friction UX.
---

# UI Review

Évaluer ou améliorer une interface Web sans imposer d’architecture applicative, de framework ou de bibliothèque.

## Déterminer le mode

- **Audit** : « audite », « analyse », « évalue », « review » ou demande de diagnostic. Rester strictement en lecture seule.
- **Amélioration** : « améliore », « corrige », « applique », « harmonise » ou demande explicite de modification. Modifier uniquement la cible autorisée.
- Si l’intention de modification n’est pas explicite, choisir le mode audit.

Un audit ne modifie aucun fichier, ne crée aucun rapport persistant et ne lance pas de commande générant un artefact suivi. Une amélioration ne donne pas l’autorisation de refondre les écrans voisins.

## Résoudre la cible

1. Partir du chemin, du nom de page, du composant ou de la zone indiqué par l’utilisateur.
2. Si la cible n’est pas directement résolue, rechercher les fichiers, routes déclarées, imports et composants portant ce nom.
3. Inspecter la cible et ses dépendances visuelles directes : composants rendus, styles, thème et état nécessaire à l’affichage.
4. Ne poser une question que si plusieurs cibles restent aussi plausibles après cette recherche.

Avant toute modification, examiner le statut du dépôt et le diff de chaque fichier cible déjà modifié. Préserver les changements existants et ignorer les modifications sans rapport.

## Trouver la documentation

Trouver les documents par leur nom exact dans le dépôt, sans supposer leur emplacement. Exclure archives, dépendances, caches et copies générées. Si plusieurs documents actifs portent le même nom, identifier leur autorité avant de continuer.

`DESIGN.md` est obligatoire pour toute cible. Charger ensuite uniquement les documents requis :

| Cible ou problème | Documents supplémentaires |
|---|---|
| Style, couleurs ou typographie | `01_TOKENS_AND_TYPOGRAPHY.md` |
| Composant | `01_TOKENS_AND_TYPOGRAPHY.md`, `02_COMPONENTS.md`, `04_STATES_AND_INTERACTIONS.md` |
| Page complète | `01_TOKENS_AND_TYPOGRAPHY.md`, `02_COMPONENTS.md`, `03_LAYOUT_AND_RESPONSIVE.md` |
| Formulaire ou interaction | `02_COMPONENTS.md`, `04_STATES_AND_INTERACTIONS.md`, `05_MOTION_AND_ACCESSIBILITY.md` |
| Responsive | `03_LAYOUT_AND_RESPONSIVE.md`, `05_MOTION_AND_ACCESSIBILITY.md` |
| Motion ou accessibilité | `05_MOTION_AND_ACCESSIBILITY.md` |
| Page SaaS connue | Modules UI nécessaires et archétype correspondant |

Les archétypes reconnus sont `landing-page.md`, `dashboard.md`, `settings.md` et `profile.md`. Lire `00_INDEX.md` seulement si le choix de l’archétype est ambigu. Ne jamais charger les quatre archétypes ensemble.

Si un document obligatoire manque, le signaler comme blocker. Ne pas remplacer silencieusement le design system par des préférences générales.

## Examiner l’interface

Adapter la revue à la cible et aux documents chargés :

- tokens, rôles de couleur et typographie ;
- hiérarchie visuelle, rythme et densité ;
- anatomie et cohérence des composants ;
- états interactifs, formulaires et feedback ;
- conteneurs, grilles, débordements et adaptations responsive ;
- focus, clavier, sémantique, contraste et mouvement réduit ;
- cohérence entre thèmes lorsque les deux existent.

Utiliser le code comme preuve structurelle, pas comme preuve de qualité visuelle. Examiner le rendu dans un navigateur lorsque celui-ci est accessible sans action risquée. Tester les largeurs et états pertinents plutôt qu’une taille unique.

Ne jamais déclarer qu’un rendu est validé, fidèle ou sans régression visuelle sans l’avoir observé. Si le rendu n’est pas accessible, placer ces points dans les éléments non vérifiés.

## Prioriser

Un **blocker** empêche la tâche principale, viole une exigence obligatoire du design system, crée une interaction inutilisable ou produit un risque d’accessibilité sérieux. Afficher tous les blockers.

Les autres écarts deviennent des recommandations classées par impact. En afficher cinq au maximum. Ne pas calculer de score global.

## Mode amélioration

1. Corriger d’abord les blockers dans la cible.
2. Appliquer ensuite les recommandations à fort impact compatibles avec la demande.
3. Réutiliser les primitives et conventions déjà présentes lorsque leur contrat est conforme.
4. Modifier une dépendance directe seulement si la correction ne peut pas être faite proprement dans la cible et si cette dépendance est clairement incluse dans la demande.
5. Exécuter les validations techniques proportionnées aux fichiers touchés.
6. Inspecter le rendu final si l’environnement le permet.

Ne pas créer de nouveau design system, déplacer des fonctionnalités, réécrire du contenu métier ou étendre le périmètre sans demande correspondante.

## Réponse

Présenter dans cet ordre :

1. **Cible et mode**.
2. **Documents chargés** et raison de leur sélection.
3. **Observations** factuelles, avec fichier et ligne lorsque possible.
4. **Problèmes** : afficher d’abord tous les blockers, puis les écarts non bloquants retenus ; écrire « Aucun » si aucune catégorie n’en contient.
5. **Recommandations** : donner le correctif minimal de chaque blocker et cinq recommandations non bloquantes maximum.
6. **Éléments non vérifiés**, notamment le rendu si non inspecté.
7. En mode amélioration : fichiers modifiés et validations exécutées.

Ne pas écrire de rapport sur disque par défaut. Ne pas proposer de patch obligatoire en mode audit ; décrire le correctif minimal suffit, sauf si l’utilisateur demande un diff.
