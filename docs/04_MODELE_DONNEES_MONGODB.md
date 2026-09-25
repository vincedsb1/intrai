# Modèle courant des données PostgreSQL

La cible applicative est `intrai_db.public`. Les identifiants Mongo importés sont stockés comme texte hexadécimal sans conversion ; les lignes créées par l’application utilisent des identifiants texte UUID. Les noms et types physiques complets sont régis par le manifeste du schéma validé.

`source_ejson` est une archive JSONB du document d’origine. Les lectures applicatives sélectionnent les colonnes utiles explicitement et ne renvoient jamais cette archive. Tout nouvel `INSERT` fournit un `source_ejson` JSONB non nul.

## Tables

### `jobs`

- `id`: `text`
- Dates de création, mise à jour et visite
- Champs d’offre correspondant à `Job` et `ParsedJob`
- `ai_analysis`: `JSONB`
- `tags`: `JSONB` (mappé vers `string[]`)
- `source_ejson`: `JSONB NOT NULL`

### `settings`

- Singleton identifié par `settings_key = 1`
- `mongo_id`: identifiant importé conservé comme texte
- `whitelist`, `blacklist`, `rules`: valeurs JSONB
- Options, dates et `source_ejson`

### `company_analyses`

- `id`: `text`
- `company_name`: unique
- Analyse, date et `source_ejson`

### `location_analyses`

- `id`: `text`
- `raw_location`: unique
- Pays, date et `source_ejson`

Les sections ci-dessous décrivent le modèle documentaire historique et sont conservées comme référence de mapping ; elles ne décrivent pas le stockage courant.

---

## Modèle MongoDB historique

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
