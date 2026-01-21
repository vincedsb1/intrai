# Règles Prisma — Accès DB robuste

## Client Prisma
- Schema uniquement dans `prisma/schema.prisma`.
- `PrismaClient` en singleton (surtout en dev) pour éviter l’épuisement de connexions.

## Modélisation
- Modèles en `PascalCase`, champs en `camelCase`.
- Relations explicites et index sur champs fréquemment filtrés/recherchés.

## Performance
- Éviter N+1 : `select/include` adapté pour récupérer relations nécessaires.
- Ne pas exposer directement des objets Prisma complets au client si données sensibles.

## Checklist
- [ ] singleton PrismaClient
- [ ] `select/include` (pas N+1)
- [ ] index sur champs hot
- [ ] pas de données sensibles exposées
