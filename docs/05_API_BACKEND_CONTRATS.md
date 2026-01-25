# API Backend — contrats

Base URL: `/api`

## Jobs

### GET `/api/jobs`
Query:
- `status` (optional): INBOX | SAVED | TRASH
- `category` (optional): TARGET | EXPLORE | FILTERED
- `limit` (optional, default 50)

Response: `{ items: Job[] }`

### GET `/api/jobs/count`
Compteur d'offres Inbox pour la sidebar.
Response: `{ count: number }`

### PATCH `/api/jobs/:id`
Body (JSON):
- `status`: INBOX | SAVED | TRASH

### POST `/api/jobs/:id/restore`
Restaure un job (status=INBOX, category=EXPLORE).

### POST `/api/jobs/:id/visit`
Persistance de l'état "Vu".
Body: `{ visited: boolean }`

## Settings

### GET/PATCH `/api/settings`
Gestion de la whitelist/blacklist.

## Ingestion

### POST `/api/ingest/email` (CloudMailin)
Endpoint principal pour l'ingestion d'emails bruts (Multipart).
- Accepte `multipart/form-data` (CloudMailin Normalized).
- Header/Query `secret`.
- Découpe le HTML en N jobs.
- Analyse IA (Batch) des entreprises et lieux.
- Déduplication via Index Unique URL.
- Retourne toujours 200 OK.

### POST `/api/ingest/webhook` (JSON)
Endpoint secondaire pour ingestion structurée directe.

## AI & Actions

### POST `/api/ai/ban-author`
Action rapide de bannissement.
Body: `{ company: string }`
Effets :
1. Ajoute `company` à la Blacklist.
2. Déplace tous les jobs existants de cette entreprise vers `category=FILTERED`.