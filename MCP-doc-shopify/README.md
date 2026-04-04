# MCP-doc-shopify

Entrypoint 60 secondes: serveur MCP Shopify orienté documentation locale (tools + resources + search indexé + adapters Section Factory), transport stdio via [src/index.ts](src/index.ts).

## Références docs

- Plan de refonte: [docs/REFONTE_PLAN.md](docs/REFONTE_PLAN.md)
- Changelog projet: [docs/documentation-mcp-shopify.md](docs/documentation-mcp-shopify.md)
- Migration validation: [docs/validation-migration-notes.md](docs/validation-migration-notes.md)
- Contrat ValidationReport: [docs/validation-report-contract.md](docs/validation-report-contract.md)

## Outils MCP exposés

- get_section_rules
- get_schema_guide
- suggest_settings_for_category
- search_shopify_docs

Implémentations: [src/tools](src/tools)  
Resources guides: [src/resources/registerResources.ts](src/resources/registerResources.ts)

## Architecture overview

- [src/catalog](src/catalog): provider documentaire + index local
- [src/resources](src/resources): guides Shopify et URIs MCP
- [src/pipeline](src/pipeline): fetch/normalize/build-index
- [src/search](src/search): moteur de recherche local
- [src/adapters](src/adapters): prompt context + validation adapters
- [src/core/rules](src/core/rules): règles business/quality + reclassification
- [src/core/validation](src/core/validation): analysis, diagnostics, guidance/hints, report, verdict
- [src/integration](src/integration): tests de contrats
- [data/docs](data/docs): artefacts pipeline (raw, normalized, index)

## Structure actuelle

```text
MCP-doc-shopify/
  data/docs/{raw,normalized,index}
  docs/{REFONTE_PLAN.md,documentation-mcp-shopify.md,validation-migration-notes.md,validation-report-contract.md}
  src/{adapters,catalog,core/{rules,validation},integration,pipeline,resources,search,tools,index.ts,shopifyDocs.ts}
```

Note: [src/shopifyDocs.ts](src/shopifyDocs.ts) est conservé en compatibilité (deprecated).

## Scripts npm

- npm run build
- npm run dev
- npm run start
- npm run test:rules-audit
- npm run test:search
- npm run test:adapters
- npm run test:contracts
- npm run docs:fetch
- npm run docs:normalize
- npm run docs:build-index
- npm run docs:pipeline

Définition exacte: [package.json](package.json)

## Development / tests

- Pré-requis: Node.js >= 20 < 21
- Flux recommandé:

1. npm install
2. npm run build
3. npm run test:rules-audit
4. npm run test:search
5. npm run test:adapters
6. npm run test:contracts

- Si données docs modifiées: npm run docs:pipeline puis relancer search/adapters/contracts

## Validation adapters

- Cible: buildSectionFactoryValidationReport(...)
- Façade legacy transitoire: buildSectionFactoryValidationRules(...)
- Entrée: [src/adapters/toSectionFactoryValidationRules.ts](src/adapters/toSectionFactoryValidationRules.ts)

## Migration status

- mini-phases 1 a 5 terminées et testées
- séparation business/quality active
- diagnostics structurés actifs
- audit de couverture de reclassification automatisé
- ValidationReport structuré disponible (full/report-only)
