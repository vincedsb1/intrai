# UI Map & règles d’affichage

## Navigation principale (Tabs)
- Inbox
- Traitées
- Filtrés
- Réglages

## Inbox (Vue Principale)
- **Groupement** : Les offres sont groupées par lot d'ingestion (Date + Heure) pour visualiser les arrivées récentes.
- **Filtres** :
  - **Recherche** : Titre ou Entreprise.
  - **Pays** : Dropdown dynamique (basé sur les offres visibles).
  - **Mode** : Tous / À distance / Hybride / Sur site.
  - **Easy Apply** : Toggle pour candidatures simplifiées.
- **Persistance** : Les filtres sont conservés dans l'URL (`?q=...&mode=remote`).

## JobCard (Composant)
- **Layout** : Logo à gauche, Titre/Entreprise au centre, Actions en haut à droite.
- **Badges** :
  - Métadonnées : Salaire, Mode de travail, Recrutement actif (🔥), Candidature simplifiée (⚡), Top Match (🎯).
  - Avertissement IA : Badge rouge en bas de carte si ESN/Plateforme détectée.
- **Actions Rapides** :
  - 🛡️ **Filtrer** : Ouvre une modale pour blacklister l'entreprise.
  - 🗑️ **Trash** : Supprime l'offre (avec Toaster d'annulation 5s).
  - 🔖 **Save** : Sauvegarde l'offre.
  - 👁️ **Vu/Non-vu** : Toggle manuel de l'état visité.
- **Clic** : Ouvre l'offre dans un nouvel onglet.

## Toasters
- **Undo Trash** : Apparaît 5s après suppression. Permet d'annuler.
- **Bulk Clean** : Permet de supprimer toutes les offres visitées d'un coup. Masquable.