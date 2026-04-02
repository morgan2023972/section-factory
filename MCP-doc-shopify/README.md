# MCP-doc-shopify

Mini sommaire

- Objectif: faire evoluer le serveur MCP Shopify de tools statiques vers un serveur documentaire complet, sans rupture.
- Transport conserve: stdio.
- Priorites: resources MCP, tool search_shopify_docs, index local, adapters vers Section Factory.
- Strategie: migration incrementale par phases, avec compatibilite maintenue de l existant.

Documents

- Plan complet de migration: [MIGRATION_PLAN.md](MIGRATION_PLAN.md)
- Point d entree serveur actuel: [src/index.ts](src/index.ts)
- Donnees Shopify actuelles: [src/shopifyDocs.ts](src/shopifyDocs.ts)
- Tools existants: [src/tools](src/tools)

Phases (resume)

1. Stabiliser l existant et ajouter des tests de non regression.
2. Extraire une couche catalog interne.
3. Ajouter des resources MCP (sections, blocks, presets, schema settings, liquid patterns, OS 2.0).
4. Brancher une source Shopify reelle avec index local.
5. Ajouter search_shopify_docs.
6. Preparer adapters generateur/validator.
7. Finaliser la bascule et nettoyer le code obsolete.
