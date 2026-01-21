# Règles Next.js (App Router) — Base réutilisable

## Intention
Ces règles guident la conception et l’implémentation sur **Next.js (App Router)**, avec une approche **server-first** et une obsession de performance **dès la phase de conception**.

## Conception orientée performance (avant d’écrire du code)
- Partir **Server Components par défaut** ; ne basculer en Client Components que si nécessaire (interactivité, hooks, APIs navigateur).
- Choisir la stratégie de rendu **avant** d’implémenter :
  - **SSG** pour contenu stable (pages marketing, docs).
  - **ISR** pour contenu semi-statique (catalogue, blog) avec revalidation.
  - **SSR / dynamic** pour données user / temps réel.
- Prévoir le **streaming** :
  - découper l’UI en morceaux “lents” et les encapsuler dans `<Suspense>` + `loading.tsx`.
- Prévoir les **frontières d’erreurs** :
  - `error.tsx` par segment, `not-found.tsx` si nécessaire.
- Prévoir les **budgets** (bundle, images) et la charge (N+1 DB, payloads, pagination/virtualisation).

## Routing & structure App Router
- Utiliser `app/` pour le routing ; conventions : `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Routes et segments en **kebab-case** (minuscules).
- Utiliser `next/navigation` (pas `next/router`) pour router côté client.
- Middleware : uniquement auth/headers/redirects ; éviter tout calcul lourd.

## Server vs Client Components
- Server Components par défaut (data fetching, SEO, perf).
- Mettre `"use client"` uniquement sur les **feuilles** d’interactivité (éviter de “clientifier” un layout entier).
- Ne pas appeler des route handlers internes depuis un Server Component : appeler directement la couche service/DB.

## Data fetching & cache (Next)
- Fetch côté serveur via `fetch` natif / services dédiés.
- Définir explicitement cache/revalidate :
  - SSG par défaut quand possible.
  - ISR via `next: { revalidate: X }`.
  - SSR/dynamic via `export const dynamic = 'force-dynamic'` quand nécessaire.
- Éviter le refetching/redondance : dédupliquer si besoin ; paginer les listes volumineuses (virtualisation si très grande liste).

## Streaming, loading states, UX
- `loading.tsx` sur les routes lentes/dynamiques.
- `<Suspense>` pour streamer les sous-arbres avec data lente (ne pas bloquer toute la page).

## SEO & metadata
- Définir `metadata` (title, description, viewport) dans `layout.tsx` / `page.tsx`.
- Utiliser des métadonnées cohérentes pour pages publiques (OpenGraph si applicable).

## Images, fonts, scripts
- Utiliser exclusivement `next/image` (pas `<img>`), avec `alt` obligatoire.
- Dimensions explicites (`width/height` ou `fill`) ; `priority` uniquement pour above-the-fold.
- Utiliser `next/font` (Google ou local) avec `display: 'swap'`.

## Performance & bundle
- `next/dynamic` pour lazy-load des composants lourds/non critiques.
- Mesurer et réduire le bundle (ex: bundle analyzer) ; optimiser les imports.

## Gestion d’erreurs
- Standardiser les objets d’erreur côté API/service.
- Ne pas renvoyer d’erreurs brutes (DB/stack) côté client ; log serveur, message assaini côté client.
- Utiliser `error.tsx` comme boundary par segment.

## Checklist rapide (avant merge)
- [ ] Server-first : `'use client'` est minimal et localisé
- [ ] Cache/revalidate/dynamic explicités quand nécessaire
- [ ] `loading.tsx` / `<Suspense>` posés sur les zones lentes
- [ ] `error.tsx` présent sur segments à risque
- [ ] `next/image` partout (+ alt)
- [ ] `metadata` défini sur pages publiques
- [ ] Lazy-load sur éléments lourds
