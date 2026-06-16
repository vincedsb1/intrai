---
name: optimize-claude-md
description: Audit and optimize project AI instruction files such as CLAUDE.md, AGENTS.md, project-config.md, and related
  context documents.
---

# /optimize-claude-md — Audit & optimisation du fichier `CLAUDE.md`

Cette commande analyse, audite et optimise le fichier `CLAUDE.md` à la racine du projet selon les **recommandations officielles Anthropic** ([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory), [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)) afin de maximiser l'adhérence de Claude aux instructions sans saturer le contexte.

---

## Pourquoi cette commande existe

Le `CLAUDE.md` est chargé **dans le contexte de chaque session**. Plus il est long, plus il consomme de tokens et **moins Claude le suit fidèlement** (les règles importantes se "perdent dans le bruit"). La doc officielle énonce clairement :

> *« Bloated CLAUDE.md files cause Claude to ignore your actual instructions! »*
> *« Size: target under 200 lines per CLAUDE.md file. »*
> *« For each line, ask: "Would removing this cause Claude to make mistakes?" If not, cut it. »*

État actuel du fichier `CLAUDE.md` au moment de l'écriture de cette commande : **~494 lignes / ~20 KB** → ~2.5× au-dessus de la cible officielle.

---

## Recommandations officielles Anthropic (source de vérité)

### Taille

| Métrique             | Cible officielle               | Limite haute          |
| -------------------- | ------------------------------ | --------------------- |
| Lignes               | **≤ 200 lignes**               | ≤ 400 (avec risques)  |
| Taille en KB         | **≤ 25 KB**                    | Pas de hard limit     |
| Taille optimale      | **80-180 lignes** (sweet spot) | —                     |
| Taille minimale      | ~20 lignes (sinon inutile)     | —                     |

### Structure

- **Markdown** avec headers (`##`) et bullet lists.
- **Sections groupées**, faciles à scanner.
- **Phrases concrètes et vérifiables** (pas de généralités).
- **Pas de paragraphes denses** — préférer des bullets.

### Contenu À INCLURE

✅ Commandes bash que Claude ne peut pas deviner (build, test, lint).
✅ Règles de code style qui diffèrent des conventions par défaut du langage.
✅ Instructions de test et runners préférés.
✅ Étiquette du dépôt (branches, PRs, commits).
✅ Décisions architecturales spécifiques au projet.
✅ Quirks d'environnement (env vars requis, ports, etc.).
✅ Gotchas et comportements non-évidents.
✅ Imports `@path/to/file.md` pour décharger le contenu rarement utile.

### Contenu À EXCLURE

❌ Tout ce que Claude peut déduire en lisant le code.
❌ Conventions standard du langage (PEP8, etc.).
❌ Documentation détaillée d'API (mettre un **lien** à la place).
❌ Information qui change fréquemment.
❌ Explications longues, tutoriels.
❌ Description fichier-par-fichier du codebase.
❌ Truisms ("write clean code", "be careful").
❌ Workflows ne s'appliquant qu'à un sous-ensemble du code (utiliser **skills** ou `.claude/rules/` avec `paths:`).
❌ Sections "Memory Instructions / Output Formatting / Tool Use" dupliquant les system prompts intégrés.
❌ Estimations de temps, mentions d'IA/Claude dans le contenu fonctionnel.

### Anti-pattern interdit

> *« If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise. »* — Doc officielle

### Quand utiliser un skill / rule plutôt qu'une entrée CLAUDE.md ?

- **Procédure multi-étapes** → skill (`.claude/skills/<name>/SKILL.md`).
- **Règles ne s'appliquant qu'à un sous-dossier ou type de fichier** → rule path-scopée (`.claude/rules/<topic>.md` avec frontmatter `paths:`).
- **Workflow déclenché ponctuellement** → slash command (`.claude/commands/<name>.md`).

---

## Invocation

```
/optimize-claude-md [--dry-run] [--target-lines <N>]
```

- `--dry-run` (défaut **on** pour la première passe) : produit l'audit et le plan de refactor sans modifier `CLAUDE.md`.
- `--target-lines <N>` : cible (défaut **180**, max recommandé **200**).
- Une seconde invocation avec `--apply` exécute les modifications après validation par l'utilisateur.

---

## Workflow à exécuter

### Phase 1 — Mesure & audit

#### Étape 1.1 — Mesurer l'état actuel (taille **visible** ET taille **effective**)

```bash
wc -l CLAUDE.md
wc -c CLAUDE.md
```

Reporter :

