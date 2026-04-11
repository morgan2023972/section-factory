# Documentation projet - section-factory

Date de mise a jour: 2026-04-11

## 1. Resume

section-factory est un projet TypeScript qui genere des sections Shopify via OpenAI, puis valide ces sections avant ecriture disque.
Le depot contient aussi un sous-projet MCP dedie a la documentation Shopify.

Objectifs principaux:

- standardiser la generation de sections
- centraliser les types de sections supportes
- securiser la qualite via validation et retry
- fournir une CLI testable et outillable

## 2. Vue d ensemble du depot

Racine principale:

- src/: code applicatif principal
- tests/: tests unitaires et integration CLI
- output/sections/: sortie des fichiers .liquid
- docs/releases/: notes de version
- MCP-doc-shopify/: serveur MCP annexe (docs Shopify)

Fichiers de gouvernance:

- README.md: guide equipe et commandes
- ARCHITECTURE.md: architecture technique
- vitest.config.ts: configuration coverage
- package.json: scripts et dependances

## 3. Stack technique

Projet principal:

- Node.js >= 20
- TypeScript
- OpenAI SDK
- dotenv
- fs-extra
- Vitest

Sous-projet MCP-doc-shopify:

- TypeScript (module ESM)
- @modelcontextprotocol/sdk
- zod

## 4. Commandes du projet principal

Depuis la racine du depot:

- npm run dev
- npm run list-sections
- npm run generate -- <section-type> [options]
- npm run optimize -- <file-path> [options]
- npm run repair -- <file-path> [options]
- npm run validate -- <file-path> [options]
- npm run doctor -- [options]
- npm run build
- npm run test
- npm run test:unit
- npm run test:watch
- npm run coverage

Commandes de discovery via src/index.ts:

- npm run list-sections
- npm run dev -- --list-profiles
- npm run dev -- --list-types (compatibilite legacy, deprecie, suppression prevue dans 2 releases)
- npm run dev -- --show-ast-policy (diagnostic runtime des politiques AST)

## 5. Entree CLI et flux

### 5.1 src/index.ts

Responsabilites:

- charge dotenv
- gere les commandes de discovery
- expose startFactory(argv)

Commandes detectees:

- --list-sections
- --list-types (legacy, deprecie, suppression prevue dans 2 releases)
- --list-profiles
- --show-ast-policy

Sans argument de discovery, la commande affiche: Section Factory started

### 5.2 src/cli/generateSection.ts

Pipeline:

1. parse des options
2. resolution du type (avec alias)
3. construction du prompt par type
4. appel OpenAI
5. validation du code genere
6. retry intelligent si erreurs bloquantes
7. ecriture disque si code valide

Options:

- --design-system
- --profile <name> ou --profile=<name>
- --max-retries <n> ou --max-retries=<n>
- --strict
- --non-strict

Valeurs par defaut:

- sectionType: hero (si non fourni)
- maxRetries: 2
- validationMode: non-strict

Code de sortie:

- 0: succes
- 1: echec generation/validation

### 5.3 src/cli/validateSection.ts

Pipeline:

1. parse des options
2. lecture du fichier .liquid cible
3. validation Shopify (et design system optionnel)
4. mapping vers diagnostics structures
5. emission text ou JSON

Options:

- --design-system
- --profile <name> ou --profile=<name>
- --mode <strict|non-strict> ou --mode=<...>
- --strict (raccourci)
- --non-strict (raccourci)
- --ast-validate (active AST-light en advisory)
- --ast-phase <off|advisory|warn|block> ou --ast-phase=<...>
- --format <text|json> ou --format=<...>
- --help

Valeurs par defaut:

- mode: strict
- format: text
- astValidationPhase: off

Codes de sortie:

- 0: valide
- 1: invalide
- 2: erreur parsing CLI ou lecture fichier

### 5.4 src/cli/optimizeSection.ts

Pipeline:

1. parse des options
2. lecture du fichier .liquid cible
3. execution sectionOptimizer (cleanup/minify/patterns/safety)
4. rapport text ou JSON
5. ecriture optionnelle uniquement avec --write

Options:

- --cleanup
- --patterns
- --minify
- --safety
- --size-threshold <n> ou --size-threshold=<n>
- --write
- --output <path> ou --output=<path>
- --format <text|json> ou --format=<...>
- --help

