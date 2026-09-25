# Plan d’exécution — migration de MongoDB vers PostgreSQL

**Statut** : Accès applicatif migré ; validation SQL sur PostgreSQL locale encore à exécuter
**Dernière mise à jour** : 2026-09-25
**Périmètre** : accès applicatifs, scripts nécessaires, documentation active et validation

---

## 1. Objectif, périmètre et invariants

Remplacer les accès applicatifs MongoDB par PostgreSQL dans `intrai_db.public`. Le snapshot est déjà importé et vérifié sur Oracle : cette tâche ne réimporte rien et ne modifie pas les données existantes.

| Invariant | Décision d’implémentation |
|---|---|
| Accès Oracle et schéma | Aucune connexion Production depuis le Mac et aucune DDL sur Oracle. Utiliser les faits de schéma du snapshot déjà validé ; arrêter l’écriture SQL si une colonne ou contrainte ne peut pas être confirmée à partir de ces faits. |
| Configuration | L’application lit `DATABASE_URL`, échoue avec un message explicite au premier accès DB si elle manque, et ne journalise jamais sa valeur. Rôle et configuration sont fournis séparément sur Oracle. |
| Vercel et secrets | Aucun secret ni aucune variable Vercel ne sont définis, affichés ou modifiés. Pas de déploiement ni de bascule de l’application. |
| IDs importés | Les IDs hexadécimaux existants sont conservés octet pour octet comme chaînes texte. Ils ne sont jamais reconstruits ni convertis en `ObjectId`. |
| Nouveaux IDs | Générer des chaînes avec `crypto.randomUUID()` pour les nouvelles lignes `jobs`, caches IA et nouvelle ligne `settings` si elle doit être créée ; vérifier leur compatibilité avec les types confirmés. |
| Archive | Chaque nouvel `INSERT` fournit `source_ejson` non nul en JSONB. Cette colonne n’est jamais sélectionnée pour lire l’application ni renvoyée par l’API. |
| TLS | Garder la validation des certificats active. Ne pas utiliser `rejectUnauthorized: false`, `sslmode=disable` ou équivalent. |
| Clients | Aucun composant client ne se connecte à PostgreSQL ; les routes et Server Components continuent de passer par les services serveur. |

## 2. Cartographie complète des zones concernées

### 2.1 Accès DB et contrats métier

| Fichier ou groupe | Changement attendu |
|---|---|
| `lib/mongo.ts` | Remplacer par `lib/postgres.ts`, puis retirer après suppression du dernier import Mongo actif. |
| `server/jobs.service.ts` | Convertir toutes les lectures, comptes, mutations, règles et insertions en requêtes PostgreSQL paramétrées. |
| `server/settings.service.ts` | Remplacer lecture/upsert du document par la ligne singleton `settings_key = 1`. |
| `server/ai.service.ts` | Convertir les caches de sociétés et lieux et conserver les appels IA hors transaction DB. |
| `app/api/ai/analyze/route.ts` | Remplacer lecture/écriture directes de `jobs` et toute utilisation d’`ObjectId`. |
| `app/api/ingest/email/route.ts` | Retirer l’import `getDb` inutilisé, mettre à jour le commentaire Mongo et traiter les conflits PostgreSQL sans changer la réponse CloudMailin. |
| `lib/types.ts` | Aligner les types DB internes sur `id` texte et les valeurs JSONB ; retirer les champs internes `_id` des interfaces de cache. Garder des sérialiseurs explicites pour les contrats API existants. |
| `server/rules.engine.ts` | Pas d’accès DB à migrer. Garder le moteur indépendant de la DB ; injecter l’instant de référence pour rendre `olderThan` déterministe pendant une opération. Préserver `description` mappé à `rawString`, la normalisation accents/trim/casse des règles et le seuil inclusif. |
| `server/email-parser.service.ts` | Pas d’accès DB à migrer. Conserver sa forme `ParsedJob` et mapper explicitement ses champs à l’insertion. |