- Nombre de lignes visibles dans CLAUDE.md.
- Taille en KB.
- Comparaison à la cible (≤ 200 lignes / ≤ 25 KB).
- Verdict : `✅ OK` / `⚠️ AU-DESSUS DE LA CIBLE` / `❌ CRITIQUE (>2× cible)`.

**⚠️ CRITIQUE — Mesurer aussi la taille EFFECTIVE (avec imports auto-chargés)** :

```bash
# Lister tous les imports @path/to/file dans CLAUDE.md
grep -E '^@' CLAUDE.md

# Compter le coût réel cumulé
total=$(wc -l < CLAUDE.md)
for f in $(grep -oE '@[A-Za-z0-9_./-]+' CLAUDE.md | sed 's/^@//'); do
  if [ -f "$f" ]; then
    n=$(wc -l < "$f")
    echo "  + $n lignes : $f"
    total=$((total + n))
  fi
done
echo "  TOTAL contexte effectif : $total lignes"
```

Reporter clairement la **différence visible vs effective**. Un fichier de 80 lignes qui importe 500 lignes via `@` coûte 580 lignes au démarrage de chaque session — l'optimisation visible est un *trompe-l'œil* si le total réel dépasse 200.

**Règle** : viser **total effectif (CLAUDE.md + imports) ≤ 250 lignes**. Au-delà, les imports doivent être convertis en :

- Lien dans "Detailed references" (lu à la demande).
- Skill (`.claude/skills/<name>/SKILL.md`) — chargé uniquement quand le workflow est invoqué.
- Rule path-scopée (`.claude/rules/<topic>.md`) — chargée quand un fichier matchant est ouvert.

#### Étape 1.2 — Recenser toutes les sections (titres `#`, `##`, `###`)

Produire un tableau :

| # | Section | Lignes | Verdict | Action proposée |
| - | ------- | ------ | ------- | --------------- |
| 1 | <titre> | N      | ✅ Garder / ⚠️ Compacter / ❌ Déporter | <action> |

#### Étape 1.3 — Évaluer chaque section avec la grille officielle

Pour chaque section, appliquer la question canonique :

> *« Would removing this cause Claude to make mistakes? »*

Décisions possibles :

- **Keep** : info critique non-déductible du code, applicable à tout le projet.
- **Compact** : info utile mais verbeuse → réécrire en bullets concis.
- **Move to skill** : procédure multi-étapes → `.claude/skills/<name>/SKILL.md`.
- **Move to rule** : règle path-scopée → `.claude/rules/<topic>.md` avec `paths:`.
- **Move to import** : doc longue → fichier externe importé via `@path/to/file.md`.
- **Move to command** : workflow ponctuel → `.claude/commands/<name>.md`.
- **Delete** : truism, redondance avec system prompt, info déductible du code.

#### Étape 1.4 — Détecter les anti-patterns spécifiques

Signaler explicitement la présence de :

- [ ] Sections "Memory Instructions / Output Formatting / Tool Use" dupliquant les system prompts (à supprimer).
- [ ] Mentions de Claude / Copilot / AI dans le contenu fonctionnel (à reformuler).
- [ ] Workflows applicables à un seul sous-dossier (→ rule path-scoped).
- [ ] Documentation détaillée d'API (→ lien externe).
- [ ] Estimations de temps.
- [ ] Description fichier-par-fichier (→ déduire du code).
- [ ] Paragraphes denses (→ bullets).
- [ ] Conventions standard du langage déjà connues de Claude.
- [ ] Sections > 30 lignes (signal de découpage nécessaire).

#### Étape 1.5 — Détecter les **angles morts d'audit externe** (leçons capitalisées des audits précédents)

Ces points sont des angles morts récurrents qui passent à travers une optimisation naïve (≤ 200 lignes mais effectivement non-conforme). Vérifier explicitement chacun :

##### A. Coût effectif des imports (P0)

- [ ] Existe-t-il un import `@path/to/file.md` dans CLAUDE.md ?
- [ ] Si oui, le total `CLAUDE.md + imports` dépasse-t-il 250 lignes ?
- [ ] Le contenu importé est-il **réellement utile à chaque session** ou seulement à des workflows ponctuels (création de doc, refacto…) ?

→ Si l'import sert un workflow ponctuel : **convertir en skill** (`.claude/skills/<name>/SKILL.md`) ou en lien dans "Detailed references".

##### B. Repository etiquette (anthropic-must-include)

