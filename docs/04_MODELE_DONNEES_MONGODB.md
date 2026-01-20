# Modèle de données MongoDB

## Collection: `jobs`
### Document `Job`
- `_id`: ObjectId
- `createdAt`: Date (default now)
- `rawString`: string (texte brut, optionnel)
- `title`: string | null
- `company`: string | null
- `location`: string | null
- `url`: string (unique si possible)
- `parserGrade`: "A" | "B" | "C" (default "C")
- `category`: "TARGET" | "EXPLORE" | "FILTERED"
- `matchedKeyword`: string | null (mot whitelist/blacklist déclencheur)
- `status`: "INBOX" | "SAVED" | "TRASH" (default "INBOX")
- `aiAnalysis`: object | null
  - `isPlatformOrAgency`: boolean
  - `type`: string
  - `reason`: string
  - `createdAt`: Date

### Indexes recommandés
- `{ url: 1 }` unique (si URLs fiables)
- `{ createdAt: -1 }` pour tri flux
- `{ status: 1, category: 1, createdAt: -1 }` pour requêtes vues

## Collection: `settings`
### Document unique `Settings`
- `_id`
- `whitelist`: string[] (mots-clés cibles)
- `blacklist`: string[] (termes à exclure: mots + entreprises)
- `updatedAt`: Date

## À propos de “visited”
Option A (comme maquette): état UI local (Set en mémoire, non persistant).
Option B: persistant côté DB (champ `visitedAt: Date | null`), utile multi-device.
Par défaut: Option A, et on garde la porte ouverte pour Option B.
