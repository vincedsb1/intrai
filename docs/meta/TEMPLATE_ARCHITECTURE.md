# Template : Document d'Architecture (ARCHITECTURE.md)

Ce modèle définit la structure et le contenu attendu pour le fichier `docs/initial-doc/00-ARCHITECTURE.md` (ou tout audit architectural majeur). Il est adapté aux contraintes spécifiques du projet Aimoto (Local-only, Python/Next.js).

---

# ARCHITECTURE DU SYSTÈME

**Version**: 1.0
**Last Updated**: YYYY-MM-DD

## 1. Vue d'Ensemble

### Objectif
[Décrire en une phrase le but de l'application. Ex: Application locale de prévision financière daily.]

### Stack Technique
- **Frontend** : Next.js 13+ (App Router), React, TypeScript, Tailwind.
- **Backend** : Python (FastAPI), Uvicorn.
- **Data** : SQLite (Métadonnées) + Parquet (Données volumineuses).
- **Communication** : HTTP (REST) sur localhost uniquement.

## 2. Invariants & Contraintes (CRITIQUE)

Ce sont les règles absolues qui ne doivent jamais être violées.

1.  **Local-Only** : Pas d'auth, pas de cloud, utilisateur unique. Tout tourne sur la machine.
2.  **Séparation Frontend/Backend** :
    - Le Frontend ne lit/écrit **JAMAIS** directement sur le disque ou la DB.
    - Tout passe par l'API Backend.
3.  **Écritures Atomiques** :
    - Toute écriture fichier suit le pattern : `Write tmp` -> `Fsync` -> `Atomic Rename`.
    - Aucune corruption de données tolérée en cas de crash.
4.  **Timeframe** : Unité de temps stricte = **1 Jour (Daily)**. Pas d'intraday.

## 3. Architecture des Données

### 3.1 SQLite (`aimoto.db`)
Stockage relationnel pour les métadonnées légères et transactionnelles.
- **Runs** : Historique des exécutions, statuts, scores.
- **Features** : Registre des features disponibles.
- **Queue** : File d'attente des jobs (Worker).
- **Settings** : Configuration utilisateur.

### 3.2 Système de Fichiers (Parquet/JSON)
Stockage des données lourdes et artefacts immuables.
- **Datasets** : Fichiers sources importés.
- **Canonical** : Données nettoyées (`canonical.parquet`).
- **Run Artifacts** : Pour chaque run (`runs/{id}/`), on stocke les logs, les modèles sérialisés, les prédictions (JSON/Parquet).

## 4. Flux de Données (Data Flow)

### Import & ETL
`CSV Source` -> `Backend Validation` -> `Canonical Parquet` -> `SQLite (Metadata)`

### Workflow d'Exécution (Run)
1.  **Frontend** : User configure un Run -> POST /api/runs.
2.  **Backend** : Crée entrée DB (Status: PENDING) -> Ajoute job en Queue.
3.  **Worker** :
    - Pull job.
    - Charge `Canonical Parquet`.
    - Calcule Features (Cache).
    - Entraîne Modèle.
    - Génère Prédictions.
    - Écrit Artefacts (Atomic).
    - Met à jour DB (Status: COMPLETED).

## 5. Organisation du Code

### Backend (`/backend`)
- `app/main.py` : Point d'entrée API.
- `app/storage.py` : Gestion SQLite & Singleton DB.
- `app/filesystem.py` : Gestion fichiers (Atomic writes, Paths).
- `app/worker.py` : Logique ML et orchestration.
- `app/features.py` : Feature Engineering.

### Frontend (`/frontend`)
- `app/` : Pages (Next.js App Router).
- `components/` : UI Reutilisable.
- `lib/api.ts` : Client API (Fetch wrapper).

## 6. Gestion des Erreurs & Robustesse

- **I/O Retries** : En cas de "File Locked" (Windows/Concurrent), retry exponentiel.
- **Transactions** : SQLite en mode WAL pour la concurrence lecture/écriture.
- **Garbage Collection** : Nettoyage au démarrage (orphaned runs, tmp files).

## 7. Sécurité (Local Context)
- Pas d'authentification requise.
- Validation stricte des inputs (Dates, Chemins fichiers) pour éviter les corruptions locales.
- Sanitize des noms de fichiers.

## 8. Performance
- **Caching** : Features calculées mises en cache (Pickle/Parquet).
- **Pagination** : Listes de Runs paginées API.
- **Streaming** : Lecture Parquet par chunks si nécessaire.