Valeurs par defaut:

- mode: report-only (pas d ecriture)
- optimizer: cleanup + minify + patterns + safety actifs
- sizeGainThresholdPercent: 5
- format: text

Succes optimizer (criteres independants):

- axe taille: succes si gain >= seuil
- axe securite: succes si pattern risque supprime
- axe structure: succes si regle de conformite appliquee

Codes de sortie:

- 0: succes
- 1: issues safety severite high detectees
- 2: erreur parsing CLI ou IO

### 5.5 src/cli/doctor.ts

Checks executes:

- presence OPENAI_API_KEY
- acces modele OpenAI (Responses API)
- version Node >= 20
- presence des dossiers output et output/sections
- presence de fichiers critiques: package.json, tsconfig.json, README.md, .github/workflows/ci.yml

Options:

- --model <name> ou --model=<name>
- --format <text|json> ou --format=<...>
- --help

Valeurs par defaut:

- model: OPENAI_MODEL ou gpt-4.1-mini
- format: text

Codes de sortie:

- 0: environnement sain
- 1: checks en echec
- 2: erreur parsing CLI

Note implementation:

- le probe OpenAI utilise max_output_tokens=16 pour eviter un faux negatif d API sur des valeurs trop basses

### 5.6 src/cli/repairSection.ts

Pipeline:

1. parse des options
2. lecture du fichier .liquid cible
3. validation initiale
4. court-circuit si aucun issue bloquant n est detecte
5. lancement du moteur repair en mode non-strict sinon
6. ecriture optionnelle uniquement en cas de succes complet
7. emission d un rapport text ou JSON

Options:

- --write
- --output <path> ou --output=<path>
- --format <text|json> ou --format=<...>
- --max-retries <n> ou --max-retries=<n>
- --help

Valeurs par defaut:

- format: text
- maxRetries: 2
- mode repair: non-strict

Observabilite exposee:

- validation initiale OK/FAIL
- repair tente ou non
- resultat final utilise ou non
- amelioration detectee ou non

Codes de sortie:

- 0: section deja valide ou reparee
- 1: repair incomplet apres tentatives
- 2: erreur parsing CLI ou IO

Comportement reel actuel:

- corrige bien les balises schema manquantes ou incompletes
- corrige bien les desequilibres simples de controle Liquid
- corrige partiellement les schemas JSON invalides
- ne garantit pas une reparation semantique complete du CSS/JS

## 6. Coeur metier (src/core)

### 6.1 Registre des types de sections

Fichier: src/core/section-types/registry.ts

Source unique de verite:

- SectionTypeId (union litterale)
- SectionTypeDefinition
- SECTION_TYPE_REGISTRY
- helpers: getAllSectionTypes, getEnabledSectionTypes, getSectionTypeById, isKnownSectionType, getSectionTypeIds, getSectionTypesByCategory

Types actifs:

- before-after
- comparison-table
- featured-product
- image-with-text
- logo-cloud
- newsletter
- promo-banner
- trust-badges
- hero
- faq
- testimonials
- product-grid

### 6.2 Generation OpenAI

Fichier: src/core/sectionGenerator.ts

### 6.3 Module repair

