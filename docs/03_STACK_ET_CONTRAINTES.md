# Stack & contraintes

## Front
- Next.js (App Router)
- TypeScript
- Tailwind CSS v4.1 (obligatoire)
- lucide-react (icônes, aligné avec la maquette)

## Backend
- Next.js Route Handlers (`/app/api/**`)
- PostgreSQL (`intrai_db.public`) via le paquet `pg` et un pool réutilisé par instance Node.js
- Connexion uniquement via `DATABASE_URL`, absente = erreur serveur explicite
- TLS avec validation des certificats obligatoire

## Tests
- Vitest
- Unit + intégration (pas de e2e)

## Déploiement
- Vercel
- Vercel reste l’hébergeur documenté ; cette page ne définit, n’affiche ni ne modifie aucune configuration d’environnement

## Contraintes UI
- Respect strict de la maquette fournie (structure tabs, composants, style). :contentReference[oaicite:8]{index=8}

## Contraintes fonctionnelles
- Respect strict des specs v12 (statuts, catégories, AI Detective, logique tri ingestion). :contentReference[oaicite:9]{index=9}

## Données
- Les identifiants importés restent des chaînes hexadécimales ; les nouveaux identifiants sont du texte UUID.
- `source_ejson` archive le document migré, n’est jamais une source de lecture applicative et ne sort jamais par l’API.
- Les tests d’intégration DB utilisent uniquement une PostgreSQL locale jetable, jamais Production.
