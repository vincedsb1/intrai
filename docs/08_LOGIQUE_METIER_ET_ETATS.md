# Logique métier & états

## Parsing (Ingestion Email)
- **1 Email = N Jobs** : Le parser analyse le HTML (Cheerio) pour extraire chaque offre individuellement.
- **Extraction LinkedIn** :
  - **Logo** : Extraction URL + Nettoyage Proxy Google.
  - **Lieu** : Nettoyage "·" et parenthèses.
  - **Métadonnées** : Extraction Regex pour Salaire, Mode (Remote/Hybrid), Tags (Actif, Simplifiée).
- **Déduplication** : Repose sur l'index unique `{ url: 1 }`. Les doublons sont ignorés silencieusement.

## Enrichissement IA (Batch)
Lors de l'ingestion, un pipeline parallèle se déclenche :
1. **Entreprises** : Identification ESN/Plateforme vs Client Final.
2. **Lieux** : Normalisation en Pays (ex: "Nantes" -> "France").
- **Cache** : Les résultats sont stockés dans `company_analyses` et `location_analyses` pour ne jamais payer 2 fois pour la même donnée.

## Filtrage Automatique (Règles)
1. **Blacklist** : Si Titre OU Company matche -> `category=FILTERED`.
2. **Whitelist** : Si Titre matche -> `category=TARGET`.
3. **Explore** : Sinon.

## Cycle de vie
- **Visité** : Persistant en DB (`visitedAt`).
- **Trash** : Soft delete (`status=TRASH`). Réversible via Toaster ou onglet Traitées.
- **Blacklist** : Action "Filtrer" ajoute à la liste et met à jour les jobs existants.