Les consommateurs indirects à vérifier par contrat sont les pages `/inbox`, `/processed`, `/filtered` et `/settings`, ainsi que les routes `GET /api/jobs`, `/api/jobs/count`, `PATCH /api/jobs/:id`, restauration, visite, `GET/PATCH /api/settings`, bannissement d’auteur, ingestion webhook/email et analyse IA. Ils doivent continuer à appeler les mêmes services et recevoir les mêmes formes JSON.

### 2.2 Scripts Mongo repérés

| Scripts | Décision |
|---|---|
| `scripts/analyze_duplicates.js`, `check_last_job.js`, `check_last_job_date.js`, `check_visited.js`, `debug_jobs.js`, `find_gmail_link.js` | Aucun appel depuis package, documentation opérationnelle ou workflow. Scripts diagnostiques ponctuels neutralisés ; leurs points d’entrée restent inertes et n’accèdent plus à MongoDB. |
| `scripts/create_company_index.js`, `create_location_index.js` | Scripts DDL neutralisés. Consulter le manifeste validé pour l’état des index ; aucune création d’index sur Oracle dans cette tâche. |
| `scripts/create_indexes.js` | Script qui supprimait des offres en double avant de créer un index, neutralisé sans exécution et sans équivalent PostgreSQL destructif. |
| `scripts/update_blacklist.js` | Script de maintenance sans référence d’exécution, neutralisé ; aucun réglage n’est modifié pendant la migration. |
| `scripts/flush_db.js` | Script qui effaçait les offres, neutralisé sans exécution. |

La dépendance `mongodb` ne peut être supprimée tant qu’un import exécutable du code ou d’un script conservé la requiert. Les références dans les rapports et spécifications historiques sous `docs/specs/` ne sont pas des accès runtime : les conserver comme archives et les exclure du contrôle des imports exécutables.

### 2.3 Documentation active à réaligner

Mettre à jour les passages devenus faux dans `GEMINI.md`, `README.md`, `ARCHITECTURE.md`, `docs/00_INDEX.md`, `docs/02_PLAN_DE_BUILD.md`, `docs/03_STACK_ET_CONTRAINTES.md`, `docs/04_MODELE_DONNEES_MONGODB.md`, `docs/10_TESTS_VITEST.md`, `docs/11_DEPLOIEMENT_VERCEL.md`, `docs/12_CONVENTIONS_DEV.md`, `docs/15_INGESTION_EMAIL_CLOUDMAILIN.md` et `docs/17_FEATURE_SMART_RULES.md`. Conserver les spécifications historiques, sans remplacement global de leurs références Mongo.

Dans les documents opérationnels, mentionner seulement le nom `DATABASE_URL` et son absence bloquante ; ne pas inclure de valeur, d’exemple contenant un secret, ni d’action sur les réglages Vercel Production. Garder le nom de fichier `docs/04_MODELE_DONNEES_MONGODB.md` pour éviter de casser les liens historiques, mais actualiser son titre et son contenu comme modèle PostgreSQL courant.

## 3. Contrat de données et contrôle de schéma

Le brief fixe les tables et colonnes logiques cibles ; le rapport fourni décrit MongoDB source et ne fournit pas les catalogues PostgreSQL. Le mapping SQL de cette implémentation utilise des noms `snake_case` explicites. `lib/postgres.ts` contrôle en lecture seule les colonnes, types centraux, nullabilité de `source_ejson` et index uniques avant la première requête métier. Un écart bloque l’accès avec une erreur de contrat ; il ne déclenche aucune DDL ni correction automatique. Ce contrôle d’exécution ne constitue pas une validation de schéma sur le poste de développement.

