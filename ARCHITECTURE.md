# ARCHITECTURE — intrai (Job Aggregator & Single-Stream Hub)

## Règle de travail (obligatoire)
- Ce fichier est lu au début de chaque prompt.
- Il est mis à jour à la fin de chaque prompt : décisions prises, conventions, nouveaux endpoints, structure de dossiers, TODO.

## Vision
App de tri d’offres : “Visualiser -> Cliquer -> Décider -> Archiver”.
Une seule liste Inbox (flux unique), et des vues secondaires : Traitées (Saved/Trash), Filtrés, Réglages.

## Status Actuel
- **Phase 1-6:** Terminées (Ingestion, Parsing, AI, Normalisation).
- **Phase 7 (UI Refactor v2):** Terminée. Passage au layout Sidebar/Header Responsive, Glassmorphism, Animations.
- **Phase 8 (Deploy):** À venir.

## Découpage (monorepo unique)
- Next.js App Router
- UI: composants React + Tailwind v4.1
- Data: MongoDB
- API: Next Route Handlers sous `/app/api/**`

## Dossiers proposés
- `/app` : routes & pages (App Router). `page.tsx` redirige vers `/inbox`.
- `/app/(tabs)` : Shell Responsive (Sidebar Desktop / Header Mobile).
- `/components` :
  - **Structure**: `Sidebar`, `MobileHeader`, `DesktopHeader`.
  - **Core**: `JobCard` (v2), `FilterBar`, `Toast` (Custom Action).
  - **Modals**: `AiDetectiveModal`, `BlacklistModal`.
- `/lib` : db (mongo), validation, helpers, constantes
- `/server` : services métier
- `/docs` : documentation indexée

## Entités (concept)
- Job: offre ingérée
- Settings: whitelist/blacklist (règles)
- Visit: état “vu” (local UI, ou persistant si souhaité)
- AIAnalysis: résultat d’analyse AI Detective (attaché au Job)

## États clés (spéc v12)
- category: TARGET | EXPLORE | FILTERED
- status: INBOX | SAVED | TRASH

## Contrats API (résumé)
- GET /api/jobs?status=&category=
- PATCH /api/jobs/:id (status)
- POST /api/jobs/:id/restore
- POST /api/jobs/:id/visit (Persistance "Vu")
- GET/PATCH /api/settings (whitelist, blacklist)
- POST /api/ingest/webhook (ingestion JSON structuré)
- POST /api/ingest/email (ingestion Email CloudMailin Multipart)
- POST /api/ai/ban-author (AI Detective + Blacklist)

## UI Guidelines (v2)
- **Design**: Slate Theme (`#F1F5F9`), Glassmorphism, Ombres douces (`shadow-soft`).
- **Layout**: Sidebar fixe (Desktop) vs Sticky Header + Horizontal Tabs (Mobile).
- **Animations**: `animate-enter`, `slide-up-toast`, transitions fluides.
- **Interactions**: Actions flottantes au survol (Desktop), Badges interactifs.