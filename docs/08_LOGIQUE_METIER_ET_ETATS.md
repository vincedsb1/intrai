# Logique métier & états

## Tri à l’ingestion (ordre strict)
1. Exclusion (blacklist):
   - si `company` OU `title` contient un terme blacklist (case-insensitive, match substring)
   - => category=FILTERED, matchedKeyword=<terme>, status=INBOX
2. Identification cible (whitelist):
   - si `title` contient un terme whitelist
   - => category=TARGET, matchedKeyword=<terme>, status=INBOX
3. Par défaut:
   - => category=EXPLORE, status=INBOX

Source: specs v12. :contentReference[oaicite:12]{index=12}

## Cycle de vie UI
- L’utilisateur clique une carte => job “visité” (grisé) mais reste INBOX
- Décision:
  - Save => status=SAVED (disparaît Inbox)
  - Trash => status=TRASH (disparaît Inbox)
- Nettoyer les visités:
  - tous les jobs visités dont status=INBOX => status=TRASH

## Filtrés
- Un job filtré est `category=FILTERED`
- Le bouton “Repêcher”:
  - status=INBOX
  - category=EXPLORE
  - matchedKeyword=null

## Règles de matching (détails)
- Normalisation:
  - trim
  - comparaison case-insensitive
- Matching:
  - substring simple (rapide, suffisant)
  - amélioration possible: tokenization + mots entiers + accents
