# Architecture - Section Factory

## Objectif

Ce document decrit l architecture technique du projet Section Factory.
Il sert de reference equipe pour comprendre les modules, leurs responsabilites,
et les flux principaux (CLI, validation, tests, CI).

## Principes d architecture

- Source unique de verite pour les types de sections
- Separation claire entre logique metier, CLI et prompts
- Fonctions pures privilegiees pour faciliter les tests
- Evolutivite: ajouter des types, regles et generateurs sans casser l existant

## Vue d ensemble

Le projet est organise autour de 4 couches:

1. Entree CLI
2. Core metier
3. Prompts de generation
4. Qualite (tests + CI)

## Structure des dossiers

- src/index.ts
  - Point d entree principal
  - Gere les commandes de discovery CLI (`--list-sections`, `--list-profiles`)

- src/cli/
  - Scripts CLI specialises
  - `generateSection.ts`: generation + retry
  - `validateSection.ts`: validation seule (report text/json)
  - `doctor.ts`: checks environnement (env, modele, dossiers, config, runtime)

- src/core/
  - Logique metier principale
  - Validation, construction, generation, regles design

- src/core/section-types/registry.ts
  - Registre central des types de sections
  - Source unique de verite pour les types connus/actifs

- src/core/validation/designValidator.ts
  - Validation des sections generees
  - Modes strict et non-strict
  - Depend du registre central (pas de liste locale)

- src/prompts/
  - Prompts specialises par type de section
  - Regles Shopify et profils de design system

- tests/unit/
  - Tests unitaires du registre et du validator

- .github/workflows/ci.yml
  - Pipeline CI minimal: installation, tests, build

## Modules cles

### 1) Registre des types de sections

Fichier: src/core/section-types/registry.ts

Responsabilites:

- Declarer SectionTypeId
- Definir SectionTypeDefinition
- Exposer SECTION_TYPE_REGISTRY
- Exposer les helpers de consultation

Raison:

- Eviter les duplications de types dans le code
- Aligner CLI, validation et generation IA sur la meme base

## 2) Validator design

Fichier: src/core/validation/designValidator.ts

Responsabilites:

- Valider une section d entree
- Produire errors/warnings selon le mode
- Appliquer les regles critiques vs non critiques

Contrat public:

- validateSection(...)
- ValidationMode
- ValidationResult
- ValidationIssue
- SectionInput

## 3) CLI

Fichier: src/index.ts

Responsabilites:

- Parser process.argv
- Router les commandes
- Afficher des informations utilisateur lisibles

Commande implementee:

- --list-sections
  - Lit getEnabledSectionTypes() depuis le registre
  - Affiche id, label, category, description
- --list-profiles
  - Lit les profils design system disponibles
  - Affiche profil + resume et profil par defaut

Fichier: src/cli/generateSection.ts

- Commande `npm run generate -- <type> [options]`
- Garde la responsabilite de generation IA et de retry
- Validation non-strict par defaut pendant la generation
- Supporte `--strict` pour rendre les regles de generation bloquantes

Fichier: src/cli/validateSection.ts

- Commande `npm run validate -- <file> [options]`
- Valide un fichier section existant sans generation IA
- Supporte `--mode strict|non-strict` et `--format text|json`
- Produit un rapport versionne (`reportVersion`, `reportSchemaVersion`)
- Retourne des diagnostics avec `ruleId` fins pour preparer la migration AST

Fichier: src/cli/doctor.ts

- Commande `npm run doctor`
- Supporte `--format text|json` pour sortie lisible ou machine-readable
- Verifie l'environnement local de generation/validation:
  - OPENAI_API_KEY
  - acces au modele OpenAI
  - dossiers output attendus
  - version Node compatible
  - presence des fichiers de config attendus

## Flux principal (simplifie)

1. L utilisateur lance une commande CLI
2. Le point d entree detecte l argument
3. La logique metier appropriee est appelee
4. Les resultats sont affiches ou retournes

## Gestion de la qualite

### Tests unitaires

- Framework: Vitest
- Cibles actuelles:
  - Registre des types
  - CLI index (list-sections/list-profiles)
  - CLI generate (integration)
  - CLI validate (unit + integration)
  - Validator design
  - Validator Shopify

Scripts npm:

- npm run test:unit
- npm run test:watch

### Integration continue

Workflow: .github/workflows/ci.yml

Etapes:

1. npm ci
2. npm run test:unit
3. npm run build

## Decisions techniques

- TypeScript strict pour limiter les regressions
- Registre central pour les types supportes
- Validation dissociee de la CLI
- Tests unitaires orientes comportement

## Extension future recommandee

- Ajouter une couche de compatibilite schema/type
- Ajouter des categories de commandes CLI
- Ajouter des tests d integration CLI
- Introduire un contrat de plugin pour nouveaux types de sections

## Regles de contribution (resume)

- Toute nouvelle section doit etre ajoutee au registre central
- Toute regle metier modifiee doit etre testee
- Eviter les imports circulaires entre modules core
- Garder les fonctions pures quand possible
