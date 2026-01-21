# Index de documentation — intrai (Job Aggregator & Single-Stream Hub)

## Objectif de l’app
Construire un “Hub de tri” pour offres d’emploi (**intrai**) : un flux unique (Inbox) à traiter, des états clairs (Saved/Trash), un onglet Filtrés, un onglet Réglages, et une fonctionnalité “AI Detective” pour identifier/bannir les pollueurs. Basé sur les specs fonctionnelles v12 et la maquette UI fournie.

## Ordre de lecture (Specs & Architecture)
1. `/ARCHITECTURE.md` (vivant : lu au début de chaque prompt, mis à jour à la fin)
2. `/docs/01_OBJECTIF_PRODUIT.md`
3. `/docs/02_PLAN_DE_BUILD.md`
4. `/docs/03_STACK_ET_CONTRAINTES.md`
5. `/docs/04_MODELE_DONNEES_MONGODB.md`
6. `/docs/05_API_BACKEND_CONTRATS.md`
7. `/docs/06_UI_MAP_ET_REGLES.md`
8. `/docs/07_COMPOSANTS_UI_SPEC.md`
9. `/docs/08_LOGIQUE_METIER_ET_ETATS.md`
10. `/docs/09_AI_DETECTIVE_SPEC.md`
11. `/docs/10_TESTS_VITEST.md`
12. `/docs/11_DEPLOIEMENT_VERCEL.md`
13. `/docs/12_CONVENTIONS_DEV.md`
14. `/docs/13_DOCUMENTATION_WORKFLOW.md`
15. `/docs/14_BACKLOG.md`
16. `/docs/15_INGESTION_EMAIL_CLOUDMAILIN.md`

## Règles Techniques & Bonnes Pratiques (`/docs/rules/`)
Ces documents définissent les standards de code pour chaque technologie :
- [CSS Modules Rules](/docs/rules/CSS%20Modules%20Rules.md)
- [Next.js Rules](/docs/rules/Next.js%20Rules.md)
- [Prisma Rules](/docs/rules/Prisma%20Rules.md)
- [AI Prompting Rules](/docs/rules/AI%20Prompting%20Rules.md)
- [React Rules](/docs/rules/React%20Rules.md)
- [Zod Rules](/docs/rules/Zod%20Rules.md)
- [Tailwind Rules](/docs/rules/Tailwind%20Rules.md)
- [TRPC Rules](/docs/rules/TRPC%20Rules.md)
- [Typescript Rules](/docs/rules/Typescript%20Rules.md)

## Meta-Documentation (`/docs/meta/`)
Documents relatifs à la maintenance de la documentation et du projet :
- [Guide Implementation Review](/docs/meta/GUIDE_IMPLEMENTATION_REVIEW.md)
- [Rules Documentation](/docs/meta/RULES_DOCUMENTATION.md)
- [Template Architecture](/docs/meta/TEMPLATE_ARCHITECTURE.md)

## Contexte technique
- Front: Next.js (App Router) + TypeScript + Tailwind CSS v4.1 (obligatoire)
- Backend: Route Handlers Next.js (API) + MongoDB
- Tests: Vitest (unitaires + intégration), pas de e2e
- Déploiement: Vercel + variables d’env (secrets)

## Sources de vérité
- [Specs fonctionnelles v12](/docs/01_OBJECTIF_PRODUIT.md) (navigation, statuts, logique de tri, AI Detective).
- [Maquette UI (React/Tailwind)](/docs/MAQUETTE_UI.tsx) : structure des tabs, cartes, modale AI, styles.