# Documentation projet - section-factory

## 1. Objectif du projet

section-factory est un generateur de sections Shopify base sur OpenAI.
Le projet construit un prompt (avec regles Shopify + regles design optionnelles), appelle le modele, valide le code retourne, puis ecrit un fichier .liquid dans output/sections.

## 2. Initialisation et structure

Les elements de base ont ete crees:

- Dossier .vscode avec mcp.json
- Fichier agent.md
- Point d entree TypeScript
- Core modules pour generation, validation et ecriture disque
- Module prompts pour chaque type de section

Arborescence principale:

- src/index.ts
- src/cli/generateSection.ts
- src/core/sectionGenerator.ts
- src/core/sectionValidator.ts
- src/core/sectionBuilder.ts
- src/core/designSystemInjector.ts
- src/core/designSystemValidator.ts
- src/prompts/\*

## 3. Configuration Node et TypeScript

package.json:

- dependances: openai, dotenv, fs-extra
- devDependencies: typescript, tsx, @types/node, @types/fs-extra, vitest
- scripts:
  - dev: tsx src/index.ts
  - generate: tsx src/cli/generateSection.ts
  - build: tsc
  - start: node dist/index.js
  - test: vitest run
  - test:unit: vitest run
  - test:watch: vitest

tsconfig.json:

- target: ES2022
- module: commonjs
- rootDir: src
- outDir: dist
- strict: true

## 4. Point d entree application

src/index.ts:

- charge dotenv
- exporte startFactory()
- log de demarrage: Section Factory started
- commande CLI --list-sections
  - lit getEnabledSectionTypes() depuis le registre central
  - affiche id, label, category, description
  - stoppe proprement le flux apres affichage

## 4.1 Registre central des types de sections

src/core/section-types/registry.ts expose:

- SectionTypeId (union litterale)
- SectionTypeDefinition
- SECTION_TYPE_REGISTRY (source unique de verite)
- helpers:
  - getAllSectionTypes()
  - getEnabledSectionTypes()
  - getSectionTypeById(id)
  - isKnownSectionType(id)
  - getSectionTypeIds()
  - getSectionTypesByCategory(category)

Types actuellement declares dans le registre:

- hero
- faq
- testimonials
- product-grid
- rich-text
- image-banner

## 4.2 Validation design (strict/non-strict)

src/core/validation/designValidator.ts:

- expose ValidationMode, ValidationIssue, ValidationResult, SectionInput
- expose validateSection(section, mode)
- depend du registre central via isKnownSectionType
- ne contient plus de liste locale de types en dur
- fichier renomme de deignvalidator.ts vers designValidator.ts

## 5. Generation IA

src/core/sectionGenerator.ts expose generateSection(prompt):

- verifie prompt non vide
- verifie OPENAI_API_KEY
- appelle OpenAI Responses API
- modele par defaut: gpt-4.1-mini (surchargable par OPENAI_MODEL)
- retourne output_text
- gere les erreurs API et les cas de reponse vide

## 6. Prompting Shopify

### 6.1 Prompt de base

src/prompts/basePrompt.ts:

- impose generation complete d une section (HTML, Liquid, CSS, JS, schema)
- impose independance de la section
- impose scope CSS sur .section-{{ section.id }}
- impose JS scope a la section
- interdit sortie hors code final

### 6.2 Regles Shopify

src/prompts/shopifyRules.ts:

- rappel des regles critiques Shopify/Liquid
- bloc de texte injecte dans les prompts

### 6.3 Prompts par type

Types deja couverts par un builder dedie:

- hero
- featured-product
- product-grid
- testimonials
- faq
- logo-cloud
- image-with-text
- newsletter
- promo-banner
- trust-badges
- before-after
- comparison-table

Fichiers:

- src/prompts/heroPrompt.ts
- src/prompts/featuredProductPrompt.ts
- src/prompts/productGridPrompt.ts
- src/prompts/testimonialsPrompt.ts
- src/prompts/faqPrompt.ts
- src/prompts/logoCloudPrompt.ts
- src/prompts/imageWithTextPrompt.ts
- src/prompts/newsletterPrompt.ts
- src/prompts/promoBannerPrompt.ts
- src/prompts/trustBadgesPrompt.ts
- src/prompts/beforeAfterPrompt.ts
- src/prompts/comparisonTablePrompt.ts

## 7. Design System Injector

### 7.1 Profils

src/prompts/designSystemProfiles.ts definit 6 profils:

- minimal
- luxury
- editorial
- conversion
- playful
- tech

Chaque profil contient:

- visual tokens
- layout rules
- typography rules
- spacing rules
- button rules
- animation rules
- responsive conventions
- global style

