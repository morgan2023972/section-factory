# Documentation des changements - MCP Doc Shopify

## 1) Objectif de la migration

Faire evoluer le sous-projet `MCP-doc-shopify` d'un serveur MCP minimal base sur des donnees statiques vers un serveur documentaire Shopify modulaire, testable, et resilient, sans casser l'existant:

- meme entree runtime (`src/index.ts`, transport stdio)
- compatibilite des tools historiques
- ajout progressif de resources, pipeline local, search et adapters

## 2) Resultat global

La migration a ete executee de maniere incrementale jusqu'a la phase 6, avec validations a chaque etape:

- runtime MCP stable
- tools historiques conserves
- resources documentaires disponibles
- search local ajoute avec fallback
- adapters reutilisables hors runtime MCP
- module statique historique deprecie avec compatibilite API preservee

## 3) Changements par phase

### Phase 1 - Extraction provider/type

Objectif: sortir la logique documentaire des wrappers tools.

Ajouts:

- `src/catalog/types.ts`
- `src/catalog/provider.ts`

Effets:

- `getSectionRules`, `getSchemaGuide`, `suggestSettings` passent par `shopifyDocsProvider`
- typage strict des payloads rules/schema/settings

Fichiers impacts:

- `src/tools/getSectionRules.ts`
- `src/tools/getSchemaGuide.ts`
- `src/tools/suggestSettings.ts`

### Phase 2 - Resources MCP documentaires

Objectif: exposer de vrais resources URI en plus des tools.

Ajouts:

- `src/resources/guidesData.ts`
- `src/resources/readResourceByUri.ts`
- `src/resources/registerResources.ts`

Effets:

- resources guides en `shopify://guides/*`
- lecture par URI avec message propre en cas d'URI invalide
- coexistence tools + resources dans le meme serveur

Fichier impact:

- `src/index.ts` (enregistrement resources)

### Phase 3 - Pipeline docs Shopify + index local

Objectif: alimenter un index local offline-first.

Ajouts:

- `src/pipeline/types.ts`
- `src/pipeline/sourceCatalog.ts`
- `src/pipeline/paths.ts`
- `src/pipeline/fetchDocs.ts`
- `src/pipeline/normalizeDocs.ts`
- `src/pipeline/buildIndex.ts`
- `src/pipeline/readLocalIndex.ts`
- `src/catalog/localDocsIndex.ts`

Scripts npm ajoutes:

- `docs:fetch`
- `docs:normalize`
- `docs:build-index`
- `docs:pipeline`

Effets:

- fetch docs Shopify officielles
- normalisation en documents indexables
- index principal + snapshot de secours
- fallback propre si index absent

### Phase 4 - Tool de recherche locale

Objectif: fournir `search_shopify_docs` base sur l'index local.

Ajouts:

- `src/search/types.ts`
- `src/search/searchEngine.ts`
- `src/tools/searchShopifyDocs.ts`
- `src/search/searchEngine.test.ts`

Fichier impact:

- `src/index.ts` (enregistrement tool `search_shopify_docs`)

Script npm ajoute:

- `test:search`

Effets:

- scoring deterministic v1
- filtres thematiques
- snippets et structuredContent
- comportement robuste quand index vide

### Phase 5 - Adapters Section Factory (consumer-ready)

Objectif: rendre la connaissance documentaire reutilisable hors runtime MCP.

Ajouts:

- `src/adapters/types.ts`
- `src/adapters/toSectionFactoryPromptContext.ts`
- `src/adapters/toSectionFactoryValidationRules.ts`
- `src/adapters/index.ts`
- `src/adapters/adapters.test.ts`
- `src/integration/contracts.integration.test.ts`

Script npm ajoute:

- `test:adapters`
- `test:contracts`

Effets:

- production de `promptContext`
- production de `validation rules`
- mode fallback local (guides/docs absents) sans bloquer generation/validation
- tests de contrats MCP sur tools/fallback/search

Cote consumer (projet racine):

- ajout test opt-in: `tests/integration/consumerAdapters.optin.test.ts`
- ajout script racine: `test:consumer-optin`

### Phase 6 - Bascule finale et nettoyage progressif

Objectif: deprecier l'ancien module statique sans casser les imports existants.

Ajout:

- `src/catalog/staticCatalogData.ts`

Modifications:

- `src/catalog/provider.ts` lit maintenant `catalog/staticCatalogData.ts`
- `src/shopifyDocs.ts` devient un module de compatibilite (`@deprecated`) qui re-exporte les donnees

Effets:

- reduction de la redondance
- compatibilite API preservee
- contrat runtime inchangé

## 4) Changement runtime MCP

### Inchanges (contrat public)

- transport stdio
- point d'entree `src/index.ts`
- tools historiques:
  - `get_section_rules`
  - `get_schema_guide`
  - `suggest_settings_for_category`

### Ajouts

- resources guides `shopify://guides/*`
- tool `search_shopify_docs`

## 5) Robustesse et fallback verifies

- URI resource invalide: message propre avec liste des URI valides
- input invalide tools: rejection schema (ZodError)
- index absent: pas de crash, resultat vide explicite
- index principal absent mais snapshot present: lecture fallback snapshot
- adapters utilisables sans runtime MCP

## 6) Validation et tests executes

Sous-projet `MCP-doc-shopify`:

- `npm run build`
- `npm run test:contracts`
- `npm run test:adapters`
- `npm run test:search`

Projet racine:

- `npm run test:consumer-optin`

Tous ces controles ont ete executes avec succes sur l'etat final.

## 7) Fichiers de pilotage et suivi

- plan de migration: `MIGRATION_PLAN.md`
- synthese courte: `README.md`

## 8) Etat final

Le sous-projet `MCP-doc-shopify` est maintenant:

- modulaire (catalog/resources/pipeline/search/adapters)
- resilient (fallback index/snapshot + fallback adapters)
- compatible (tools historiques maintenus)
- teste (unit/integration/contracts + consumer opt-in)
