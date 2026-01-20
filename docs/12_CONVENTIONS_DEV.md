# Conventions dev

## TypeScript
- Strict true
- Types partagés: `Job`, `Settings`, `AIAnalysis`

## Naming
- Components: PascalCase
- Server functions: camelCase
- Constants: UPPER_SNAKE

## UI
- Pas de “design inventé” : suivre la maquette
- Composants petits, lisibles, réutilisables

## Data access
- `lib/mongo.ts`: singleton connection (éviter reconnect)
- `server/jobs.service.ts`: logique métier DB
- `server/settings.service.ts`: règles

## Erreurs
- API: réponses JSON standard `{ error: { code, message } }`
- UI: affichage minimal (inline)