### 7.2 Injection

src/core/designSystemInjector.ts:

- option enabled
- option profile
- insertion des regles design dans le prompt de base
- prevention de double injection via marker

src/prompts/designSystemRules.ts:

- transforme un profil en bloc de regles prompt

### 7.3 Validation design

src/core/designSystemValidator.ts verifie notamment:

- presence d un bloc CSS
- presence de @media
- presence de transition/animation
- presence de tokens CSS custom properties
- style bouton scope sous .section-{{ section.id }}

## 8. Validation Shopify renforcee

src/core/sectionValidator.ts retourne:

- isValid
- errors[]

Controles couverts:

- schema present ({% schema %} ... {% endschema %})
- schema JSON valide
- schema avec name, settings, blocks, presets
- detection section non configurable (settings et blocks vides)
- detection JS global (document._, window._, addEventListener global)
- detection CSS global hors scope .section-{{ section.id }}
- verification section.id dans CSS
- verification scope .section-{{ section.id }}
- heuristiques UX mobile (media queries, grilles multi-colonnes sans override, largeurs fixes)
- heuristiques de complexite (taille, volume HTML/CSS/JS)
- fusion optionnelle avec validation design si designSystemEnabled

## 8.1 Retry intelligent de correction

Un module dedie a ete ajoute pour corriger automatiquement une section invalide via l IA:

- src/generator/retryGenerator.ts

Ce module expose:

- retryGenerateSection(params)
- buildRetryPrompt(...)
- interfaces de contrat (params, result, attempt, client IA)

Comportement:

- construit un prompt de correction structure a partir des erreurs de validation
- tente plusieurs corrections jusqu a maxRetries
- valide chaque candidat
- arrete au premier code valide
- garde un historique complet des tentatives
- gere les reponses vides et exceptions IA

## 9. Ecriture disque

src/core/sectionBuilder.ts:

- dossier de sortie fixe: output/sections
- creation automatique du dossier
- normalisation du nom de fichier depuis le sectionType
- extension .liquid

## 10. CLI de generation

src/cli/generateSection.ts pipeline:

1. parse arguments

- support `--strict` (defaut: non-strict)

2. resolve type de section (+ alias)
3. build prompt selon type
4. injection design system optionnelle
5. appel OpenAI
6. validation section
7. retry intelligent en cas d echec de validation
8. ecriture fichier uniquement si version valide

src/cli/validateSection.ts pipeline:

1. parse arguments validate
2. lecture du fichier section cible
3. validation section sans generation IA
4. application du mode strict/non-strict sur la severite des diagnostics
5. emission d un rapport text ou json versionne
6. code de sortie deterministe (0 valide, 1 invalide, 2 erreur usage/lecture)

src/cli/doctor.ts pipeline:

1. parse arguments doctor

- support `--format text|json`

2. verification presence OPENAI_API_KEY
3. verification acces modele OpenAI
4. verification dossiers output et output/sections
5. verification version Node (>= 20)
6. verification fichiers de config attendus
7. emission d un rapport de sante
8. code de sortie deterministe (0 sain, 1 checks en echec, 2 erreur usage)

Le rapport validate inclut un mapping `ruleId` fin pour faciliter l outillage et preparer la transition AST.
Exemples de ruleId:

- structure.empty_section
- schema.missing_tags
- schema.invalid_json
- schema.name_required
- schema.not_configurable
- css.global_selector
- js.global_document_access
- ux.mobile_missing_media_rules
- ux.mobile_fixed_large_widths
- ux.mobile_grid_missing_max_width_override
- design_system.tokens_required

Mise a jour recente pour testabilite CLI:

- extraction du mapping alias dans src/cli/sectionTypeMapping.ts
- export de runCli(argv, deps) pour tests d integration
- conservation du comportement runtime via execution conditionnelle (require.main)
- integration du retry via src/generator/retryGenerator.ts
- mapping des erreurs validator vers le format RetryValidationIssue

### 10.1 Types supportes

- hero
- featured-product
- product-grid
- testimonials
- faq
- logo-cloud
- image-with-text
- newsletter
- promo-banner
- trust-badges
- before-after
- comparison-table

Alias compatibilite:

- features -> product-grid

### 10.2 Options CLI design system

- --design-system
- --profile <minimal|luxury|editorial|conversion|playful|tech>

Si --profile est fourni, le design system est active automatiquement.

### 10.3 Options CLI retry

- --max-retries <nombre>
- --max-retries=<nombre>

Valeur par defaut:

- 2 tentatives de correction

Comportement:

- si validation initiale invalide et max-retries > 0:
  - lancement du retry intelligent
