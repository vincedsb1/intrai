# Déploiement Vercel

## Variables d’environnement (prod + preview)
- `MONGODB_URI` = string (Format: `mongodb://user:pass@ip:27017/db?authSource=admin`)
- `WEBHOOK_SECRET` = string
- `AI_API_KEY` = string (si AI Detective réel)
- `AI_MODEL` = string (optionnel)
- `NEXT_PUBLIC_APP_NAME` = string (optionnel)

## Infrastructure VPS (MongoDB Self-Hosted)
Si la base de données est hébergée sur un VPS (non-Atlas), une configuration spécifique est requise pour éviter les timeouts Vercel (`MongoServerSelectionError`).

### 1. Configuration Réseau (TCP Keepalive)
Vercel (Serverless/AWS Lambda) laisse des connexions "zombies". Le VPS doit les tuer rapidement pour ne pas saturer.
**Commande VPS :**
```bash
echo "net.ipv4.tcp_keepalive_time = 300" | sudo tee /etc/sysctl.d/99-mongodb-keepalive.conf
echo "net.ipv4.tcp_keepalive_intvl = 60" | sudo tee -a /etc/sysctl.d/99-mongodb-keepalive.conf
echo "net.ipv4.tcp_keepalive_probes = 3" | sudo tee -a /etc/sysctl.d/99-mongodb-keepalive.conf
sudo sysctl --system
```

### 2. Sécurité & Pare-feu
- **UFW** : Autoriser le port 27017.
- **Fail2Ban** : ATTENTION. Peut bannir Vercel lors des "Cold Starts" (pics de connexions). Whitelister le port ou surveiller les logs.
- **Bind IP** : `mongod.conf` doit avoir `bindIp: 0.0.0.0`.

### 3. Stabilité (RAM/Swap)
MongoDB est gourmand. Sur un petit VPS (<4Go RAM), activer le Swap est obligatoire pour éviter le OOM Killer.

## Checklist déploiement
1. Build OK
2. Pages Tabs OK
3. Connexion Mongo OK (Vérifier logs `[MONGO] 🟢 Connected`)
4. Endpoint webhook protégé OK
5. Ingestion crée bien des jobs
6. Settings persistés
7. AI Detective stub OK (puis provider si activé)

## Diagnostic Logs
L'application émet des logs structurés pour le debug :
- `[MONGO] ...` : État de la connexion (Temps, Heartbeat).
- `[JOBS] ...` : Temps d'exécution des requêtes DB.
- `[Email Ingest] ...` : Traitement des webhooks. Note: Les fichiers HTML de debug ne sont écrits qu'en DEV (`NODE_ENV=development`) pour éviter les erreurs `EROFS` sur Vercel.