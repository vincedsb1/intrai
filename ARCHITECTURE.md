# ARCHITECTURE — intrai (Job Aggregator & Single-Stream Hub)

## Règle de travail (obligatoire)
- Ce fichier est lu au début de chaque prompt.
- Il est mis à jour à la fin de chaque prompt : décisions prises, conventions, nouveaux endpoints, structure de dossiers, TODO.

## Vision
App de tri d’offres : “Visualiser -> Cliquer -> Décider -> Archiver”.
Une seule liste Inbox (flux unique), et des vues secondaires : Traitées (Saved/Trash), Filtrés, Réglages.

## Status Actuel
- **Phase 1-5:** Terminées. Ingestion, Parsing, AI Batch, UI v2.
- **Phase 6 (Location Normalization):** Terminée. Filtre Pays dynamique opérationnel.
- **Phase 7 (Polishing & Deploy):** EN COURS. Prochaines étapes : Auth, Déploiement Vercel final.

## Découpage (monorepo unique)
- Next.js App Router
- UI: composants React + Tailwind v4.1
- Data: MongoDB
- API: Next Route Handlers sous `/app/api/**`

## Dossiers proposés
- `/app` : routes & pages (App Router). `page.tsx` redirige vers `/inbox`.
- `/app/(tabs)` : layout + vues Inbox/Traitées/Filtrés/Réglages
- `/components` : composants UI (JobCard, TabsNav, Modal, Badges, Inputs)
- `/lib` : db (mongo), validation, helpers, constantes
- `/server` : services métier (tri ingestion, règles whitelist/blacklist, AI detective)
- `/docs` : documentation indexée (specs: `/docs/*.md`, règles: `/docs/rules/*.md`, meta: `/docs/meta/*.md`)
- `/tests` : tests vitest (unit + integration)

## Entités (concept)
- Job: offre ingérée
- Settings: whitelist/blacklist (règles)
- Visit: état “vu” (local UI, ou persistant si souhaité)
- AIAnalysis: résultat d’analyse AI Detective (attaché au Job)

## États clés (spéc v12)
- category: TARGET | EXPLORE | FILTERED
- status: INBOX | SAVED | TRASH
- visited: UI-only par défaut (Set local), option de persistance à discuter

## Contrats API (résumé)
- GET /api/jobs?status=&category=
- PATCH /api/jobs/:id (status)
- POST /api/jobs/:id/restore
- POST /api/jobs/bulk-clean-visited (optionnel si visited persistant)
- GET/PATCH /api/settings (whitelist, blacklist)
- POST /api/ingest/webhook (ingestion JSON structuré)
- POST /api/ingest/email (ingestion Email CloudMailin Multipart)
- POST /api/ai/analyze-author (AI Detective)

## Observabilité minimale
- Logs server: ingestion, règles déclenchées, erreurs db, erreurs AI
- Erreurs UI: toast minimal (option), fallback states

## Sécurité minimale
- Webhook ingestion protégé par un secret (header) stocké en env
- API settings potentiellement protégée (au minimum par un token simple) si app exposée
