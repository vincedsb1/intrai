# Modèle de données MongoDB

## Collection: `jobs`
### Document `Job`
- `_id`: ObjectId
- `createdAt`: Date (default now)
- `title`: string | null
- `company`: string | null
- `location`: string | null (nettoyé)
- `country`: string | null (normalisé par IA)
- `url`: string (unique, indexé)
- `logoUrl`: string | null (URL LinkedIn nettoyée)
- `rawString`: string (pour debug)
- `parserGrade`: "A" | "B" | "C"
- `category`: "TARGET" | "EXPLORE" | "FILTERED"
- `status`: "INBOX" | "SAVED" | "TRASH"
- `matchedKeyword`: string | null
- `workMode`: "remote" | "hybrid" | "on-site" | null
- `salary`: string | null
- `isActiveRecruiting`: boolean (flag)
- `isEasyApply`: boolean (flag)
- `isHighMatch`: boolean (flag)
- `visitedAt`: Date | null (persistence état "Vu")
- `aiAnalysis`: object | null
  - `isPlatformOrAgency`: boolean
  - `type`: string
  - `reason`: string
  - `createdAt`: Date

### Indexes recommandés
- `{ url: 1 }` unique (critique pour déduplication)
- `{ createdAt: -1 }` pour tri flux
- `{ status: 1, category: 1, createdAt: -1 }` pour requêtes vues

## Collection: `settings`
### Document unique `Settings`
- `_id`
- `whitelist`: string[]
- `blacklist`: string[]
- `updatedAt`: Date

## Collection: `company_analyses` (Cache IA)
Stocke les résultats d'analyse des entreprises pour économiser les appels IA.
- `_id`: ObjectId
- `companyName`: string (Index unique)
- `isPlatformOrAgency`: boolean
- `type`: string
- `reason`: string
- `createdAt`: Date

## Collection: `location_analyses` (Cache IA)
Stocke la normalisation géographique.
- `_id`: ObjectId
- `rawLocation`: string (Index unique)
- `country`: string
- `createdAt`: Date