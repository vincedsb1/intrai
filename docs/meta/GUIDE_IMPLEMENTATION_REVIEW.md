# Guide de Revue des Documents d'Implémentation

Ce guide est destiné à valider la qualité des documents présents dans `docs/reference/`. L'objectif est de s'assurer que la documentation est une base fiable pour la maintenance et la reconstruction.

## Le "Test de Reconstruction"

Pour chaque document revu, posez-vous la question suivante :
> *"Si je supprime le code source, est-ce que je peux réécrire la fonctionnalité à l'identique (ou presque) juste en lisant ce document ?"*

- **OUI** : Le document est validé.
- **NON** : Le document doit être complété.

---

## Checklist de Validation

### 1. Conformité Formelle
- [ ] **Frontmatter** présent et complet (Phase, Status, Date, Category).
- [ ] **Lien Spec** présent et valide vers `/docs/initial-doc/`.
- [ ] **Table des Matières** présente (si document long).
- [ ] **Pas de "TBD"** ou de sections vides.

### 2. Précision Technique
- [ ] **Signatures de fonction** : Sont-elles exactes ? (Types, Arguments, Retour).
- [ ] **Exemples de code** : Contiennent-ils la localisation (`Location: path/to/file:line`) ?
- [ ] **Noms de fichiers** : Les chemins indiqués existent-ils vraiment ?
- [ ] **Dépendances** : Les imports et modules liés sont-ils cités ?

### 3. Contenu Frontend (Pages/Composants)
- [ ] **Props** : Toutes les props sont-elles listées avec leur type ?
- [ ] **États** : Les `useState` / `useReducer` clés sont-ils expliqués ?
- [ ] **API** : Les appels réseaux (endpoints) sont-ils documentés (méthode, URL, cas d'erreur) ?
- [ ] **UX** : Les états de chargement (Loading) et d'erreur sont-ils décrits ?

### 4. Contenu Backend (Modules)
- [ ] **Responsabilité** : Le scope du module est-il clair ?
- [ ] **Storage** : Les interactions SQL (tables, requêtes clés) sont-elles précisées ?
- [ ] **Filesystem** : Les lectures/écritures fichiers sont-elles décrites (chemins, atomicité) ?
- [ ] **Erreurs** : Les exceptions levées sont-elles listées ?

### 5. Tests & Qualité
- [ ] **Couverture** : Le document liste-t-il les fichiers de tests associés ?
- [ ] **Scénarios** : Les cas de tests principaux (Happy path vs Edge cases) sont-ils mentionnés ?

---

## Cas d'Invalidité Fréquents

| Défaut | Correction requise |
|--------|--------------------|
| "Voir le code pour plus de détails" | **Interdit**. Extraire la logique clé et l'expliquer. |
| Exemple de code simplifié / pseudo-code | Remplacer par le **vrai code** du repo. |
| Liste de props incomplète | Lister **toutes** les props de l'interface TypeScript. |
| Oubli des cas d'erreur API | Documenter les codes HTTP 4xx/5xx gérés. |
| Description vague ("Gère les données") | Être spécifique ("Valide le format CSV et insère en base"). |

## Processus de Correction

1. Identifier les manques via cette checklist.
2. Ouvrir le fichier de code correspondant.
3. Extraire les informations manquantes (signatures, logique, types).
4. Mettre à jour le markdown.
5. Mettre à jour la date `Last Updated` dans le frontmatter.