- si aucune correction valide n est trouvee:
  - la section n est pas exportee
  - la commande retourne un code de sortie 1

### 10.4 Contraintes du mode strict (generation)

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

## 11. Commandes utiles

- npm run dev
- npm run build
- npm run test
- npm run test:unit
- npm run test:watch
- npm run generate -- hero
- npm run generate -- hero --strict
- npm run generate -- featured-product
- npm run generate -- product-grid --design-system --profile luxury
- npm run validate -- output/sections/hero.liquid
- npm run validate -- output/sections/hero.liquid --strict
- npm run validate -- output/sections/hero.liquid --non-strict
- npm run validate -- output/sections/hero.liquid --format=json
- npm run doctor
- npm run list-sections
- npm run dev -- --list-profiles

## 12. Etat actuel et blocages connus

Ce qui est valide:

- build TypeScript passe
- mapping de types CLI en place
- alias features actif
- validations Shopify + design operationnelles
- registre central des types en place
- tests unitaires et tests d integration CLI en place
- CI active avec tests puis build
- retry intelligent branche dans la CLI de generation

Blocage principal pour generation reelle:

- OPENAI_API_KEY doit etre defini dans l environnement (ou .env)

## 13. Prochaines evolutions recommandees

- ajouter des fixtures .liquid pour renforcer les tests d integration CLI
- ajouter des tests d integration de bout en bout (generation + validation + ecriture)
- preparer le branchement d un moteur AST sous le meme contrat de rapport versionne

Evolutions deja implementees:

- commande --list-sections ajoutee
- commande --list-profiles ajoutee
- commande validate ajoutee pour separer generation et validation
- mode strict/non-strict ajoute a validate
- rapport validate JSON versionne (reportVersion et reportSchemaVersion)
- mapping ruleId fin ajoute a validate (schema, css, js, mobile, design_system)
- commande doctor ajoutee pour verifier la sante de l environnement
- tests unitaires ajoutes pour:
  - mapping des types CLI
  - registre central des types
  - validation design (strict/non-strict)
  - validation Shopify (sectionValidator)
- tests d integration CLI ajoutes pour:
  - alias features -> product-grid
  - type par defaut hero
  - activation design system via --profile
  - gestion des erreurs validation/type/profil
  - retry reussi apres un premier echec de validation

## 14. Journal des modifications realisees dans cette conversation

Ce qui a ete implemente de bout en bout:

1. Creation d un validator design initial

- creation initiale de src/core/deignvalidator.ts

2. Mise en place du registre central des types

- creation de src/core/section-types/registry.ts
- ajout du modele de type et des helpers de consultation

3. Refactor du validator design vers le registre central

- import de isKnownSectionType dans src/core/validation/designValidator.ts
- suppression de la constante locale SECTION_TYPES et du helper local associe

4. Correction de nommage du validator design

- renommage du fichier:
  - src/core/validation/deignvalidator.ts
  - vers src/core/validation/designValidator.ts

5. Ajout de la commande CLI --list-types

- mise a jour de src/index.ts avec:
  - hasArg(flag)
  - handleListTypesCommand()
  - affichage aligne id/label/category + description

6. Ajout de la commande CLI --list-profiles

- mise a jour de src/index.ts avec:
  - handleListProfilesCommand()
  - affichage des profils disponibles
  - resume globalStyle par profil
  - marquage du profil par defaut

7. Mise en place des tests unitaires

- installation de vitest
- ajout des scripts npm test, test:unit, test:watch
- creation de:
  - tests/unit/registry.test.ts
  - tests/unit/designValidator.test.ts
  - tests/unit/sectionTypeMapping.test.ts
  - tests/unit/sectionValidator.test.ts

8. Mise en place CI minimale puis renforcement

- creation de .github/workflows/ci.yml
- execution sur push main et pull_request
- etapes:
  - npm ci
  - npm run test:unit
  - npm run build

9. Documentation equipe

- creation de README.md (version equipe en francais)
- creation de ARCHITECTURE.md
- ajout des templates collaboration:
  - .github/pull_request_template.md
  - .github/commit-message-template.txt

10. Tests d integration CLI

- refactor testable de src/cli/generateSection.ts via runCli + injection deps
- creation de tests/integration/generateSection.cli.integration.test.ts
- couverture des cas critiques de parsing/options/erreurs

11. Integration du module retry dans la CLI

- creation de src/generator/retryGenerator.ts
- integration dans src/cli/generateSection.ts apres echec de validation initiale
- ajout de l option --max-retries (et --max-retries=n)
- ajout d un test dedie au cas retry reussi

12. Etat de validation des tests

- suite vitest verte
- 10 fichiers de tests
- 63 tests passes
