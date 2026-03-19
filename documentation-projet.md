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
- devDependencies: typescript, tsx, @types/node, @types/fs-extra
- scripts:
  - dev: tsx src/index.ts
  - generate: tsx src/cli/generateSection.ts
  - build: tsc
  - start: node dist/index.js

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

## 9. Ecriture disque

src/core/sectionBuilder.ts:

- dossier de sortie fixe: output/sections
- creation automatique du dossier
- normalisation du nom de fichier depuis le sectionType
- extension .liquid

## 10. CLI de generation

src/cli/generateSection.ts pipeline:

1. parse arguments
2. resolve type de section (+ alias)
3. build prompt selon type
4. injection design system optionnelle
5. appel OpenAI
6. validation section
7. ecriture fichier

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

## 11. Commandes utiles

- npm run dev
- npm run build
- npm run generate -- hero
- npm run generate -- featured-product
- npm run generate -- product-grid --design-system --profile luxury

## 12. Etat actuel et blocages connus

Ce qui est valide:

- build TypeScript passe
- mapping de types CLI en place
- alias features actif
- validations Shopify + design operationnelles

Blocage principal pour generation reelle:

- OPENAI_API_KEY doit etre defini dans l environnement (ou .env)

## 13. Prochaines evolutions recommandees

- ajouter une commande --list-types
- ajouter tests unitaires pour mapping des types et validation
- ajouter tests d integration CLI avec fixtures de sections
- definir un mode strict/non-strict pour la validation design
