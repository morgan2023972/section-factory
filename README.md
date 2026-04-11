[![CI](https://github.com/morgan2023972/section-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/morgan2023972/section-factory/actions)
[![codecov](https://codecov.io/gh/morgan2023972/section-factory/branch/main/graph/badge.svg)](https://codecov.io/gh/morgan2023972/section-factory)

# Section Factory

Section Factory est un projet TypeScript pour générer et valider des sections Shopify avec une architecture claire, testable et extensible.

## Objectif du projet

- Centraliser la définition des types de sections supportés
- Garantir une validation cohérente en mode strict et non-strict
- Exposer des commandes CLI simples pour l'équipe
- Maintenir une base fiable grâce aux tests unitaires et à la CI

## Fonctionnalités actuelles

- Registre central des types de sections
- Validator de section branché sur le registre central
- Commande CLI --list-sections (commande dediee)
- Commande CLI --list-profiles
- Commande CLI validate dédiée (validation séparée de la génération)
- Commande CLI optimize dédiée (assistant d optimisation MVP)
- Critere de succes optimizer par axe (taille, securite, structure)
- Validation AST-light progressive sur la commande validate (off/advisory/warn/block)
- Configuration runtime des politiques AST via JSON externe (sans rebuild)
- Commande CLI de diagnostic des politiques AST effectives
- Commande CLI doctor pour vérifier la santé de l'environnement
- Mapping de diagnostics validate avec ruleId fins (schema, css, js, mobile, design_system)
- Tests unitaires avec Vitest
- Pipeline CI avec tests puis build

## Structure du projet

- src/core/section-types/registry.ts : source unique de vérité des types de sections
- src/core/validation/designValidator.ts : validation des sections
- src/index.ts : point d'entrée CLI
- tests/unit : tests unitaires
- .github/workflows/ci.yml : pipeline CI

## Prérequis

- Node.js 20 ou plus
- npm

## Installation

```bash
npm install
```

## Commandes utiles

Lancer le projet en dev :

```bash
npm run dev
```

Lister les sections disponibles (type, alias, description, support design-system) :

```bash
npm run list-sections
```

Compatibilite legacy :

```bash
npm run dev -- --list-types
```

Note: `--list-types` est deprecie et sera retire dans 2 releases. Utilisez `--list-sections`.

Lister les profils design disponibles :

```bash
npm run dev -- --list-profiles
```

Afficher la politique AST effective chargee au runtime :

```bash
npm run dev -- --show-ast-policy
```

Cette commande affiche un JSON de diagnostic avec:

- configPath (chemin effectivement resolu)
- loadedFromEnv (si la variable SECTION_FACTORY_AST_RULE_CONFIG est utilisee)
- envVar
- ruleCount
- policies (politique effective chargee)

Generer une section hero (validation non-strict par defaut) :

```bash
npm run generate -- hero
```

Forcer une generation avec validation stricte :

```bash
npm run generate -- hero --strict
```

Contraintes du mode strict (generation):

- CSS scope obligatoire sous `.section-{{ section.id }}`
- Aucun selecteur CSS global
- Si du JavaScript est present, il doit etre scope a la section
- Interdit: `document.querySelector`, `document.querySelectorAll`, `getElementById`, `getElementsByClassName`, `getElementsByTagName`, `window.*`, `addEventListener(...)` global
- Pattern JS recommande en strict:

```js
const root = document.currentScript?.closest(".section-{{ section.id }}");
if (!root) return;

const cta = root.querySelector(".section-{{ section.id }}__cta");
```

Valider une section existante sans génération :

```bash
npm run validate -- output/sections/hero.liquid
```

Reparer une section existante (sans ecriture par defaut) :

```bash
npm run repair -- output/sections/hero.liquid
```

Reparer puis ecrire le resultat en sortie :

```bash
npm run repair -- output/sections/hero.liquid --write --output output/sections/hero.repaired.liquid
```

Afficher le rapport de reparation en JSON :

```bash
npm run repair -- output/sections/hero.liquid --format=json
```

Augmenter le nombre maximal de tentatives de reparation :

```bash
npm run repair -- output/sections/hero.liquid --max-retries=4
```

Codes de sortie de `repair` :

- `0`: section valide ou reparée
- `1`: echec de reparation apres epuisement des tentatives
- `2`: erreur CLI (arguments, I/O, etc.)

Note: en V1, `--write` ecrit uniquement en cas de succes complet de reparation.

Observabilite legere de `repair`:

- validation initiale: `OK` ou `FAIL`
- repair tente: `yes` ou `no`
- resultat final utilise: `yes` ou `no`
- amelioration detectee: `yes` ou `no`

Le rapport texte affiche ces quatre lignes avant le resume de statut. Le rapport JSON ajoute un bloc `observability` avec les memes indicateurs.

Comportement reel actuel de `repair`:

- corrige bien les balises `schema` manquantes ou incompletes
- corrige bien les desequilibres simples `if` / `endif` et `for` / `endfor`
- corrige partiellement les schemas JSON invalides en selectionnant le meilleur candidat disponible
- ne reecrit pas agressivement la structure metier si la validation initiale est deja OK
- n assure pas a lui seul une correction semantique complete du HTML/CSS/JS

Optimiser une section existante (rapport uniquement par defaut) :

```bash
npm run optimize -- output/sections/hero.liquid
```

Exiger un gain taille minimum pour valider l axe compression/cleanup :

```bash
npm run optimize -- output/sections/hero.liquid --size-threshold=8
```

Optimiser puis ecrire la version optimisee dans un fichier de sortie :

```bash
npm run optimize -- output/sections/hero.liquid --write --output output/sections/hero.optimized.liquid
```

Le rapport optimize expose des criteres de succes independants:

- Taille: succes si gain >= seuil configure (`--size-threshold`, defaut 5)
- Securite: succes si le nombre de patterns risques diminue
- Structure: succes si au moins une regle de conformite est appliquee

Valider en mode non-strict (certaines règles deviennent des warnings) :

```bash
npm run validate -- output/sections/hero.liquid --non-strict
```

Valider avec sortie JSON (préparation CI/outillage) :

```bash
npm run validate -- output/sections/hero.liquid --format=json
```

Activer les diagnostics AST-light en advisory (non bloquants) :

```bash
npm run validate -- output/sections/hero.liquid --ast-validate
```

Choisir explicitement la phase AST :

```bash
npm run validate -- output/sections/hero.liquid --ast-phase=off
npm run validate -- output/sections/hero.liquid --ast-phase=advisory
npm run validate -- output/sections/hero.liquid --ast-phase=warn
npm run validate -- output/sections/hero.liquid --ast-phase=block
```

Vérifier l'environnement avec doctor :

```bash
npm run doctor
```

Vérifier l'environnement avec sortie JSON :

```bash
npm run doctor -- --format=json
```

Le doctor vérifie notamment:

- présence de OPENAI_API_KEY
- accès au modèle OpenAI configuré
- présence des dossiers output et output/sections
- compatibilité de la version Node (>= 20)
- présence de fichiers de config attendus (`package.json`, `tsconfig.json`, `README.md`, `.github/workflows/ci.yml`)

Le rapport JSON de doctor contient l'etat de sante (`isHealthy`), un resume (`summary`) et la liste des checks (`checks`).

Le rapport JSON versionne (`reportVersion: 2` et `reportSchemaVersion: "1.1.0"`) concerne la commande validate.

Exemple d'utilisation du mode design system avec diagnostics fins :

```bash
npm run validate -- output/sections/hero.liquid --design-system --format=json
```

Le rapport inclut des `ruleId` détaillés, par exemple :

- `schema.missing_tags`
- `css.global_selector`
- `js.global_document_access`
- `ux.mobile_missing_media_rules`
- `design_system.tokens_required`

Quand AST-light est activé, le rapport JSON passe en moteur `hybrid-v1` (sinon `regex-v1`) et ajoute des diagnostics AST (source `shopify-validator-ast-v1`).

Configuration runtime des politiques AST:

- Fichier par defaut: config/ast-rule-policies.json
- Variable d environnement optionnelle: SECTION_FACTORY_AST_RULE_CONFIG (chemin vers un JSON externe)
- Permet d ajuster les severites par `ruleId` et par phase (`advisory`, `warn`, `block`) sans rebuild TypeScript

Compiler le projet :

```bash
npm run build
```

Lancer les tests unitaires :

```bash
npm run test:unit
```

Lancer les tests en mode watch :

```bash
npm run test:watch
```

## Coverage

Generer le rapport de couverture de tests :

```bash
npm run coverage
```

Les rapports sont generes dans le dossier `coverage/` (text, json, html, lcov).

## Releases

- Derniere note: [v1.9.0](docs/releases/v1.9.0.md)
- Historique: [docs/releases](docs/releases)

## Workflow d'équipe

1. Créer une branche de travail depuis main
2. Développer une modification ciblée
3. Lancer localement : tests unitaires puis build
4. Ouvrir une Pull Request
5. Laisser la CI valider automatiquement le changement

## Qualité et conventions

- Toute nouvelle section doit être ajoutée dans le registre central
- Le validator ne doit pas contenir de liste locale des types
- Favoriser un code lisible, modulaire et testable
- Ajouter ou mettre à jour les tests pour toute règle métier modifiée

## CI minimale

Le workflow GitHub Actions s'exécute sur push vers main et sur pull request.

Étapes :

1. Installation des dépendances avec npm ci
2. Exécution des tests unitaires avec npm run test:unit
3. Vérification de compilation avec npm run build

## Checklist Pull Request

- Le code compile sans erreur
- Les tests unitaires passent
- Les changements de logique sont couverts par des tests
- Le README ou la documentation est mis à jour si nécessaire

## Templates équipe

- Template de Pull Request : .github/pull_request_template.md
- Template de message de commit : .github/commit-message-template.txt

Pour utiliser le template de commit en local :

1. git config commit.template .github/commit-message-template.txt

## Roadmap courte

- Enrichir la CLI pour lister les catégories de sections
- Ajouter des validations de compatibilité avancées
- Étendre la génération IA en s'appuyant sur le registre central
