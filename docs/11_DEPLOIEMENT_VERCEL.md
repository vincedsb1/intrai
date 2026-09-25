# Runtime et hébergement

L’application utilise des Route Handlers Next.js exécutés sous Node.js. Le pool `pg` est réutilisé par instance chaude avec une limite initiale d’une connexion. Le build ne se connecte pas à PostgreSQL.

## Connexion PostgreSQL

- L’application exige `DATABASE_URL` pour le premier accès DB et cible `intrai_db.public`.
- La valeur est fournie séparément par l’environnement d’exécution ; aucun URI, identifiant, secret ou exemple de configuration n’est stocké dans cette documentation.
- Une valeur manquante ou une connexion TLS invalide produit une erreur serveur claire. La valeur de connexion n’est jamais écrite dans les logs.
- La validation des certificats TLS reste active.

## Vérifications applicatives

1. Le build termine sans connexion DB.
2. Les endpoints de jobs, settings et ingestion gardent leurs contrats JSON.
3. Une base locale de test exécute les requêtes d’intégration avec le schéma validé.
4. Les erreurs de configuration restent explicites dans les logs serveur, sans donnée d’offre ni valeur de connexion.

Cette page décrit les attentes du runtime ; elle ne demande aucune modification d’environnement, variable, service Production ou déploiement.
