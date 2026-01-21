#!/bin/bash

# Test d'ingestion via le webhook
# Note : L'app Next.js doit être lancée (npm run dev) pour que ce test fonctionne.

URL="http://localhost:3000/api/ingest/webhook"
SECRET="intrai_secret_123"

echo "Test d'ingestion d'une offre 'TARGET' (React)..."
curl -X POST $URL \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{
    "title": "Développeur Senior React",
    "company": "SuperTech",
    "location": "Paris",
    "url": "https://example.com/job1"
  }'

echo -e "\n\nTest d'ingestion d'une offre 'FILTERED' (ESN)..."
curl -X POST $URL \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{
    "title": "Ingénieur Java dans une ESN",
    "company": "Big ESN Corp",
    "location": "Lyon",
    "url": "https://example.com/job2"
  }'

echo -e "\n\nTest d'ingestion d'une offre 'EXPLORE' (Standard)..."
curl -X POST $URL \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{
    "title": "Développeur PHP Laravel",
    "company": "PME Locale",
    "location": "Nantes",
    "url": "https://example.com/job3"
  }'

echo -e "\n\nTests terminés."