- [ ] Branche active mentionnée ? (ex. `dev005`, `main`)
- [ ] Convention de commit messages explicitée ? (langue, mood, no AI mention)
- [ ] Convention de naming des branches (`feat/...`, `fix/...`) ?
- [ ] Politique de PR / squash / merge ?

→ Si absent : créer une section `## Repository etiquette` (≤ 5 lignes).

##### C. Environment quirks (anthropic-must-include)

- [ ] Python venv / chemin de l'interpréteur documenté ?
- [ ] Version de Python requise ?
- [ ] Version de Node / pnpm requise ?
- [ ] Variables d'environnement obligatoires citées avec leur rôle et leur source de configuration ?

→ Si absent : ajouter dans `## Build & test` ou `## Stack & constraints`.

##### D. Gotchas / non-obvious behaviors (anthropic-must-include)

- [ ] Le projet a-t-il des scripts `repro_*.py` ou des bugs récurrents documentés ?
- [ ] Pièges connus (segfaults, lock SQLite WAL, problèmes spawn multiprocessing, etc.) cités ?

→ Si absent et qu'il existe des `scripts/repro_*` : créer section `## Gotchas` (≤ 5 bullets concrets avec commande de reproduction si pertinent).

##### E. Anti-duplication (drift risk)

- [ ] Une règle critique de CLAUDE.md est-elle aussi présente dans un autre fichier (ex. `00-ARCHITECTURE.md`) ?
- [ ] Une seule source de vérité est-elle clairement désignée ?

→ Si duplication : choisir la source unique (CLAUDE.md pour les invariants critiques) ; remplacer la duplication par "voir CLAUDE.md".

##### F. Données chiffrées volatiles

- [ ] CLAUDE.md contient-il des chiffres susceptibles de changer (best skill %, nombre de features, nom de la meilleure config, nom de la branche en cours sur le HEAD) ?

→ Si oui : **retirer** et remplacer par référence à un fichier qui se met à jour (`docs/audits/TECHNIQUES-REGISTRY.md`, etc.). Citation de la doc Anthropic : *« Don't include info that changes frequently »*.

##### G. Instruction "read on demand"

- [ ] La section "Detailed references" (ou équivalent) précise-t-elle que les fichiers ne sont **pas** chargés au démarrage et doivent être lus à la demande ?
- [ ] Y a-t-il une indication contextuelle (« lire avant de toucher à X ») par fichier listé ?

→ Si absent : préfixer la section par `## Detailed references (read on demand, NOT auto-loaded)` + ajouter mini-indications.

##### H. Mécanisme `paths:` réellement supporté

- [ ] Les fichiers `.claude/rules/*.md` utilisent-ils un frontmatter `paths:` ?
- [ ] Ce mécanisme est-il **réellement chargé contextuellement** par Claude Code (vérifier la doc officielle à jour) ou est-ce une convention non-native ?

→ Si non-native : soit faire référencer ces rules par les slash-commands concernés, soit accepter qu'elles ne sont chargées que sur lecture manuelle, et **documenter ce comportement** dans CLAUDE.md.

##### I. Hygiène du dossier `.claude/`

- [ ] Présence de fichiers `*.backup`, `*.v3-backup`, `*.old`, `*.bak` dans `.claude/commands/`, `.claude/rules/`, `.claude/skills/` ?

→ Si oui : signaler et proposer suppression (commit séparé).

##### J. Présence d'`AGENTS.md` / `CLAUDE.local.md`

- [ ] Le projet a-t-il un `AGENTS.md` ? (utile pour portabilité multi-agents : Cursor, Aider, Codex)
- [ ] Le projet a-t-il un `CLAUDE.local.md` (gitignored, préférences perso) ?

→ Optionnel mais à mentionner dans l'audit comme amélioration possible.

##### K. Anatomie du titre H1