| Table cible | Mapping fonctionnel attendu |
|---|---|
| `jobs` | `id` texte ; dates de création, mise à jour et visite ; champs de `Job`/`ParsedJob` (`title`, `company`, `location`, `country`, `url`, `logoUrl`, `rawString`, `parserGrade`, `category`, `status`, `matchedKeyword`, `workMode`, `salary`, `isActiveRecruiting`, `isEasyApply`, `isHighMatch`) ; `ai_analysis` JSONB ; `tags` JSONB mappé au type applicatif `string[]` ; `source_ejson` JSONB non nul. |
| `settings` | `settings_key = 1` ; `mongo_id` texte conservé pour les données importées et mappé au champ `_id` si le JSON actuel l’expose ; `whitelist`, `blacklist`, `rules` JSONB, `deduplicate_cross_region`, `ai_analysis_enabled`, `updated_at` et `source_ejson`. |
| `company_analyses` | `id` texte ; `company_name` unique ; `is_platform_or_agency`, `type`, `reason`, date et `source_ejson`. |
| `location_analyses` | `id` texte ; `raw_location` unique ; `country`, date et `source_ejson`. |

La colonne logique `description` des Smart Rules correspond à `rawString` via `server/rules.engine.ts` ; ne pas inventer une colonne `description`. Pour les colonnes camelCase historiques, établir un alias SQL explicite vers les propriétés TypeScript. Éviter `SELECT *` et exclure explicitement `source_ejson` de toute liste `RETURNING`, afin que l’archive ne puisse pas entrer dans les objets applicatifs.

### Faits confirmés sur la source MongoDB

Le rapport de collecte fourni le 25 septembre 2026 décrit uniquement MongoDB sur le VPS ; il ne confirme pas les types ni les contraintes physiques de PostgreSQL. Il relève `jobs` (6 355 documents), `settings` (1), `company_analyses` (1 528) et `location_analyses` (537). Les `_id` source sont tous des ObjectId. Les index source sont uniques sur `jobs.url`, `company_analyses.companyName` et `location_analyses.rawLocation`.

Le rapport confirme les noms historiques camelCase et les BSON Date des dates. `jobs.country` manque dans 436 documents, `updatedAt` dans 2 959, `visitedAt` est présent dans 750 ; `tags` et `isVisited` sont absents de tous les documents observés. `aiAnalysis` est présent dans 4 749 documents et contient les trois champs d’analyse ainsi que `createdAt`. Les listes de réglages sont des tableaux de chaînes ; `rules` est un tableau d’objets contenant un tableau `conditions`. Ces observations guident la conversion, sans autoriser de lecture applicative de `source_ejson`.

Comme le poste de développement ne doit pas se connecter à la cible Oracle, `lib/postgres.ts` effectue un contrôle de catalogue PostgreSQL en lecture seule sur la première connexion : colonnes et types attendus, `source_ejson JSONB NOT NULL` et clés uniques nécessaires aux conflits d’upsert. Le contrôle échoue avec les colonnes ou clés incompatibles. Il ne remplace pas une vérification d’intégration contre une PostgreSQL locale jetable ; aucun test ni build ne doit utiliser `DATABASE_URL` pour joindre la Production.

Les éléments suivants ne sont pas établis par le rapport MongoDB ; le contrôle de schéma PostgreSQL les vérifie au premier accès avec les noms et types attendus par le code :

1. Les types et contraintes de chaque `id`, `mongo_id` et la compatibilité d’un UUID texte pour les nouvelles lignes.
2. La nullabilité et le défaut de `settings.mongo_id` lors de l’initialisation du singleton.
3. L’existence ou l’absence d’une unicité sur `jobs.url`, en plus des contraintes uniques société et lieu fournies.
4. Les types des dates et leur précision/fuseau, le type de `whitelist`/`blacklist`, et les formes JSONB de `rules`, `tags` et `ai_analysis`.
5. La nullabilité de chaque `source_ejson`.

Si le préflight découvre un écart, ne pas contourner le contrôle : relever l’extrait de catalogue manquant depuis une cible de test locale ou une source de schéma déjà autorisée, adapter le mapping, puis revalider. Ne pas se connecter à Production depuis le Mac et ne pas exécuter de DDL pour lever l’incertitude.

### Format d’archive `source_ejson`

