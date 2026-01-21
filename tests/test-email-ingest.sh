#!/bin/bash

# Test d'ingestion EMAIL via multipart/form-data
# Note : L'app Next.js doit être lancée (npm run dev) pour que ce test fonctionne.

URL="http://localhost:3000/api/ingest/email?secret=intrai_secret_123"

echo "Test d'ingestion Email CloudMailin (Multipart)..."

# On utilise des quotes simples pour éviter que le shell n'interprète les caractères spéciaux
# et on passe les champs texte proprement.
curl -v -X POST "$URL" \
  -F "plain=Bonjour, voici une super offre : https://www.welcometothejungle.com/fr/companies/test/jobs/react-dev" \
  -F "html=<p>Bonjour, voici une super offre : <a href='https://www.welcometothejungle.com/fr/companies/test/jobs/react-dev'>Cliquez ici</a></p>" \
  -F "headers[subject]=Fwd: Offre Senior React chez MyCompany" \
  -F "headers[message_id]=msg_$(date +%s)" \
  -F "headers[from]=recruiter@linkedin.com"

echo -e "\n\nTest terminé."