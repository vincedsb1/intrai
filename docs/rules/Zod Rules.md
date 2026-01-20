# Règles Zod — Validation runtime

## Principes
- Valider **toutes** les entrées (API, forms, params) avec Zod avant traitement.
- Utiliser `z.infer<typeof Schema>` pour typer les données validées.

## Organisation
- Centraliser les schémas (`schemas/` ou `lib/types/`) pour éviter les duplications.
- Prévoir un mapping d’erreurs (messages clairs) sans exposer d’infos sensibles.

## Checklist
- [ ] Schéma Zod pour chaque payload entrant
- [ ] `z.infer` utilisé pour TS
- [ ] Erreurs de validation propres (400, messages clairs)