Employer un sérialiseur pur TypeScript, indépendant du paquet `mongodb`, avec une représentation Extended JSON canonique stable : document logique aux noms de champs historiques, dates sous la forme `{"$date":{"$numberLong":"<epoch_ms>"}}`, tableaux et valeurs JSON conservés, et identifiants textuels écrits comme chaînes simples (jamais sous `$oid`). Inclure l’enregistrement inséré, pas la colonne `source_ejson` elle-même. Écrire ce JSON en paramètre lié avec cast `::jsonb` pour chacun des insertions `jobs`, `settings`, `company_analyses` et `location_analyses`. Ajouter un test par table qui vérifie objet, dates, identifiant et non-nullité. Les `UPDATE` des lignes importées ne réécrivent pas cette archive ; pour une nouvelle ligne singleton `settings`, créer une représentation initiale, puis laisser les mises à jour applicatives toucher uniquement les colonnes actives.

## 4. Séquence d’implémentation

### Étape 1 — Préflight et contrats

1. Relever `git status` et préserver tous les changements présents avant la migration.
2. Consigner le mapping `snake_case` du contrat cible et le contrôle de catalogue ; ne pas présenter les types physiques PostgreSQL comme confirmés par le rapport Mongo source.
3. Faire une recherche exhaustive dans les fichiers exécutables et les documentations : imports `mongodb`, `MONGODB_URI`, `MongoClient`, `ObjectId`, `withMongo`, `getDb`, références aux collections, et accès SQL futurs. Séparer les archives historiques de l’exécutable.
4. Établir une table de traçabilité entre fonctions existantes, nouvelles requêtes et tests d’acceptation de la section 6.

### Étape 2 — Pool PostgreSQL et frontière serveur

1. Ajouter `pg` et `@types/pg`, mettre à jour `package.json` et `package-lock.json` ensemble.
2. Créer `lib/postgres.ts`, marqué serveur (`server-only`), et confirmer que ses consommateurs sont dans le runtime Node.js, pas Edge.
3. Utiliser un `Pool` singleton par instance chaude, réutilisé dans `globalThis` en développement. Fixer `max: 1` par instance, `idleTimeoutMillis: 20_000` et `connectionTimeoutMillis: 10_000` comme réglages initiaux conservateurs ; ne jamais créer/fermer un pool à chaque requête. Toute augmentation dépend du budget de connexions confirmé par le propriétaire PostgreSQL, sans modifier la configuration Vercel.
4. Créer le pool paresseusement. À l’absence de `DATABASE_URL`, lever une erreur nommant la variable mais jamais sa valeur ; ne pas exiger de connexion lors de l’import ou du build.
5. Activer TLS selon l’endpoint validé et conserver le contrôle des certificats. N’ajouter aucun mode permissif.
6. Fournir des helpers typés pour `PoolClient`, transactions et `finally { release() }`. Les fonctions transactionnelles reçoivent le client courant ; elles ne rappellent pas un service qui emprunte une autre connexion.
7. Définir une politique d’erreur : traiter `23505` comme conflit d’unicité, ne retenter qu’une transaction explicitement annulée pour `40001`/`40P01`, au plus une fois si elle est rejouable, et ne jamais rejouer aveuglément une écriture après une perte de connexion au commit. Garder des logs utiles sans URL, secret, contenu d’offre ni donnée personnelle.

### Étape 3 — Services, mappings et frontières atomiques

#### Lecture et transitions des offres

Dans `server/jobs.service.ts`, paramétrer toutes les valeurs SQL et aliaser explicitement les colonnes vers `Job`. Reproduire exactement :

- `INBOX` sans catégorie explicite exclut `FILTERED`; employer une comparaison SQL qui inclut les catégories nulles/manquantes comme `$ne` Mongo actuel.
- Une catégorie explicitement demandée filtre exactement sur celle-ci ; `workMode`, `country` et `isEasyApply` n’ajoutent leur clause que selon les valeurs actuellement reconnues (`all` ignoré, `isEasyApply === true`).
- `q` est trimé, limité à 200 caractères, recherche littérale insensible à la casse sur `title` et `company` seulement. Échapper `%`, `_` et le caractère d’échappement SQL avant `ILIKE`.
- `getAvailableCountries` reprend les critères status/mode/easy/q sans filtre country, ignore les pays absents/non-texte/vides, déduplique puis trie.
- Pagination, limite, `createdAt DESC`, total, sérialisation ISO de `createdAt`, `updatedAt`, `visitedAt` et `aiAnalysis.createdAt` restent identiques.
- Les transitions status, restore, visit et leurs dates gardent les mêmes mises à jour. Respecter les réponses actuelles même quand un ID texte valide ne correspond à aucune ligne.
- `getJobCounts` retourne les mêmes clés et critères. Conserver la sémantique actuelle de `setHours(0, 0, 0, 0)` en calculant la borne journalière dans Node.js puis en la passant en paramètre ; ne pas laisser le fuseau de session PostgreSQL décider du jour. Tester les instants de part et d’autre de cette borne dans le fuseau du processus d’exécution.

