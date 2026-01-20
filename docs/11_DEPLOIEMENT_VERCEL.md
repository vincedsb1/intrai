# Déploiement Vercel

## Variables d’environnement (prod + preview)
- `MONGODB_URI` = string
- `WEBHOOK_SECRET` = string
- `AI_API_KEY` = string (si AI Detective réel)
- `AI_MODEL` = string (optionnel)
- `NEXT_PUBLIC_APP_NAME` = string (optionnel)

## Checklist déploiement
1. Build OK
2. Pages Tabs OK
3. Connexion Mongo OK
4. Endpoint webhook protégé OK
5. Ingestion crée bien des jobs
6. Settings persistés
7. AI Detective stub OK (puis provider si activé)

## Notes
- Prévoir un seed au premier boot:
  - créer `settings` si absent (whitelist/blacklist par défaut)
