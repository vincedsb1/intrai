# Ingestion Email via CloudMailin

**Status**: Draft
**Version**: 1.0 (Aligné Specs v12)
**Stack**: CloudMailin -> Next.js API -> services serveur -> PostgreSQL

---

## 1. Introduction

### Le Problème
L'application **intrai** se nourrit d'offres d'emploi. Ces offres arrivent majoritairement par emails (alertes LinkedIn, Indeed, Glassdoor) dans la boîte mail de l'utilisateur.
Il est fastidieux de copier-coller chaque lien. Nous avons besoin d'un système automatisé qui transforme un email transféré en une `JobCard` dans l'application.

### La Solution : CloudMailin
Nous utilisons [CloudMailin](https://www.cloudmailin.com/) comme passerelle.
1. L'utilisateur transfère un email vers une adresse dédiée (ex: `inbox@cloudmailin.net`).
2. CloudMailin parse l'email (Headers, Body HTML/Text, Attachments).
3. CloudMailin POST un JSON structuré vers notre webhook sécurisé.

### Flux de Données
`[Email Client]` -> `[CloudMailin]` -> `[POST /api/ingest/email]` -> `[Parsing & Tri]` -> `[PostgreSQL]`

---

## 2. Architecture Générale

Ce système est conçu pour être **robuste** (ne pas perdre d'offres) mais **tolérant** (accepter des emails mal formatés).

- **Ce que le système FAIT** :
  - Accepte des payloads JSON de CloudMailin.
  - Extrait le maximum d'infos (Titre, URL, Company) via des regex et heuristiques.
  - Trie automatiquement (Whitelist/Blacklist).
  - Stocke le résultat en base.

- **Ce que le système NE FAIT PAS** :
  - Il ne se connecte pas en IMAP/POP à la boîte mail de l'utilisateur.
  - Il ne fait pas de rendu HTML complexe de l'email (on extrait le texte).

---

## 3. CloudMailin - Configuration

### Adresse Inbound
Créer une adresse sur CloudMailin.
Format : `intrai-xxxyyy@cloudmailin.net`

### Target (Webhook)
- **URL** : `https://mon-app-intrai.vercel.app/api/ingest/webhook`
- **Format** : `JSON` (Normalized)
- **POST Format** : `Multipart/form-data` ou `JSON Body` (préférer JSON Body pour Next.js).

### Sécurité
L’authentification existante de la requête reste requise et sa configuration demeure hors de ce dépôt. Ne pas inclure de valeur d’authentification dans la documentation ou les logs.

---

## 4. Contrat du Webhook Inbound

L'endpoint `/api/ingest/webhook` est polymorphe. Il accepte soit le format JSON interne (test/dev), soit le format CloudMailin.

### Payload CloudMailin (Simplifié)
```json
{
  "headers": {
    "subject": "Nouvelle offre : React Developer chez TechCorp",
    "from": "alerts@linkedin.com",
    "to": "intrai@cloudmailin.net"
  },
  "plain": "Bonjour, voici une offre...\nhttp://linkedin.com/jobs/view/12345\n...",
  "html": "<html>...</html>",
  "envelope": {
    "to": "intrai@cloudmailin.net",
    "from": "user@gmail.com"
  }
}
```

### Validation
1. Vérification du Secret.
2. Présence de `plain` (texte brut) ou `html`.
3. Extraction de l'URL (champ critique). Si pas d'URL, l'offre est rejetée ou stockée comme "Erreur de parsing".

---

## 5. Pipeline de Parsing (Cœur Métier)

Le parsing se fait dans `server/ingest.service.ts` (à créer ou étendre `jobs.service.ts`).

### 5.1 Construction du rawString
On concatène `Subject` + `Plain Body` pour avoir tout le contexte textuel.

### 5.2 Extraction des champs (Heuristiques)

1. **URL (Critique)**
   - Regex pour trouver `https://...`
   - Nettoyage des paramètres de tracking (`utm_source`, etc.).
   - Si multiples URLs : prendre la première qui n'est pas une URL de désabonnement/tracking connu (ex: `linkedin.com/e/`, `unsub`).

2. **Title**
   - Souvent dans le sujet : "Fwd: [Job] Senior React Dev" -> Nettoyer "Fwd:", "TR:", "[Job]".
   - Fallback : Première ligne non vide du body.

3. **Company**
   - Difficile à extraire fiablement sans IA.
   - Heuristique : "chez [Company]" ou "at [Company]" dans le sujet.
   - Sinon : Laisser vide ou mettre "Inconnu".

4. **Parser Grade**
   - **A** : Title + Company + URL détectés et propres.
   - **B** : Title + URL détectés, Company manquante.
   - **C** : URL détectée, Title bruité/générique (ex: "Nouvelle alerte").
   - **Echec** : Pas d'URL.

---

## 6. Règles de Routing (Tri Automatique)

Une fois l'objet `Job` instancié (mais pas sauvé), on applique le `classifyJob(job, settings)` :

1. **Blacklist (Priorité 1)**
   - Si `title` OU `company` contient un terme blacklisté -> **Category = FILTERED**, Status = INBOX.
2. **Whitelist (Priorité 2)**
   - Si `title` contient un terme whitelisté -> **Category = TARGET**, Status = INBOX.
3. **Explore (Défaut)**
   - Sinon -> **Category = EXPLORE**, Status = INBOX.

---

## 7. Persistance en base (PostgreSQL)

`server/jobs.service.ts` mappe `ParsedJob` vers `jobs` avec des requêtes paramétrées. Les IDs existants restent du texte hexadécimal ; les nouvelles lignes reçoivent un UUID texte. Chaque nouvel `INSERT` fournit un `source_ejson` JSONB non nul ; cette archive n’est jamais relue par l’application ni incluse dans une réponse API. Le contrôle de doublon URL préserve le statut et la catégorie de l’offre existante.

---

## 8. Checklist d'Implémentation

- [ ] Configurer compte CloudMailin (Dev/Prod).
- [ ] Mettre à jour `route.ts` du webhook pour détecter le format CloudMailin (vs format JSON simple).
- [ ] Implémenter le `EmailParser` (Regex URL, nettoyage Sujet).
- [ ] Ajouter le champ `source` au modèle Job.
- [ ] Tester avec des vrais forwards d'emails (LinkedIn, Indeed).
- [ ] Vérifier que les logs affichent bien les erreurs de parsing.

---

**Note Architecte** : Cette brique est essentielle pour l'usage quotidien. Si le parsing regex montre ses limites (trop de Grade C), il faudra envisager un passage du body raw dans l'API **AI Detective** pour extraction structurée (coût $$ mais qualité A+).