#### Réglages et règles

Dans `server/settings.service.ts`, initialiser le singleton avec `INSERT ... ON CONFLICT (settings_key) DO NOTHING`, puis lire/verrouiller la ligne avec `SELECT ... FOR UPDATE` sur le même client. L’interface envoie les champs réellement modifiés ; les suppressions de règles déclarent les IDs concernés. Les ajouts fusionnent les règles concurrentes absentes de l’état client, et l’écriture reste paramétrée sous verrou de ligne. Ne pas imbriquer une lecture sur un second client pendant la transaction.

Pour un `PATCH /api/settings` qui ajoute une règle `createdAt/olderThan`, la mise à jour des jobs et l’enregistrement de cette règle sont une transaction unique : tout commit ensemble ou rien n’est appliqué. `filteredCount` compte les lignes réellement modifiées. Les autres branches du PATCH conservent exactement les réponses `{ settings, filteredCount }` et `filteredCount: 0` déjà renvoyées.

#### Bannissement et ingestion

| Opération | Transaction et règle de concurrence |
|---|---|
| Bannir une société | Transaction unique pour mettre à jour la blacklist et les jobs `FILTERED`. Préserver la comparaison actuelle des sociétés, qui est exacte/casse sensible dans le filtre DB. |
| Ingestion par URL | Une transaction courte lit les réglages, vérifie les doublons, classe et insère. Si URL existante : ne modifier que `updated_at`, garder statut et autres champs, puis retourner l’offre. Si une contrainte unique URL existe, utiliser `ON CONFLICT (url) DO UPDATE SET updated_at = EXCLUDED.updated_at` et retourner une projection sans `source_ejson` ; sinon prendre avant le contrôle un verrou transactionnel advisory calculé sur `ingest:url:` + URL. Tester deux ingestions concurrentes de la même URL. |
| Dédoublonnage titre/société | Quand activé, conserver la fenêtre de 30 jours et l’égalité insensible à la casse ; prendre un verrou advisory transactionnel sur `ingest:title-company:` + titre/société normalisés avant le contrôle, afin de sérialiser deux URLs simultanées. Pas de suppression d’offre. |
| Cache société/lieu | Lire le cache par les clés exactes après trim/déduplication actuels. Appeler OpenAI hors transaction. Insérer avec l’ID texte et `source_ejson`; utiliser la contrainte unique, puis relire le gagnant si un autre appel a rempli le cache entre-temps. |
| Analyse d’une offre | Lire le job, relâcher la connexion pendant l’appel IA, puis mettre à jour `ai_analysis` dans une requête courte. Ne jamais conserver une transaction ouverte pendant un appel réseau. |

Conserver l’ordre de classement à l’ingestion : doublon inter-région, blacklist, règles si pas déjà filtré, whitelist si toujours admissible, puis `EXPLORE` par défaut. Garder les comportements de fallback IA et le retour de l’offre existante en cas de doublon URL.

#### Règles `olderThan` et volume

