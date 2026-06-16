# 1) FeatureBrief

## Objectif
Ajouter une barre d'actions groupées dans le header de la page Inbox permettant à l'utilisateur de :
1. **Marquer tout comme vu** (action existante, à déplacer du bouton texte vers menu)
2. **Filtrer les offres > N jours** (NOUVEAU) : ouvre un dialog pour saisir le nombre de jours, puis crée une Smart Rule `createdAt/olderThan` pour les filtrer vers la catégorie FILTERED

## In-scope
- Remplacer le bouton texte "Tout marquer comme vu" par une icône ⚙️ en haut à droite du header
- Ajouter un menu déroulant (2 options) au clic sur l'icône
- Créer un dialog dédié "Filtrer les offres > N jours" (input numérique + boutons Annuler/Filtrer)
- Intégrer la création automatique de SmartRule au backend (appel PATCH /api/settings avec nouvelles rules)
- Afficher un toast de confirmation : "X offres filtrées (> N jours)"
- Mise à jour immédiate de la page (offres filtrées disparaissent du /inbox)

## Out-of-scope
- Modifier le contrat API /api/settings (accepte déjà les règles)
- Modifier le moteur d'évaluation (evaluateRule dans rules.engine.ts existe déjà)
- Ajouter des options au menu au-delà de 2 (Marquer tout comme vu + Filtrer > N jours)
- Modifier le RuleEditorModal ou SettingsView (la règle se crée silencieusement, pas d'édition)
- Tests E2E (optionnel)

## Hypothèses actuelles
- Le menu déroulant sera implémenté en HTML/Tailwind natif (pas Shadcn/Radix)
- La SmartRule créée sera auto-nommée (format "Auto: N jours" ou similaire)
- L'action "Marquer tout comme vu" restera fonctionnellement identique
- Pas de feature flag : déploiement direct
- Validation input : nombre > 0 (pas de range max)
- La règle est créée + activée immédiatement (pas de "prévisualisation")

---

# 2) ProjectKnowledge

## Fichiers lus
- **architecture_loaded**: true — `ARCHITECTURE.md` (stack, contraintes, Smart Rules v1.1)
- **reference_docs_used**:
  - `docs/17_FEATURE_SMART_RULES.md` — contexte Smart Rules, modèle de données, types
  - `components/InboxView.tsx` — localisation bouton "Tout marquer comme vu", state management, handlers
  - `lib/types.ts` — SmartRule, RuleCondition, RuleOperator types (createdAt + olderThan déjà présents)
  - `components/RuleEditorModal.tsx` — pattern modal existant, gestion conditions dynamiques, input numérique
  - `server/rules.engine.ts` — logique evaluateRule() pour createdAt/olderThan (déjà implémentée)
  - `app/api/settings/route.ts` — endpoint GET/PATCH existant acceptant rules
  - `components/BlacklistModal.tsx` — pattern modal pour dialogue simple
  - `app/(tabs)/inbox/page.tsx` — page serveur, structure props InboxView

## Contraintes extraites
- **No breaking changes** : Endpoint /api/settings doit rester compatible (déjà flexible pour rules)
- **Backward compatibility** : "Marquer tout comme vu" DOIT rester identique en fonctionnement
- **Smart Rule format** : Doit respecter le contrat TypeScript existant (id, name, enabled, conditions[], action)
- **Validation input** : Nombre de jours > 0 (cf. constraints spec)
- **UX mobile-first** : Header doit rester compact (icône seule, pas de label texte)
- **Dark mode support** : Tous les composants Tailwind doivent supporter dark: classes
- **Timezone** : UTC (cohérent avec MongoDB, cf. rules.engine.ts)
- **Evaluation côté serveur** : Les règles s'évaluent dans ingestJob (cf. ARCHITECTURE), donc la mise à jour du /inbox passe par router.refresh() ou refetch

## Open doc gaps
- Comment les offres filtrées sont actuellement affichées dans /inbox ? (filter côté client ou refetch serveur?)
- Existe-t-il déjà un composant Dropdown réutilisable pour les menus ou c'est toujours des select natifs?
- Le nombre d'offres filtrées (pour le toast "X offres filtrées") doit-il être compté côté client (après appel API et refetch) ou retourné par l'API?

---

# 3) ContextMap (anchors)

## anchors_sure
- `components/InboxView.tsx:303-310` — Bouton "Tout marquer comme vu" à remplacer par icône + menu
- `components/InboxView.tsx:252-267` — Fonction handleBulkClean() qui déplace jobs en TRASH (logique à réutiliser pour le menu)
- `app/(tabs)/inbox/page.tsx` — Page serveur (SC) qui passe initialJobs à InboxView (CC)
- `server/rules.engine.ts:107-123` — evaluateRule() qui matche createdAt/olderThan (déjà en place)
- `app/api/settings/route.ts:13-21` — PATCH handler qui accepte body et appelle updateSettings()
- `lib/types.ts:53-76` — SmartRule, RuleCondition types + RuleOperator qui inclut "olderThan"

## anchors_maybe
- `components/RuleEditorModal.tsx:189-200` — Input numérique pour createdAt (peut inspirer FilterOldJobsDialog)
- `server/settings.service.ts` — Service non lu, mais supposé exister (updateSettings, getSettings)
- `server/jobs.service.ts` — Service non lu, mais supposed exister (getJobs, et il évalue les règles au filtrage)
- `components/Toast.tsx` — Toast existant, devra être réutilisé pour la confirmation de filtrage

---

# 4) SolutionStrategy

## Choix
**HYBRID**

## Justification
- **Moteur existant** : evaluateRule() + Smart Rules types sont prêts → pas besoin de logique serveur complexe
- **UI légère** : Menu simple + 1 dialog = peu de nouveaux composants (FilterOldJobsDialog)
- **Intégration client/serveur** : Créer la règle (PATCH /api/settings) puis refetch /inbox (router.refresh())
- La stratégie HYBRID permet de maximiser le code existant (RuleEditorModal pour inspiration, InboxView pour patterns) tout en restant modéré en complexité (pas de refactoring global, juste 1-2 composants neufs)

---

# 5) Questionnaire (copiable, max 12)

```text
Q1 [UX — Icône & Menu]
Quelle icône pour le bouton settings, et comment implémenter le menu déroulant?
A) Icône ⚙️ (Settings) + menu <details>/<summary> HTML natif (simple, no lib)
B) Icône ⋮ (MoreVertical) + div positionnée en absolu + hover/click handler
C) Icône ⚙️ + vrai composant Radix UI Dropdown (si vous avez besoin de plus tard)

Q2 [UX — Layout Mobile]
Comment le bouton settings apparaît-il sur mobile?
A) Icône seule, aucun label (remplace le bouton texte 1:1)
B) Icône + label "Actions" mais texte plus petit que desktop
C) Afficher uniquement sur desktop (hidden md:block)

Q3 [Dialog — Réutilisation]
Créer un composant FilterOldJobsDialog dédié ou réutiliser RuleEditorModal?
A) Dédié (FilterOldJobsDialog.tsx) — simple, clair, spécialisé
B) Réutiliser RuleEditorModal (passer mode="quick-filter")
C) Intégrer la logique directement dans InboxView (pas de composant nouveau)

Q4 [Dialog — Validation]
Validation du nombre de jours : quelle contrainte?
A) Simplement > 0 (1-999)
B) Range 1-365 (un an max, plus réaliste)
C) Range 1-90 (3 mois max, UX focused)

Q5 [API — Nommage de la règle auto-créée]
Format du nom de la SmartRule créée automatiquement?
A) "Auto: N jours" (ex: "Auto: 14 jours")
B) "Auto-filter: N jours" (ex: "Auto-filter: 14 jours")
C) "Filtrer > N jours" (langage naturel, ex: "Filtrer > 14 jours")

Q6 [Toast — Nombre d'offres]
D'où vient le nombre X dans le toast "X offres filtrées (> N jours)"?
A) Compter côté client après refetch (inboxJobs qui disparaissent)
B) Retourné par l'API /api/settings dans la réponse PATCH
C) Basé sur l'âge côté client (avant appel API) sans refetch

Q7 [State Management — Refetch après création de règle]
Après créer la règle, comment mettre à jour l'affichage du /inbox?
A) router.refresh() (déjà utilisé ailleurs, cf. handleUndoTrash)
B) Appel getJobs() côté client pour refetcher les données
C) Re-filtrer localement avec evaluateRule (pas de refetch serveur)

Q8 [UX — Confirmation avant filtrer]
L'utilisateur doit-il confirmer "Êtes-vous sûr?" avant de filtrer?
A) Oui, dialog de confirmation (2 clics total)
B) Non, filtrer au clic direct (1 clic après input du nombre)
C) Oui, avec un Undo dans le toast (toast action pour annuler la règle)

Q9 [Composant Toast — Success vs Info]
Type du toast de confirmation?
A) "success" (vert, cf. "Offre sauvegardée")
B) "info" (bleu, nouveau type)
C) "trash" (rouge, comme "Offre ignorée", puisqu'on supprime des offres)

Q10 [Tests]
Quels tests ajouter?
A) Unit: FilterOldJobsDialog validation, API call simulation (Vitest)
B) Intégration: Full flow creation → Toast → job disappears (Vitest)
C) Aucun (merge temporaire)
D) A + B (recommandé)

Q11 [Observabilité]
Ajouter des logs pour debuggage?
A) Logs dans la console lors du clic du menu (dev friendly)
B) Appels API logger côté serveur (standard pour tracing)
C) Aucun

Q12 [Rollout]
Feature flag ou déploiement direct?
A) Déploiement direct (pas de flag)
B) Feature flag Vercel (si vous avez besoin de A/B)
```

---

# 6) Options (blocs supprimables)

## Tests (recommandé)
- [x] **Unit (Vitest)**
  - FilterOldJobsDialog: validation input (> 0), état local (days)
  - SmartRule creation: format correcto, id unique
- [x] **Intégration (Vitest)**
  - Flow complet: menu clic → dialog open → input + Filtrer → API call → toast + refetch
- [ ] **E2E (Playwright)** — optionnel pour cette feature

## Docs
- [ ] Mettre à jour `docs/17_FEATURE_SMART_RULES.md` avec section "Bulk Actions Toolbar" (v1.2)
- [ ] Ajouter schéma / flow diagram pour "Auto-filter from Inbox" dans ARCHITECTURE.md

## Observabilité
- [ ] **Logs**
  - Client: console.log lors du clic menu + création règle (dev friendly)
  - Serveur: PATCH /api/settings log (standard pour tracing)
- [ ] **Metrics** — optionnel (nombre de règles créées par jour)

## Rollout / Rollback
- [ ] **Déploiement direct** (pas de feature flag)
- [ ] **Plan minimal de rollback** : Supprimer les lignes FilterOldJobsDialog + menu handler si bug

---

# 7) Slug & Next

## Slug proposé
```
2026-06-16__inbox__bulk-actions-toolbar
```

## Dossier cible
```
docs/specs/2026-06-16__inbox__bulk-actions-toolbar/
```

## Next
→ Lance **/spec-2-draft** pour valider questions et produire le plan d'implémentation détaillé
