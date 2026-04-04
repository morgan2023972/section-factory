# Documentation des changements - MCP Doc Shopify

## 1) Objectif de la migration

Faire evoluer le sous-projet `MCP-doc-shopify` d'un serveur MCP minimal base sur des donnees statiques vers un serveur documentaire Shopify modulaire, testable, et resilient, sans casser l'existant:

- meme entree runtime (`src/index.ts`, transport stdio)
- compatibilite des outils historiques
- ajout progressif de ressources, pipeline local, recherche et adaptateurs

## 2) Resultat global

La migration a ete executee de maniere incrementale jusqu'a la phase 8, avec validations a chaque etape:

- runtime MCP stable
- outils historiques conserves
- ressources documentaires disponibles
- recherche locale ajoutee avec fallback
- adaptateurs reutilisables hors runtime MCP
- module statique historique deprecie avec compatibilite API preservee
- plan de refonte validation verrouille avec ordre d'execution strict et regles decisionnelles explicites

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

### Phase 7 - Separation normative stricte (core-rule vs documentaire)

Objectif: eliminer toute contamination logique entre donnees documentaires normalisees et decisions critiques de validation.

Modifications principales:

- Renommage des champs documentaires (pipeline, search, adapters, tests):
  - keyRules -> ruleCandidates
  - schemaSignals -> schemaHints
  - summary -> documentSummary
- Creation de la couche metier `src/core/rules/`:
  - `src/core/rules/types.ts`
  - `src/core/rules/criticalRules.ts`
  - `src/core/rules/index.ts`
- Introduction d'un modele de diagnostic interne explicite:
  - `origin` (`core-rule` | `technical` | `documentary`)
  - `blocking`
  - `severity`
  - `message`
  - `sourceUrls`
  - `confidence` (documentary uniquement)
- Refactor du validateur en 4 etapes explicites dans `src/adapters/toSectionFactoryValidationRules.ts`:
  1. `collectCoreRuleDiagnostics`
  2. `collectTechnicalDiagnostics`
  3. `collectDocumentaryHints`
  4. `mergeDiagnosticsControlled`

Garanties de verrouillage appliquees:

- Les `core-rule` (`evaluate`) ne dependent jamais de `ruleCandidates`, `schemaHints`, `documentSummary`.
- Les diagnostics `documentary` sont forcement non bloquants.
- Les diagnostics `documentary` ne peuvent ni produire ni inverser un verdict critique.
- Les messages critiques (`core-rule`/`technical`) restent compréhensibles sans aide documentaire.

Tests renforces:

- `src/adapters/adapters.test.ts` couvre:
  - deprecation des anciens noms via fixtures migrees
  - fonctionnement critique sans doc normalisee
  - non-inversion du verdict critique par hint documentaire
  - lisibilite des messages critiques sans enrichissement documentaire
- `src/search/searchEngine.test.ts` migre vers `documentSummary`, `ruleCandidates`, `schemaHints`.

Migration des artefacts:

- Regeneration des donnees normalisees via `docs:normalize` et `docs:build-index`.
- Synchronisation du snapshot d'index pour supprimer les cles legacy dans les artefacts.

### Phase 8 - Validateur metier approfondi (phase 3 + durcissement 3.1)

Objectif: renforcer la qualite du signal metier, la precision des diagnostics et l'actionabilite des recommandations, sans changer l'architecture existante.

Modifications principales:

- Enrichissement de `ValidationRuleInput` en structure metier explicite:
  - `schema` (exists/isValid/errors)
  - `settings`, `blocks`, `presets` (exists/count)
  - `structuralWarnings`
- Introduction des `reason codes` comme type ferme et stable:
  - aucun code libre/dynamique
  - liste explicite et testee
- Enrichissement de `buildValidationRuleInput(...)`:
  - construction deterministe depuis signaux internes fiables
  - sanitization des counts
  - filtrage strict des reason codes autorises
  - compatibilite ascendante conservee avec champs legacy optionnels
- Core rules rendues multi-niveaux:
  - schema absent vs schema invalide (messages distincts)
  - gestion des raisons specifiques (ex `missing_blocks`)
  - diagnostics enrichis avec `reasons`
- Ajout d'une synthese interne de verdict:
  - `buildValidationResult(diagnostics)`
  - verdict base uniquement sur `core-rule + technical`
  - `documentary` reste non-bloquant/non-decisionnel
- Durcissement 3.1: mapping cible `reason code -> recommendation`
  - mapping centralise
  - recommandation finale plus precise quand des reasons sont presentes
  - fallback sur recommandation generique sinon

Fichiers impacts:

- `src/core/rules/types.ts`
- `src/core/rules/criticalRules.ts`
- `src/adapters/buildValidationRuleInput.ts`
- `src/adapters/types.ts`
- `src/adapters/toSectionFactoryValidationRules.ts`
- `src/adapters/adapters.test.ts`

Garanties conservees:

