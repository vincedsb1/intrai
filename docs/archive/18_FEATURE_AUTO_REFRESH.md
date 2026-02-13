# Plan d'implémentation : Auto-Refresh & Indicateur Système

**Date** : 2026-01-28
**Statut** : Planifié
**Contexte** : L'utilisateur doit actuellement rafraîchir la page pour voir les nouveaux emails ingérés via Webhook. L'UX doit devenir "temps réel" (ou presque) avec un feedback visuel.

## 1. Objectif
- **Polling automatique** : Le client vérifie toutes les 60 secondes si de nouvelles offres sont arrivées.
- **Mise à jour UI** : Si (et seulement si) de nouvelles données sont disponibles, l'interface se rafraîchit sans rechargement complet de la page (`soft refresh`).
- **Feedback** : Afficher dans la Sidebar (section Système) l'heure de la dernière vérification réussie.

## 2. Architecture Technique

### 2.1 Distinction Push vs Pull
- **Backend (Push)** : CloudMailin pousse les emails vers l'API. La DB est à jour en temps réel.
- **Frontend (Pull)** : Le navigateur ne sait pas que la DB a changé. Il doit demander régulièrement ("Polling").

### 2.2 Stratégie "Smart Polling"
Pour éviter de recharger toute la page (et faire clignoter l'interface) inutilement toutes les minutes :
1.  Le front appelle un endpoint léger (`GET /api/jobs/count?status=INBOX`) toutes les 60s.
2.  Il compare ce nombre avec le nombre qu'il a en mémoire.
3.  **SI le nombre diffère** (ou si le hash diffère) => Appel de `router.refresh()` (Fonctionnalité Next.js App Router qui recharge les Server Components tout en gardant le state client).
4.  Mise à jour du timestamp "Dernière vérif".

## 3. Implémentation

### 3.1 Hook `useAutoRefresh` (`lib/hooks/useAutoRefresh.ts`)
Ce hook encapsulera la logique pour ne pas surcharger les composants.

**Responsabilités :**
- `useEffect` avec `setInterval` (60s).
- Fetch `/api/jobs/count`.
- Stockage `lastCheckedAt`.
- Déclenchement `router.refresh()` si changement.

### 3.2 Endpoint API (`app/api/jobs/count/route.ts`)
Cet endpoint existe déjà (mentionné dans `ARCHITECTURE.md`).
Il faut s'assurer qu'il retourne le `count` des offres en INBOX.
*Note: On pourrait aussi retourner un hash ou un `lastUpdatedAt` global pour être plus précis, mais le count est suffisant pour le MVP.*

### 3.3 Mise à jour Sidebar (`components/Sidebar.tsx`)
Intégration visuelle dans le footer de la sidebar.

**Design proposé :**
Dans la boite "Système" (sous "Parser Actif") :
```tsx
<div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
  <span className="flex items-center gap-1">
    <Clock size={10} />
    {lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live" />
</div>
```

## 4. Plan d'Action

1.  **Vérification API** : S'assurer que `GET /api/jobs/count` fonctionne et renvoie le bon format JSON.
2.  **Création Hook** : Implémenter `useAutoRefresh` avec la logique de comparaison.
3.  **Intégration UI** : Modifier `Sidebar.tsx` pour utiliser le hook et afficher le timestamp.

## 5. Évolutions futures
- Passer aux **Server Sent Events (SSE)** ou **WebSockets** si le besoin de temps réel devient critique (< 1s), mais le polling 60s est parfait pour des emails.