`countJobsMatchingOlderThan` ne charge pas toutes les offres : capturer un seul `now` au début de l’opération et le fournir à l’évaluateur TypeScript comme à SQL. Pour une règle temporelle seule, reproduire exactement `Math.ceil((now - createdAt) / 86_400_000) >= days` avec `CEIL(EXTRACT(EPOCH FROM ($now - created_at)) / 86400.0) >= $days`, en excluant les dates nulles/invalides comme l’évaluateur actuel. Pour une règle composée, filtrer d’abord par inbox, catégorie distincte de `FILTERED` (y compris null), puis par le même seuil temporel ; sélectionner seulement `id` et les champs utilisés par `evaluateRule` (`title`, `company`, `location`, `workMode`, `rawString`, `createdAt`). Parcourir par lots stables, réutiliser l’évaluateur TypeScript avec ce même `now` et mettre à jour les IDs par lots dans la même transaction que l’enregistrement de la règle. Garder une mémoire bornée et le nombre réellement mis à jour.

### Étape 4 — Routes, types et sérialisation

1. Remplacer l’accès direct à `jobs` dans `app/api/ai/analyze/route.ts`; chercher par `id` texte sans validation/conversion `ObjectId`. Le call OpenAI reste hors transaction.
2. Garder l’API de `/api/jobs`, compteurs, status, restore, visit, Settings, bannissement, webhook/email et analyse IA inchangée : corps, codes HTTP, réponses d’erreur et champs JSON exactement identiques.
3. Préserver `_id` de Settings sous sa forme JSON actuelle si `mongo_id` est actuellement sérialisé ; ne supprimer que `source_ejson` de la sortie.
4. Mapper les dates JSONB imbriquées explicitement : `ai_analysis.createdAt` reste une date ISO en sortie ; `tags` reste un `string[]` côté TypeScript.
5. Dans l’ingestion email, remplacer le traitement de `E11000` par le conflit PostgreSQL prévu au service ; conserver la réponse HTTP 200 et le décompte `success/count/ids`.
6. Retirer les types Mongo résiduels (`CompanyAnalysis._id`, `LocationAnalysis._id`) et faire une recherche finale d’`ObjectId` dans tout le code exécutable.

### Étape 5 — Scripts, dépendances et documentation

1. Vérifier les références des scripts dans les commandes npm, guides et workflows. Les scripts Mongo non référencés sont neutralisés ; aucun script de maintenance ni de suppression n’est lancé.
2. Garder les points d’entrée historiques inertes, sans import Mongo ni commande DDL/de suppression.
3. Faire une recherche sur tout le code exécutable et les scripts conservés ; uniquement lorsque les accès nécessaires sont tous migrés, retirer `lib/mongo.ts`, `mongodb` de `package.json` et le lockfile.
4. Mettre à jour les documents actifs listés en §2.3 et l’index de documentation ; marquer le plan de build antérieur comme historique si ses étapes Mongo/Vercel restent utiles comme trace.
5. Laisser intacts les anciens rapports et specs sous `docs/specs/`, sauf correction de lien nécessaire. Ils ne bloquent pas le retrait du paquet si aucune référence runtime n’y subsiste.

## 5. Tests d’acceptation

Le mock du pool sert aux tests unitaires, pas à valider le SQL. Quand une PostgreSQL locale jetable est disponible, exécuter la suite d’intégration contre le schéma cible, après validation du manifeste. Le harnais exige une cible explicitement locale (`localhost`, une adresse loopback IPv4/IPv6 ou un socket Unix), refuse tout autre hôte, ignore les variables de connexion héritées et utilise `INTRAI_TEST_DATABASE_URL`. Aucun test n’appelle OpenAI : simuler le client, sans clé ni réseau. En l’absence de moteur PostgreSQL local, signaler que la syntaxe SQL et le schéma cible restent non vérifiés ; ne jamais remplacer cette vérification par la Production.

