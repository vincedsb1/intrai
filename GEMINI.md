# GEMINI.md - Context & Instructions

## Règles Opérationnelles (Strictes)
*   **Langue :** Toujours répondre en **Français**.
*   **Git :** Ne JAMAIS effectuer de `commit` ou `push` sans demande explicite de l'utilisateur.
*   **Logs :** Ne JAMAIS supprimer de fichiers de logs sans demande explicite.

## Project Overview
**Name:** intrai (Job Aggregator & Single-Stream Hub)
**Purpose:** A streamlined web application for managing job offers. It features a "Single Stream" inbox, quick decision-making workflows (Save/Trash), automated filtering (Whitelist/Blacklist), and AI-powered author analysis ("AI Detective").
**Current Status:** Application active, avec accès applicatif PostgreSQL.

## Technology Stack
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript (Strict mode)
*   **Styling:** Tailwind CSS v4.1, Lucide React (Icons)
*   **Database:** PostgreSQL (`intrai_db.public`) via `pg`
*   **Testing:** Vitest (Unit & Integration)
*   **Deployment:** Vercel

## Architecture
The project follows a modular structure (monorepo style):
*   `/app`: Next.js App Router pages and API routes (`/app/api/**`).
*   `/components`: Reusable UI components (JobCard, TabsNav, etc.).
*   `/lib`: PostgreSQL pool, validation, helpers.
*   `/server`: Business logic (ingestion sorting, rules, AI detective).
*   `/docs`: Project documentation.
    *   `/docs/*.md`: Core project specifications (numbered).
    *   `/docs/rules/*.md`: Tech-specific coding rules (React, Next.js, etc.).
    *   `/docs/meta/*.md`: Documentation templates and guides.
*   `/tests`: Vitest test suites.

## Core Concepts & Data Model
*   **Job Entities:**
    *   **Status:** `INBOX` | `SAVED` | `TRASH`
    *   **Category:** `TARGET` (Whitelist) | `EXPLORE` (Default) | `FILTERED` (Blacklist)
    *   **Visited:** UI-state (grayed out), potentially persistent.
*   **AI Detective:** Analyzes job authors to identify spam/irrelevant sources.

## Getting Started (Implementation Plan)
Since the project is currently just documentation, the immediate next steps for an agent would be:
1.  **Database access:** Use the lazy server-only pool in `/lib/postgres.ts`; it requires `DATABASE_URL` and verifies TLS.
2.  **Business logic:** Keep database operations in `server/jobs.service.ts`, `server/settings.service.ts`, and `server/ai.service.ts`.

## Documentation Reference
*   `ARCHITECTURE.md`: High-level architectural decisions and current state.
*   `docs/00_INDEX.md`: Main index and reading order.
*   `docs/MAQUETTE_UI.tsx`: Interactive UI Prototype (React + Tailwind).
*   `docs/01_OBJECTIF_PRODUIT.md`: Product vision and UX principles.
*   `docs/12_CONVENTIONS_DEV.md`: Coding standards and naming conventions.
