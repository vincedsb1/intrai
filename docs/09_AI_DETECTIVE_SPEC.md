# AI Detective — spécification

## Déclencheur (Inbox)
Sur chaque JobCard en Inbox: bouton discret “Analyser l’auteur ?” (icône Bot).
Conforme maquette. :contentReference[oaicite:13]{index=13}

## Prompt “conceptuel” (fonctionnel)
Entrées:
- title
- company

Sortie JSON:
{
  "isPlatformOrAgency": boolean,
  "type": string,
  "reason": string
}

Source: specs v12. :contentReference[oaicite:14]{index=14}

## UX de la modale
- Opening => state loading (spinner)
- Puis affichage result:
  - Si suspect => CTA rouge “Bannir l’auteur”
  - Sinon => bouton unique “Compris, retour à l’Inbox”

## Action “Bannir l’auteur”
Effets:
1. Ajoute `company` à la blacklist (settings)
2. Déplace le job en `category=FILTERED`
3. (Optionnel) le retirer visuellement de l’Inbox immédiatement en le filtrant côté query (car Filtrés view)
   - recommandé: dès que category=FILTERED, il disparaît de l’Inbox

## Implémentation progressive
- V1: stub (heuristiques) pour valider UX
- V2: intégration provider (env: `AI_API_KEY`)
- Toujours persister `aiAnalysis` dans le job pour audit rapide
