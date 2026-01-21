# UI Map & règles d’affichage (source maquette)

## Navigation principale (Tabs)
- Inbox
- Traitées
- Filtrés
- Réglages

La structure et le style sont alignés avec la maquette fournie. :contentReference[oaicite:10]{index=10}

## Inbox
- Liste unique verticale
- Filtre data: `status=INBOX` ET `category != FILTERED`
- Visité: si l’utilisateur clique (ouvre lien), la carte devient grisée/opacité réduite
- CTA global: “Nettoyer les visités” (FAB), envoie vers TRASH tous les INBOX visités

## Traitées
- Sous-tabs: SAVED et TRASH
- Chaque sous-tab liste les jobs par status
- Pas d’actions Save/Trash sur ces cartes (view-only)

## Filtrés
- Liste: `category=FILTERED`
- Sur chaque carte: bouton “Repêcher” => restore vers Inbox + category=EXPLORE
- Bandeau explicatif “Mur de Protection” (maquette)

## Réglages
- 2 sections:
  - Whitelist (Cibles): liste + chips supprimables + input ajout
  - Blacklist (Exclusions): idem
