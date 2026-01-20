# Plan de build (phases)

## Phase 0 — Repo & local
1. Créer repo GitHub (main)
2. Cloner en local
3. Conventions: commits clairs, PR optionnelles

## Phase 1 — Bootstrap Next.js
1. Création projet Next.js (TS)
2. Structure App Router + layout tabs
3. Mise en place Tailwind v4.1 (obligatoire)
4. Lint/format (optionnel mais conseillé)

## Phase 2 — UI (maquette)
1. Tabs navigation: Inbox, Traitées, Filtrés, Réglages
2. JobCard + badges + état visité (grisé)
3. Modale AI Detective + états loading/result
4. FAB “Nettoyer les visités”
5. Réglages whitelist/blacklist (chips + inputs)

## Phase 3 — MongoDB
1. Connexion Mongo (driver officiel)
2. Collections: jobs, settings
3. Indexes (url unique, createdAt)

## Phase 4 — Backend (Route Handlers)
1. Ingestion webhook + tri (blacklist/whitelist)
2. CRUD jobs (list, patch status, restore)
3. Settings (get/update)
4. AI Detective endpoint (stub puis intégration)

## Phase 5 — Intégration UI <-> API
1. Remplacer mock data par fetch API
2. Optimiser UX (loading skeleton minimal)
3. Gérer erreurs (toast ou inline)

## Phase 6 — Tests Vitest
1. Unit: tri ingestion, matching règles
2. Integration: endpoints API (supertest-like via fetch, ou Next test utils)
3. Pas de e2e

## Phase 7 — Vercel
1. Variables d’env (Mongo URL, webhook secret, AI key)
2. Déploiement preview + prod
3. Vérifs: ingestion OK, UI OK