| Domaine | Assertions exigées |
|---|---|
| Schéma/mapping | Toutes les requêtes s’exécutent sur le schéma de test ; types dates, arrays, JSONB et rowCount sont testés contre le vrai driver. |
| Connexion | Absence de `DATABASE_URL` échoue au premier accès avec message explicite, sans pool ni connexion ; la valeur n’apparaît jamais dans les logs. |
| IDs | Un ID importé hexadécimal ressort identique ; les nouveaux IDs sont du texte ; aucun constructeur/conversion `ObjectId`. |
| Archive | Chaque insertion jobs/settings/company/location écrit le JSON canonique non nul ; sérialisation date/id testée ; aucune requête de lecture ni réponse API ne retourne `source_ejson`. |
| Recherche et listing | Cas par défaut inbox, catégorie explicite, mode, pays, easyApply vrai/faux, recherche titre/société et casse. Vérifier le comportement des accents contre le comportement actuel (aucune normalisation d’accent nouvelle pour la recherche `q`), trim, limite 200, caractères `%_\\`, pagination, tri, total et pays disponibles. |
| Dates et compteurs | Dates nulles/invalides, seuil `olderThan` exact/inclusif avec un `now` fixé, règle combinée avec `rawString`, doublon de 30 jours exact, compteurs de part et d’autre de la borne locale calculée par le processus. |
| Mutations | status, restore, visit, ban-author ; rollback vérifié si une écriture de la transaction échoue ; réponses inchangées pour ID absent/invalide selon le contrat actuel. |
| Settings concurrents | Deux ajouts simultanés gardent les deux règles ; un remplacement complet et un append sont sérialisés ; l’initialisation concurrente ne crée qu’une ligne `settings_key = 1`. |
| Ingestion concurrente | Même URL simultanée ne crée pas deux lignes et ne change pas le statut existant ; mêmes titre/société sous deux URLs sont dédoublonnés si l’option est activée. |
| Caches IA | Cache hit sans appel IA, cache miss persisté, conflit unique relu, échec provider/fallback inchangé, aucune transaction ouverte pendant l’appel réseau. |
| API | Formes et codes précis pour les routes jobs, count, settings, restore, visit, ban, webhook, email et analyse ; CloudMailin reste en 200 pour ses erreurs traitées. |
| Résilience | Erreurs `23505`, `40001`, `40P01`, timeout et connexion perdue sont traitées conformément à la politique §4, sans rejouer une écriture au commit incertain. |
| Volume | Règle temporelle simple comptée par SQL ; règles composées parcourues avec sélection minimale et lots bornés sur des fixtures volumineuses, sans chargement complet de `jobs`. |

## 6. Porte finale et livraison

Exécuter après les changements, sans connexion Production :

| Vérification | Commande |
|---|---|
| Lint | `npm run lint` |
| Tests Vitest non interactifs | `npm test -- --run` |
| TypeScript | `npx tsc --noEmit` |
| Build | `npm run build` |
| Dépendance résiduelle | Vérifier `npm ls mongodb` et rechercher les imports dans le code/scripts exécutables. |
| Diff | `git diff --check` |

Le gate applicatif est vert si lint, tests disponibles, TypeScript et build réussissent, si aucune lecture ne consomme `source_ejson`, et si aucun accès Mongo exécutable ne reste. Le statut de validation SQL précise séparément si une PostgreSQL locale jetable a été utilisée. Le build doit réussir sans joindre PostgreSQL.

La livraison finale résume fichiers modifiés, résultats de chaque validation, blocages éventuels et fournit une branche ou un commit prêt à intégrer. Elle s’arrête avant toute variable Vercel, tout déploiement, toute bascule ou opération Production.

## 7. État local au 25 septembre 2026

- Les services, routes, mappings et insertions `source_ejson` ciblés sont passés à PostgreSQL ; `lib/mongo.ts` et la dépendance `mongodb` ont été retirés après le scan du code et des scripts exécutables.
- `npm test -- --run` : 75 tests réussis. `npx tsc --noEmit` et `npm run build` : réussis. ESLint ciblé sur les fichiers de migration : réussi.
- `npm run lint` global : échec sur 25 erreurs et 11 avertissements dans des composants et scripts d’analyse HTML hors périmètre de cette migration.
- Aucun client/serveur PostgreSQL local n’est disponible dans l’environnement de travail ; les requêtes n’ont donc pas été exécutées contre un moteur réel. Le préflight de catalogue et une intégration sur une PostgreSQL locale jetable restent à valider avant tout lancement applicatif.
- Aucune connexion Production, modification de schéma/donnée, configuration Vercel ou déploiement n’a été effectué.