Fichiers: src/core/repair/*

Structure:

- buildRepairPrompt.ts
- extractRepairedCode.ts
- applyLocalFixes.ts
- repairSection.ts
- types.ts

Responsabilites:

- construire un prompt de correction iteratif
- extraire proprement le code utile de la reponse modele
- appliquer quelques corrections deterministes sans refonte lourde
- conserver le meilleur candidat si la validite complete n est pas atteinte

Limites assumees:

- selection conservative du meilleur candidat
- pas de rewriter riche CSS/JS en local
- couverture comportementale privilegiee sur idealisation du resultat

## 11. Journal recent de mise a jour

Mise a jour 2026-04-11:

- ajout et stabilisation du module `repair`
- ajout du reporting leger de `repair` dans le CLI texte et JSON
- ajout de tests comportementaux par groupes (safety, amelioration, non-destruction, idempotence)
- factorisation des helpers de tests d integration repair dans `tests/integration/repairTestUtils.ts`

- appelle client.responses.create
- modele par defaut: gpt-4.1-mini
- retourne output_text (non vide)
- echoue explicitement si OPENAI_API_KEY manquant ou reponse vide

### 6.3 Ecriture disque

Fichier: src/core/sectionBuilder.ts

- ecrit dans output/sections
- normalise le nom de fichier
- cree le dossier si necessaire

### 6.4 sectionOptimizer (MVP assistant)

Fichiers:

- src/core/sectionOptimizer/index.ts
- src/core/sectionOptimizer/cleanup.ts
- src/core/sectionOptimizer/minifier.ts
- src/core/sectionOptimizer/patterns.ts
- src/core/sectionOptimizer/safetyAudit.ts

Principes:

- assistant d optimisation, pas de transformation pipeline generate par defaut
- rollback automatique si une optimisation cree une regression de validation
- rapport de succes par axe (taille / securite / structure), sans score global unique
- suggestions structurees pour:
  - proprete
  - reutilisabilite
  - legerete
  - securite cross-theme

### 6.5 Validation Shopify

Fichier: src/core/sectionValidator.ts

Verifications majeures:

- presence bloc schema
- JSON schema valide
- name/settings/blocks/presets valides
- section configurable (settings ou blocks non vides)
- interdiction JS global (document._, window._, addEventListener global)
- scoping CSS avec .section-{{ section.id }}
- rejection de selecteurs CSS globaux
- heuristiques mobile (media, largeurs fixes, grilles)
- seuil de complexite (taille code, volume HTML/CSS/JS)
- validation design system optionnelle
- diagnostics AST-light optionnels (selon phase)

### 6.6 Couche AST-light progressive

Fichiers:

- src/core/validation/ruleRouter.ts
- src/core/validation/astRuleConfig.ts
- src/core/validation/parsers/cssAst.ts
- src/core/validation/parsers/jsAst.ts
- src/core/validation/parsers/htmlAst.ts

Principes:

- mode par defaut: off (aucun impact comportemental)
- mode advisory/warn: diagnostics AST non bloquants
- mode block: seules les regles AST a confiance elevee deviennent bloquantes
- severite pilotable par ruleId et par phase via astRuleConfig.ts (off/warning/error/auto)
- surcharge runtime possible via JSON externe:
  - chemin par defaut: config/ast-rule-policies.json
  - variable d environnement: SECTION_FACTORY_AST_RULE_CONFIG

Diagnostic runtime:

- la commande --show-ast-policy affiche la politique AST effective reellement chargee
- sortie JSON incluant:
  - configPath
  - loadedFromEnv
  - envVar
  - ruleCount
  - policies

Sortie de validation:

- engine regex-v1 si AST desactive
- engine hybrid-v1 si AST active
- diagnostics regex (source shopify-validator-v1) et AST (source shopify-validator-ast-v1)

### 6.7 Validation design system

Fichier: src/core/designSystemValidator.ts

Regles:

- bloc <style> present
- presence @media
- presence transition/animation/@keyframes
- presence tokens CSS custom properties
- style bouton scope sous .section-{{ section.id }}

Contrat de sortie:

- isValid: booleen de validite globale
- issues: liste structuree `{ path, message }`
- errors: liste legacy (messages) derivee de `issues` pour compatibilite

Robustesse:

- le validator accepte une entree `unknown`
- aucune exception n est levee sur des entrees inattendues (null/undefined/mauvais type)

### 6.8 Injection design system

Fichier: src/core/designSystemInjector.ts

- active/desactive l injection de contraintes design dans les prompts
- fonctionne avec profils nommes

## 7. Couche prompts (src/prompts)

Elements clefs:

- basePrompt.ts: socle d instructions
- shopifyRules.ts: contraintes Shopify
- designSystemProfiles.ts: profils visuels
- designSystemRules.ts: regles generees depuis profils
- prompts par type: hero, faq, testimonials, product-grid, featured-product, image-with-text, logo-cloud, newsletter, promo-banner, trust-badges, before-after, comparison-table

Profils design disponibles:

- minimal (defaut)
- luxury
- editorial
- conversion
- playful
- tech

## 8. Retry intelligent

Fichier: src/generator/retryGenerator.ts

Role:

- construire un prompt de correction a partir des erreurs
- relancer la generation de correction jusqu a maxRetries
- valider chaque candidat
- retourner historique des tentatives

Dans la CLI generate:

- en strict: toutes les erreurs sont bloquantes
- en non-strict: certaines erreurs deviennent warnings en generation
  - Mobile UX issue:\*
  - Global CSS selectors are not allowed:\*
  - Global JS access via document.\* selectors is not allowed.
  - Global JS access is not allowed: scope JS to the section element.

## 9. Mapping alias et compatibilite

Fichier: src/cli/sectionTypeMapping.ts

Alias actifs:

- features -> product-grid

## 10. Qualite, tests et couverture

Configuration:

- vitest.config.ts active la coverage v8
- reporters: text, json, html, lcov
- repertoire de sortie: coverage/

Tests detects:

Unit:

- tests/unit/designValidator.test.ts
- tests/unit/designSystemValidator.test.ts
- tests/unit/doctor.cli.test.ts
- tests/unit/index.cli.test.ts
- tests/unit/optimizeSection.cli.test.ts
- tests/unit/registry.test.ts
- tests/unit/retryGenerator.test.ts
- tests/unit/sectionBuilder.test.ts
- tests/unit/sectionOptimizer.test.ts
- tests/unit/sectionGenerator.test.ts
- tests/unit/sectionTypeMapping.test.ts
- tests/unit/sectionValidator.test.ts
- tests/unit/validateSection.cli.test.ts

Integration:

- tests/integration/doctor.cli.integration.test.ts
- tests/integration/generateSection.cli.integration.test.ts
- tests/integration/optimizeSection.cli.integration.test.ts
- tests/integration/validateSection.cli.integration.test.ts

## 11. CI/CD

Workflow principal:

- .github/workflows/ci.yml

Comportement attendu:

- installation dependances
- execution tests
- verification build TypeScript

## 12. Sous-projet MCP-doc-shopify

Chemin: MCP-doc-shopify/

But:

- exposer des outils MCP pour la doc Shopify section

Outils exposes:

- get_section_rules
- get_schema_guide
- suggest_settings

Scripts:

- npm run dev
- npm run build
- npm run start

Points d attention:

- package-lock et node_modules locaux au sous-projet
- architecture separee du projet principal

## 13. Variables d environnement

Projet principal:

- OPENAI_API_KEY (obligatoire pour generate et doctor probe modele)
- OPENAI_MODEL (optionnel, defaut gpt-4.1-mini)

## 14. Etat de stabilite

Etat global observe:

- architecture modulaire coherente
- alignement registre/types/builders effectif
- validation stricte/non-stricte operationnelle
- retry de correction integre
- outillage CLI separant discovery, generation, validation, diagnostic
- suite de tests unitaires + integration presente

## 15. Prochaines evolutions recommandees

- ajouter des fixtures .liquid supplementaires pour des scenarios de validation plus larges
- expliciter un schema JSON de sortie pour validate et doctor en docs techniques
- ajouter des tests e2e complets avec mock OpenAI et workflow generation->validation->ecriture
- documenter l integration pratique entre section-factory et MCP-doc-shopify dans un guide unique

## 16. Journal de mise a jour (2026-04-01)

Contexte:

- objectif: augmenter la couverture de generation OpenAI et retry avec un plan en 3 commits, puis une passe complementaire pour fermer les branches restantes
- perimetre: tests unitaires + integration CLI generate

Actions executees:

1. analyse ciblee de `src/core/sectionGenerator.ts` et `src/generator/retryGenerator.ts`
2. plan d implementation detaille test-par-test valide
3. implementation en 3 commits atomiques:
   - `0f86a0e` test(core): add unit coverage for sectionGenerator OpenAI flow
   - `848cabf` test(generator): add retryGenerator unit tests for retry and prompt logic
   - `a2b978e` test(cli): extend generateSection integration for retry options
4. passe complementaire de couverture:
   - `71300b3` test(core,generator): add complementary branch coverage scenarios
5. push confirme sur GitHub pour le depot principal et le sous-projet MCP-doc-shopify

Fichiers de tests ajoutes/modifies:

- ajoute: `tests/unit/sectionGenerator.test.ts`
- ajoute: `tests/unit/retryGenerator.test.ts`
- modifie: `tests/integration/generateSection.cli.integration.test.ts`

Scenarios couverts (resume):

- sectionGenerator:
  - prompt vide
  - OPENAI_API_KEY manquante
  - fallback OPENAI_MODEL (`gpt-4.1-mini`)
  - OPENAI_MODEL explicite
  - trim output
  - output vide/absent
  - erreur provider Error
  - erreur provider non-Error
- retryGenerator:
  - prompt de retry compose correctement
  - fallback issue si liste vide
  - succes premier essai
  - succes apres plusieurs tentatives
  - reponse IA vide
  - exceptions generateCorrection (Error + non-Error)
  - normalisation issues malformees
  - validateCandidate sync et async
  - maxRetries invalide (fallback) et non-entier
  - seed initial currentCode/currentIssues
- integration CLI generate:
  - `--max-retries` applique
  - echec apres retries epuises avec restitution erreurs finales
  - `--max-retries 0` sans retry (echec immediat)

Resultats de validation:

- suite complete: 16 fichiers de tests, 116 tests passants
- couverture ciblee modules:
  - `src/core/sectionGenerator.ts`: 100% statements, 100% branches, 100% lines
  - `src/generator/retryGenerator.ts`: 100% statements, 96.66% branches, 100% lines
- couverture globale projet (apres changements):
  - 78.88% statements
  - 71.91% branches
  - 76.28% functions
  - 78.60% lines

## 17. Journal de mise a jour (2026-04-01 - designSystemValidator)

Contexte:

- objectif: ajouter une couverture unitaire minimale mais robuste pour le validator design system
- contrainte: peu de tests, forte valeur, non-fragiles, et comportement non-throw sur entrees inattendues

Actions executees:

1. ajout d une suite unitaire ciblee dans `tests/unit/designSystemValidator.test.ts`
2. hardening minimal de `src/core/designSystemValidator.ts` pour accepter `unknown`
3. structuration des erreurs avec `issues[]` (`path`, `message`) en gardant `errors[]` pour compatibilite

Couverture de scenarios:

- cas valide minimal
- cas valide complet
- null / undefined / mauvais type global
- objet vide
- au moins 2 regles requises manquantes
- au moins 2 patterns invalides
- verification du contrat de sortie (`isValid`, `issues`, `path`, `message`)
- robustesse: absence de throw sur entrees inattendues

Resultats de validation:

- nouveau fichier: `tests/unit/designSystemValidator.test.ts` (8 tests)
- suite complete: 17 fichiers, 127 tests passants
- couverture module `src/core/designSystemValidator.ts`: 100% statements, 100% branches, 100% lines

Commit associe:

- `a961547` test(core): add focused Vitest coverage for designSystemValidator

## 18. Journal de mise a jour (2026-04-01 - recalibrage validator et sectionBuilder)

Contexte:

- objectif: aligner strictement les tests designSystemValidator au comportement reel (validator CSS/string)
- objectif complementaire: ajouter une couverture unitaire a forte valeur pour sectionBuilder

Actions executees:

1. recalibrage de `tests/unit/designSystemValidator.test.ts` sur les cas reels:

- cas valide complet
- entree non-string
- absence de `<style>`
- absence de `@media`
- absence de motion
- absence de custom property CSS
- absence de bouton scope sous `.section-{{ section.id }}`
- contrat de sortie (`isValid`, `issues`, `errors`)
- alignement `errors` avec `issues.map(message)`

2. ajout de `tests/unit/sectionBuilder.test.ts` pour la logique I/O et nommage:

- normalisation du nom de fichier `.liquid`
- fallback sur `section.liquid` si nom vide apres sanitation
- rejection si code vide/whitespace/nullish
- chemin de sortie absolu et deterministe
- absence de fuite brute `[object Object]` dans le nom de sortie

Resultats de validation:

- tests designSystemValidator: 9/9 passants
- tests sectionBuilder: 8/8 passants
- suite complete: 18 fichiers, 136 tests passants
- couverture module `src/core/sectionBuilder.ts`: 100% statements, 100% branches, 100% lines

Commits associes:

- `f2e9f05` test(core): recalibrate designSystemValidator tests to actual css-validator behavior
- `77df6d9` test(core): add focused unit tests for sectionBuilder write behavior
