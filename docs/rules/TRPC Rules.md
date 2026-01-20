# Règles tRPC — Type-safety end-to-end

## Routers & procedures
- Structurer par domaine (router par ressource).
- Définir `input` avec Zod sur chaque procedure.
- Standardiser les erreurs (codes + messages).

## Sécurité
- Mettre les checks d’auth/authorisation côté serveur (guards) avant accès DB.
- Ne jamais retourner des champs sensibles.

## Checklist
- [ ] input Zod partout
- [ ] erreurs standardisées
- [ ] authz check avant DB
