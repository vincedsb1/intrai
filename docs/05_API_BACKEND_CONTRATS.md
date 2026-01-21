# API Backend — contrats

Base URL: `/api`

## Jobs

### GET `/api/jobs`
Query:
- `status` (optional): INBOX | SAVED | TRASH
- `category` (optional): TARGET | EXPLORE | FILTERED
- `limit` (optional, default 50)
- `cursor` (optional) pagination (createdAt + _id)

Response: `{ items: Job[], nextCursor?: string }`

### PATCH `/api/jobs/:id`
Body (JSON):
- `status`: INBOX | SAVED | TRASH

Effet:
- change le status
- si status != INBOX => l’offre disparaît de l’Inbox

Response: `{ item: Job }`

### POST `/api/jobs/:id/restore`
Effet:
- remet `status=INBOX`
- remet `category=EXPLORE` (comme maquette “Repêcher”)
Response: `{ item: Job }`

## Settings

### GET `/api/settings`
Response: `{ whitelist: string[], blacklist: string[] }`

### PATCH `/api/settings`
Body:
- `whitelist`?: string[]
- `blacklist`?: string[]
Response: `{ whitelist, blacklist }`

## Ingestion

### POST `/api/ingest/webhook`
Headers:
- `x-webhook-secret`: string (doit matcher env)

Body (JSON) minimal:
- `rawString`?: string
- `title`?: string
- `company`?: string
- `location`?: string
- `url`: string
- `parserGrade`?: A|B|C

Traitement:
1) blacklist: si match company OU title => category=FILTERED, status=INBOX
2) whitelist: si match title => category=TARGET, status=INBOX
3) sinon => category=EXPLORE, status=INBOX

Response:
- `{ item: Job, rule: "BLACKLIST"|"WHITELIST"|"DEFAULT", matchedKeyword?: string }`

## AI Detective

### POST `/api/ai/analyze-author`
Body:
- `jobId`: string

Retour:
- `{ result: { isPlatformOrAgency: boolean, type: string, reason: string } }`

Notes:
- Au départ, on peut stubber (comme la maquette) puis brancher un provider.
- Si l’utilisateur clique “Bannir l’auteur”:
  - ajouter `company` dans blacklist
  - passer le job en category=FILTERED (et potentiellement status=INBOX ou TRASH selon choix produit; par défaut: category=FILTERED, status inchangé)
