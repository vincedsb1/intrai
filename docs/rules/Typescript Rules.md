# Règles TypeScript — Typage strict & lisibilité

## Principes
- Typage strict partout ; aucun `any`.
- Préférer `unknown` + narrowing (type guards) si incertitude.
- Centraliser types partagés (API, domain, DTO).

## Conventions
- Interfaces et types en `PascalCase` ; si un standard “I/T prefix” est utilisé, l’appliquer de manière cohérente.
- Fichiers :
  - Composants : `PascalCase.tsx`
  - Helpers/services : `kebab-case.ts` ou `camelCase.ts` (choisir et appliquer globalement)
- Imports : privilégier alias `@/` plutôt que `../../`.

## Clean code
- Guard clauses : éviter les `else` et l’imbrication excessive.
- “One dot per line” si chaining long (lisibilité/débogage).
- `as const` pour littéraux immuables.
- Documenter les APIs publiques (JSDoc) si partagé.

## Checklist
- [ ] Aucun `any`
- [ ] Types partagés centralisés
- [ ] Imports via `@/`
- [ ] Fonctions lisibles (guard clauses, faible indentation)
