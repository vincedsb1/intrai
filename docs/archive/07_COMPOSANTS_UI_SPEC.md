# Composants UI — spécifications

## Layout
- `AppShell`
  - `TopNavTabs` (sticky)
  - `MainContainer` (max-w ~ 3xl, padding)
  - rendu conditionnel de la vue active

## Composants clés
- `JobCard`
  - props: job, isVisited, onVisit, onSave, onTrash, onOpenAiDetective, mode (inbox/filtered/readonly)
  - variations:
    - category=EXPLORE => badge “Exploration” (jaune)
    - parserGrade=C => style mono + bordure gauche + texte compact
    - visited => opacity + grayscale + label “Vu”
- `AiDetectiveModal`
  - states: closed | loading | result
  - actions:
    - Ignorer / fermer
    - Bannir l’auteur (si suspect)
- `BulkCleanFab`
  - visible si `visitedCount > 0`
- `SettingsWhitelist`
- `SettingsBlacklist`
  - chips + suppression + ajout

## Styles
- Utiliser Tailwind v4.1
- Look & feel conforme maquette (espacements, arrondis, ombres, icônes lucide). :contentReference[oaicite:11]{index=11}
