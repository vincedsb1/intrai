# Règles Tests — Vitest & Playwright

## Pyramide
- Unit tests pour logique/utilitaires.
- Tests composants pour rendu + interactions.
- E2E pour parcours critiques.

## Unit / component (Vitest + Testing Library)
- Tests déterministes : pas d’aléatoire ni dépendance à l’heure système (mocker Date).
- Mocker modules externes et appels réseau (`vi.mock`).
- Utiliser `user-event` pour interactions.
- Encadrer les updates async dans `act()` quand nécessaire.

## E2E (Playwright)
- Sélecteurs robustes : `getByRole`, `getByTestId`.
- Auth E2E via API (si disponible) pour stabilité/rapidité.
- Isolation : nettoyer après tests, données uniques.

## Checklist
- [ ] tests deterministes
- [ ] mocks externes
- [ ] sélecteurs robustes
- [ ] parcours critiques couverts