- aucune dependance core-rule vers `ruleCandidates`, `schemaHints`, `documentSummary`
- pipeline validation toujours en 4 phases
- payloads publics conserves (ajouts uniquement optionnels)
- documentaire strictement contextuel

Tests renforces:

- verification du signal enrichi
- verification des reasons specifiques (ex `missing_blocks`)
- verification du mapping reason -> recommandation ciblee
- verification de non-regression du verdict critique
- verification de non-inversion par hints documentaires

### Complements structurants de gouvernance (plan de refonte)

Objectif: verrouiller la conduite de la refonte validation pour eviter les regressions de semantique et de decision.

Points actives:

- Ordre d'execution strict du plan: mini-phase 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8.
- Mini-phase 4: obligation d'une table de reclassification des regles existantes avec colonnes minimales
  (`id_regle_actuelle`, `classification_actuelle`, `classification_cible`, `justification`, `impact_blocking`).
- Mini-phase 6: verrou de non-decision pour la guidance technique
  (`TechnicalGuidanceItem` sans `severity` ni `blocking`, et jamais implique dans le verdict).
- Mini-phase 7: regle stricte `inconclusive`
  (uniquement si limitation d'analyse a fort impact decisionnel ou champ de decision critique en `unknown`; un `unknown` non critique seul ne suffit jamais).

### Mini-phase 7/8 - Contrat report structure et facade legacy

Objectif: finaliser le modele central de sortie en `ValidationReport` tout en gardant une compatibilite descendante explicite.

Modifications principales:

- Ajout d'une facade adapter report-first:
  - `buildSectionFactoryValidationReport(...)`
- Maintien de la facade legacy:
  - `buildSectionFactoryValidationRules(...)`
  - le champ `rules` est derive depuis le report structure
- Ajout du report dans le payload legacy pour migration progressive:
  - `SectionFactoryValidationRulesPayload.report?`
- Ajout d'une resolution explicite du mode effectif de validation:
  - `src/adapters/resolveEffectiveValidationMode.ts`
  - `requestedMode` conserve le mode demande par le consommateur, `effectiveMode` expose le mode reellement applique
- Override global de migration en environnement d'integration:
  - variable d'environnement `VALIDATION_FORCE_REPORT_ONLY`
  - force `effectiveMode="report-only"` sans changer la production des diagnostics bruts
- Application de l'override uniquement au statut final du report:
  - en `effectiveMode=report-only`, un `fail` calcule est degrade de maniere deterministe en `pass_with_warnings` (post-calcul de verdict)
  - exposition explicite du compteur `downgradedDiagnosticsCount`

Champs ajoutes dans `ValidationReport`:

- `requestedMode`
- `effectiveMode`
- `forcedByConfig`
- `downgradedDiagnosticsCount`

Documentation ajoutee:

- `docs/validation-migration-notes.md`
- `docs/validation-report-contract.md`

Tests ajoutes/renforces:

- `src/adapters/resolveEffectiveValidationMode.test.ts`
- `src/core/validation/report.test.ts`
- `src/adapters/adapters.test.ts` (scenario env `VALIDATION_FORCE_REPORT_ONLY`)

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
- `npm run docs:normalize`
- `npm run docs:build-index`

Projet racine:

- `npm run test:consumer-optin`

Tous ces controles ont ete executes avec succes sur l'etat final.

## 7) Fichiers de pilotage et suivi

- plan de refonte consolide: `REFONTE_PLAN.md`
- audit d'inventaire initial: `AUDIT_MINI_PHASE_0_VALIDATION.md`
- synthese courte et usage runtime: `README.md`

## 8) Etat final

Le sous-projet `MCP-doc-shopify` est maintenant:

- modulaire (catalog/resources/pipeline/search/adapters)
- resilient (fallback index/snapshot + fallback adapters)
- compatible (tools historiques maintenus)
- teste (unit/integration/contracts + consumer opt-in)
- verrouille sur la separation documentaire vs decision metier critique
- renforce sur la precision metier (reason codes fermes, messages explicatifs, recommandations ciblees)

## 9) Mise a jour 2026-04-04 - mini-phase documentaire 5

Objectif execute: finaliser la couche documentaire avec convergence statique/pipeline non bloquante et tests qualite dedies.

Changements implementes:

- ajout de `src/catalog/convergedDocsIndex.ts`
- ajout de `src/catalog/convergedDocsIndex.test.ts`
- branchement de la convergence dans `src/catalog/localDocsIndex.ts`
- ajout du script `test:catalog` et integration dans `npm test`

Comportement obtenu:

1. Si l'index pipeline est vide: fallback statique injecte automatiquement.
2. Si l'index pipeline est partiel: complement statique ajoute uniquement sur les topics manquants.
3. Si l'index pipeline est present sur un topic: la source pipeline reste prioritaire.
4. La dedup est deterministe (id + empreinte topic/titre) pour eviter les doublons instables.

Validation verifiee:

- `npm run test:catalog` vert
- `npm run test:search` vert
- `npm run test:adapters` vert
- `npm run test:contracts` vert
- `npm test` global vert
