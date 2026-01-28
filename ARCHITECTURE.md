# ARCHITECTURE — intrai (Job Aggregator & Single-Stream Hub)

## Règle de travail (obligatoire)
- Ce fichier est lu au début de chaque prompt.
- Il est mis à jour à la fin de chaque prompt : décisions prises, conventions, nouveaux endpoints, structure de dossiers, TODO.

## Vision
App de tri d’offres : “Visualiser -> Cliquer -> Décider -> Archiver”.
Une seule liste Inbox (flux unique), et des vues secondaires : Traitées (Saved/Trash), Filtrés, Réglages.

## Status Actuel
- **Phase 1-7:** Terminées (Ingestion, Parsing, AI, Normalisation, UI Refactor v2, Interactions temps réel).
- **Phase 8 (Deploy & Infra):** Terminée. Configuration VPS stabilisée (TCP Keepalive, Swap).
- **Maintenance:** Système de logs avancés pour debugging Vercel/VPS.

## Découpage (monorepo unique)
- Next.js App Router
- UI: composants React + Tailwind v4.1
- Data: MongoDB (Direct Connection forcée pour compatibilité VPS)
- API: Next Route Handlers sous `/app/api/**`

## Dossiers
- `/app` : routes & pages (App Router). `page.tsx` redirige vers `/inbox`.
  - `global-error.tsx` : Capture d'erreurs critiques.
- `/app/(tabs)` : Shell Responsive (Sidebar Desktop / Header Mobile).
- `/components` :
  - **Structure**: `Sidebar`, `MobileHeader`, `DesktopHeader`.
  - **Core**: `JobCard` (v2), `FilterBar`, `Toast` (Custom Action + Dismiss).
  - **Modals**: `AiDetectiveModal`, `BlacklistModal`.
- `/lib` : db (mongo avec logs), validation, helpers, constantes
- `/server` : services métier (jobs, settings, ai, parser)
- `/docs` : documentation indexée

## Entités (concept)
- Job: offre ingérée
- Settings: whitelist/blacklist (règles)
- Visit: état “vu” (persistant en DB `visitedAt`)
- AIAnalysis: résultat d’analyse AI Detective (attaché au Job)

## États clés (spéc v12)
- category: TARGET | EXPLORE | FILTERED
- status: INBOX | SAVED | TRASH

## Contrats API (résumé)
- GET /api/jobs?status=&category=
- GET /api/jobs/count (Nouveau: Compteur Inbox temps réel)
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
- **Feedback**:
  - **Compteur Sidebar**: Dynamique (Polling 30s) + Réactif (Event `inbox-count-update`).
  - **Toast**: Centré, Dismissible, avec Undo robuste.
- **Animations**: `animate-enter`, `slide-up-toast`, transitions fluides.
- **Warnings & Tri**: 
  - IA : Icône `Bot` (Ambre) pour l'analyse de l'auteur.
  - Filtre : Icône `ShieldAlert` (Rouge) affichant la raison du filtrage (`matchedKeyword`).

## Infra & Logs
- **MongoDB**: Driver configuré en `directConnection: true` + `family: 4` + Timeouts longs (30s) pour VPS.
- **VPS**: Nécessite `net.ipv4.tcp_keepalive_time = 300` pour compatibilité Serverless Vercel.
- **Logs**:
  - `[MONGO]`: États connexion (Dev/Prod).
  - `[JOBS]`: Perf requêtes.
  - `[Email Ingest]`: Debug HTML (Dev uniquement).
