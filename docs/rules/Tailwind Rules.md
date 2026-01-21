# Règles Tailwind CSS — UI scalable

## Usage
- Tailwind par défaut pour le styling ; éviter CSS brut sauf nécessité.
- Mobile-first : base sans préfixe, puis `sm: md: lg: xl:`.

## Classes conditionnelles
- Utiliser `clsx` / `cn()` pour classes conditionnelles.
- Éviter la concaténation manuelle de strings complexe.

## Composants UI
- Découper l’UI en petits composants (atomic/feature-based).
- Utiliser des variants (ex: `size`, `intent`) plutôt que du copier-coller de classes.

## Qualité UI
- Responsive obligatoire.
- Accessibilité de base : focus visible, `aria-*` si besoin, contrastes.

## Checklist
- [ ] `cn/clsx` utilisé pour conditionnels
- [ ] UI découpée en composants
- [ ] Responsive validé (mobile → desktop)