- [ ] Le titre `# <X> — CLAUDE.md` est-il redondant (l'environnement connaît déjà le nom du fichier) ?

→ Préférer `# <nom-du-projet>` court.

##### L. Score d'audit final

Produire à la fin de la Phase 1 un tableau récapitulatif noté A/B/C/D/F sur chacun des 10 critères suivants :

| Critère                                          | Note |
| ------------------------------------------------ | ---- |
| Taille visible                                   |      |
| **Taille effective (incl. imports)**             |      |
| Couverture des invariants                        |      |
| Couverture des commandes build/test/env          |      |
| Repository etiquette                             |      |
| Gotchas / pièges connus                          |      |
| Anti-duplication                                 |      |
| Robustesse au temps (pas de données volatiles)   |      |
| Lisibilité (structure, bullets)                  |      |
| Conformité Anthropic globale                     |      |

Tout score ≤ C est un angle mort à corriger dans la phase d'application.

### Phase 2 — Plan de refactor

Produire un **plan en sections** :

```
## Plan d'optimisation `CLAUDE.md`

### Métriques
- Avant : X lignes / Y KB
- Objectif : ≤ 180 lignes / ≤ 15 KB
- Réduction visée : Z %

### Actions
1. KEEP : <sections critiques, liste>
2. COMPACT : <sections à réécrire>
3. MOVE TO SKILL : <sections → fichier cible>
4. MOVE TO RULE : <sections → fichier cible>
5. MOVE TO IMPORT : <sections → fichier importé>
6. MOVE TO COMMAND : <sections → fichier cible>
7. DELETE : <sections à supprimer>

### Imports ajoutés (si applicable)
- `@docs/rules/<file>.md`
- `@docs/guides/<file>.md`

### Fichiers créés
- `.claude/skills/<name>/SKILL.md`
- `.claude/rules/<topic>.md`
- ...

### Risques résiduels
- <risque, mitigation>
```

### Phase 3 — Validation utilisateur (obligatoire)

Présenter le plan complet. **Ne rien modifier tant que l'utilisateur n'a pas validé**. Demander :

- Confirmer le plan global ?
- Modifications à apporter ?
- Lancer l'application (`--apply`) ?

### Phase 4 — Application (uniquement si `--apply`)

#### Étape 4.1 — Sauvegarder

```bash
cp CLAUDE.md CLAUDE.md.backup-$(date +%Y%m%d-%H%M%S)
```

#### Étape 4.2 — Créer les fichiers cibles

Pour chaque "MOVE TO …", créer le fichier de destination en respectant :

- **Skills** : frontmatter avec `name` + `description` ; structure procédurale.
- **Rules** : frontmatter avec `paths:` si scoped ; markdown standard.
- **Commands** : structure observable dans `.claude/commands/commit.md` / `create-doc.md`.
- **Imports** : markdown standard, ré-utilisable.

#### Étape 4.3 — Réécrire `CLAUDE.md`

Structure recommandée du nouveau `CLAUDE.md` :

```markdown
# <Project> — CLAUDE.md

Project at a glance: <1 phrase>.

## Project overview
<2-5 bullets : type d'app, contraintes invariantes, stack>

## Build & Test
<commandes bash exactes>

## Code style
<règles non-évidentes, en bullets>

## Architecture invariants
<3-7 bullets vrais "do not violate">

## Workflows
- /commit — <1 ligne>
- /create-doc — <1 ligne>
- /optimize-claude-md — <1 ligne>
- /spec-* — <1 ligne>

## Repository etiquette
<branches, PRs, naming>

## Gotchas / non-obvious
<bullets>

## Imports (loaded into context)
@docs/rules/DOCUMENTATION-AUTHORING-RULES.md
@docs/guides/<critical-guide>.md

## Detailed references (NOT loaded — pull on demand)
- Architecture detailed : `/docs/initial-doc/00-ARCHITECTURE.md`
- API contracts : `/docs/initial-doc/00-API-CONTRACTS.md`
- Storage layout : `/docs/reference/STORAGE.md`
- Endpoints : `/docs/reference/API-ENDPOINTS.md`
```

Règle d'or pour la réécriture :

> Chaque ligne ajoutée doit passer le test : *« Would removing this cause Claude to make mistakes? »*. Sinon, elle est coupée.

#### Étape 4.4 — Vérifier la taille finale

```bash
wc -l CLAUDE.md
wc -c CLAUDE.md
```

Confirmer que la cible est atteinte. Sinon, second passage de compaction.

#### Étape 4.5 — Linter / validateur

- Toutes les imports `@path/to/file.md` doivent pointer vers des fichiers existants.
- Pas de mention "Claude / IA / Copilot" dans le contenu fonctionnel.
- Pas de TBD, pas d'estimations de temps.
- Frontmatter absent (CLAUDE.md n'en utilise pas).
- Pas de blocs de code > 30 lignes (les déporter vers un fichier importé).

### Phase 5 — Rapport final

```
✓ CLAUDE.md optimisé
  Avant : 494 lignes / 20 KB
  Après : 178 lignes / 9 KB
  Réduction : 64%

Fichiers créés :
  ✓ .claude/skills/spec-workflow/SKILL.md
  ✓ .claude/rules/backend.md (paths: backend/**/*.py)
  ✓ .claude/rules/frontend.md (paths: frontend/**/*.tsx)

Backups :
  ✓ CLAUDE.md.backup-20260517-141253

Imports actifs :
  @docs/rules/DOCUMENTATION-AUTHORING-RULES.md
  @docs/guides/ARTICLE-ANALYSIS-WORKFLOW.md
```

---

## Règles strictes — DO

- Lire l'intégralité du `CLAUDE.md` avant d'agir.
- Mesurer **avant** et **après** (lignes + KB).
- Toujours présenter le plan **avant** d'appliquer (sauf `--apply` explicite).
- Sauvegarder `CLAUDE.md.backup-<timestamp>` avant toute modification.
- Cibler **180 lignes / 15 KB** par défaut (sous la limite officielle 200/25).
- Utiliser des bullets concrets et vérifiables.
- Pousser les workflows multi-étapes vers **skills**.
- Pousser les règles file-scoped vers **rules** avec `paths:`.
- Pousser la doc longue vers des **imports** `@path/to/file.md`.
- Conserver l'ordre logique : Project → Build → Style → Architecture → Workflows → Repo → Gotchas → Imports → References.

## Règles strictes — DON'T

- Ne jamais modifier `CLAUDE.md` sans validation utilisateur (sauf `--apply` explicite).
- Ne jamais supprimer une règle critique sans alternative (skill / rule / hook).
- Ne jamais inventer un contenu : si on ignore le sens d'une section, demander.
- Ne jamais introduire de mention "Claude / IA / Copilot" dans le contenu fonctionnel.
- Ne jamais générer de paragraphes denses : préférer bullets.
- Ne jamais dupliquer ce qui est déjà dans le system prompt par défaut (output formatting, tool use, memory instructions).
- Ne jamais documenter file-by-file le codebase (laisser Claude lire).
- Ne jamais inclure des estimations de temps.
- Ne jamais dépasser 200 lignes après optimisation (relancer une passe si > 200).

---

## Pourquoi ces cibles

| Cible              | Source officielle Anthropic                                                |
| ------------------ | -------------------------------------------------------------------------- |
| ≤ 200 lignes       | « target under 200 lines per CLAUDE.md file » (doc memory)                 |
| ≤ 25 KB            | Charge première session = 200 lignes ou 25 KB, whichever first             |
| Bullets > prose    | « Claude scans structure the same way readers do » (doc memory)            |
| Skills > workflows | « Use skills for workflows only relevant sometimes » (best practices)      |
| Rules path-scoped  | « Rules scoped to specific files only apply when working with them »       |
| Imports `@…`       | « CLAUDE.md files can import additional files using `@path/to/import` »    |

---

## Référence : checklist finale avant commit

```
- [ ] ≤ 200 lignes visibles dans CLAUDE.md (idéalement 80-180)
- [ ] ≤ 25 KB visibles
- [ ] **Coût effectif (CLAUDE.md + imports auto-chargés) ≤ 250 lignes**
- [ ] Aucun import @ ne pointe vers un fichier > 300 lignes (sinon → skill ou lien)
- [ ] Toutes les sections passent le test « Would removing this cause Claude to make mistakes? »
- [ ] Pas de section dupliquant un system prompt natif
- [ ] Section `## Repository etiquette` présente (branche, commit conventions)
- [ ] Section ou bullets sur le venv Python + version
- [ ] Section `## Gotchas` si scripts `repro_*` existent dans le repo
- [ ] Aucune donnée chiffrée volatile (best skill %, branch active dans le contenu, etc.)
- [ ] Invariants critiques présents dans une seule source de vérité (CLAUDE.md OU 00-ARCHITECTURE.md, pas les deux)
- [ ] Section "Detailed references" préfixée `(read on demand, NOT auto-loaded)`
- [ ] Workflows multi-étapes → skills
- [ ] Règles file-scoped → rules avec `paths:` (et mécanisme vérifié comme natif)
- [ ] Doc longue rarement utile → lien, pas import `@`
- [ ] Aucun TBD, aucune estimation de temps
- [ ] Aucune mention "Claude / IA / Copilot" dans le contenu fonctionnel
- [ ] Aucun fichier `*.backup` / `*.v3-backup` dans `.claude/`
- [ ] Imports pointent vers des fichiers existants
- [ ] Backup créé : CLAUDE.md.backup-<timestamp>
- [ ] Rapport final affiché (avant/après visible + avant/après effectif)
```

---

**Source de vérité** : [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) + [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices).
**Aucun écart à ces recommandations n'est autorisé sans justification explicite par l'utilisateur.**
