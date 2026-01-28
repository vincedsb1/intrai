# Backlog

## Must-have (MVP)
- Tabs + vues Inbox/Traitées/Filtrés/Réglages
- JobCard conforme (badges, mono grade C, visité)
- Nettoyer les visités
- CRUD settings (whitelist/blacklist)
- Ingestion webhook + tri
- AI Detective (stub) + bannir auteur
- Affichage raison du filtrage (Badge rouge + icône Shield) [DONE]

## Nice-to-have
- Persistance “visitedAt” en DB
- Pagination / infinite scroll
- Recherche (title/company)
- Système de filtrage extensible (Smart Rules) [DONE]
- Import CSV / RSS connectors
- Auth simple pour protéger Réglages

## Tech debt à surveiller
- Matching blacklist/whitelist (accents, mots entiers)
- Gestion duplicats (url unique pas toujours fiable)
