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

Un sous-projet annexe existe pour MCP Shopify:

- MCP-doc-shopify/
  - Serveur MCP dedie a des outils de documentation Shopify
  - Independant du runtime principal

## Structure des dossiers

- src/index.ts
  - Point d entree principal
  - Gere les commandes de discovery CLI (`--list-sections`, `--list-profiles`, `--show-ast-policy`)

- src/cli/
  - Scripts CLI specialises
  - `generateSection.ts`: generation + retry
  - `optimizeSection.ts`: assistant d optimisation (rapport-only par defaut)
  - `validateSection.ts`: validation seule (report text/json)
  - `doctor.ts`: checks environnement (env, modele, dossiers, config, runtime)

- src/core/
  - Logique metier principale
  - Validation, construction, generation, regles design

- src/core/sectionOptimizer/
  - Pipeline d optimisation MVP
  - Nettoyage, minification conservative, suggestions de reutilisabilite et audit cross-theme

- src/core/section-types/registry.ts
  - Registre central des types de sections
  - Source unique de verite pour les types connus/actifs

- src/core/validation/designValidator.ts
  - Validation des sections generees
  - Modes strict et non-strict
  - Depend du registre central (pas de liste locale)

- src/core/validation/ruleRouter.ts
  - Routeur de regles AST-light (phases: off, advisory, warn, block)
  - Agrege les diagnostics AST et determine les erreurs bloquantes

- src/core/validation/astRuleConfig.ts
  - Configuration des regles AST par phase et severite
  - Permet de regler warning/error/off/auto par ruleId sans modifier le routeur
  - Supporte la surcharge runtime via JSON externe et variable d environnement

- src/core/validation/parsers/
  - parseurs AST-light specialises:
  - cssAst.ts
  - jsAst.ts
  - htmlAst.ts

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
  - Affiche type, alias, description, design-system
- --list-types
  - Alias legacy de --list-sections
  - Deprecie: suppression prevue dans 2 releases
- --list-profiles
  - Lit les profils design system disponibles
  - Affiche profil + resume et profil par defaut
- --show-ast-policy
  - Affiche la politique AST effective chargee au runtime
  - Inclut chemin de config, source env, nombre de regles et politiques resolues

Fichier: src/cli/generateSection.ts

- Commande `npm run generate -- <type> [options]`
- Garde la responsabilite de generation IA et de retry
- Validation non-strict par defaut pendant la generation
- Supporte `--strict` pour rendre les regles de generation bloquantes

Fichier: src/cli/optimizeSection.ts

- Commande `npm run optimize -- <file> [options]`
- Mode par defaut: rapport uniquement (pas d ecriture disque)
- Supporte `--size-threshold` pour regler le seuil de succes taille
- Supporte `--write` et `--output` pour exporter le code optimise
- Retourne `0` (succes), `1` (issues safety high), `2` (erreur usage/IO)

Succes optimizer (par axe, non global):

- Taille: succes si le gain compression/cleanup est superieur ou egal au seuil configure
- Securite: succes si des patterns risques sont effectivement supprimes
- Structure: succes si au moins une regle de conformite est appliquee

Fichier: src/cli/validateSection.ts

- Commande `npm run validate -- <file> [options]`
- Valide un fichier section existant sans generation IA
- Supporte `--mode strict|non-strict` et `--format text|json`
- Supporte `--ast-validate` et `--ast-phase off|advisory|warn|block`
- Produit un rapport versionne (`reportVersion`, `reportSchemaVersion`)
- Retourne un moteur `regex-v1` (par defaut) ou `hybrid-v1` (si AST active)
- Retourne des diagnostics avec `ruleId` fins (regex + AST)
- Retourne `0` (valide), `1` (invalide), `2` (erreur usage/lecture)

Fichier: src/cli/doctor.ts

- Commande `npm run doctor`
- Supporte `--format text|json` pour sortie lisible ou machine-readable
- Verifie l'environnement local de generation/validation:
  - OPENAI_API_KEY
  - acces au modele OpenAI
  - dossiers output attendus
  - version Node compatible
  - presence des fichiers de config attendus
- Probe OpenAI via Responses API avec `max_output_tokens: 16`
- Retourne `0` (sain), `1` (checks en echec), `2` (erreur usage)

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
  - CLI validate (unit)
  - CLI doctor (unit)
  - Validator design
  - Validator Shopify

### Tests d integration

- CLI generate
- CLI validate
- CLI doctor

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
- Activation progressive AST-light pour limiter les faux positifs
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
