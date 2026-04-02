# Plan: Migration MCP Shopify documentaire

Migration incrémentale en 6 phases, en conservant l’entrée actuelle du serveur MCP (stdio + src/index.ts) jusqu’à stabilisation complète des nouveaux modules. Le principe est un strangler pattern: on introduit de nouvelles couches (catalog, resources, index local, adapters) derrière des interfaces, puis on bascule progressivement les tools existants vers ces couches, sans suppression brutale.

## Steps

1. Phase 0 - Baseline et garde-fous

- Geler le comportement actuel et ajouter des tests de non-régression sur les 3 tools existants.
- Introduire une couche de bootstrap interne sans modifier le contrat externe de src/index.ts.
- Ajouter gestion d’erreurs et logs minimaux autour du connect stdio.

1. Phase 1 - Extraction documentaire interne (dépend de 1)

- Extraire les constantes de shopifyDocs.ts vers un module catalog versionné (toujours local, sans source externe).
- Conserver les wrappers tools actuels mais les faire lire via le nouveau catalog provider.
- Ajouter des types stricts pour documents/règles/settings afin de préparer resources et index.

1. Phase 2 - Ajout des resources MCP (parallel avec fin phase 2 tests)

- Ajouter handlers resources list/read (guides séparés: sections, blocks, presets, schema settings, liquid patterns, compat OS 2.0).
- Garder les 3 tools existants inchangés côté nom et payload principal.
- Faire cohabiter tools + resources dans le même serveur et même transport stdio.

1. Phase 3 - Source Shopify réelle + index local (dépend de 2)

- Introduire connecteur de source documentaire Shopify (fetch + normalisation) et pipeline d’indexation locale.
- Ajouter refresh contrôlé (manuel au début) avec fallback hardcoded sur snapshot local.
- Versionner l’index et exposer métadonnées de fraîcheur.

1. Phase 4 - Nouveau tool search_shopify_docs (dépend de 3)

- Ajouter tool search_shopify_docs basé sur l’index local.
- Définir un contrat de réponse stable (snippet, source, score, path thématique).
- Tester ranking simple et robustesse en absence de connectivité.

1. Phase 5 - Adapters Section Factory (dépend de 4, parallel avec durcissement)

- Créer adapters pour consommation par générateur et validator (sans imposer MCP runtime au cœur de Section Factory).
- Prévoir mode fallback local pour ne pas bloquer la génération/validation.
- Ajouter tests d’intégration ciblés côté sous-projet MCP (contrats) et côté consumer plus tard.

1. Phase 6 - Bascule progressive et nettoyage (dépend de 5)

- Basculer les tools historiques sur les nouveaux providers (déjà fait techniquement depuis phase 1).
- Déprécier l’ancien module de données statiques tout en conservant compatibilité API.
- Retirer uniquement le code devenu redondant après validation complète.

## Relevant files

- c:/Users/yannm/Desktop/section-factory/MCP-doc-shopify/src/index.ts — point d’entrée à conserver, puis à simplifier en orchestration.
- c:/Users/yannm/Desktop/section-factory/MCP-doc-shopify/src/shopifyDocs.ts — source statique actuelle à encapsuler puis déprécier.
- c:/Users/yannm/Desktop/section-factory/MCP-doc-shopify/src/tools/getSectionRules.ts — wrapper à conserver, branché sur provider.
- c:/Users/yannm/Desktop/section-factory/MCP-doc-shopify/src/tools/getSchemaGuide.ts — wrapper à conserver, branché sur provider.
- c:/Users/yannm/Desktop/section-factory/MCP-doc-shopify/src/tools/suggestSettings.ts — wrapper à améliorer et typer strict.
- c:/Users/yannm/Desktop/section-factory/src/core/sectionValidator.ts — futur point d’adaptation validator (consommation guide/rules).
- c:/Users/yannm/Desktop/section-factory/src/core/sectionGenerator.ts — futur point d’adaptation générateur.

## Verification

1. Exécuter build/test du sous-projet MCP à chaque phase avec snapshot des réponses des tools historiques.
2. Vérifier que src/index.ts continue de démarrer en stdio et expose toujours les mêmes 3 tools après chaque changement.
3. Ajouter tests resources (list/read) avant d’ajouter search.
4. Ajouter tests search sur index local déterministe (fixtures).
5. Vérifier fallback: si source Shopify indisponible, tools/resources/search répondent avec snapshot local documenté.
6. Vérifier strict TypeScript sans any implicite sur nouveaux modules.

## Decisions

- Inclus: migration incrémentale interne au sous-projet MCP-doc-shopify, ressources MCP, index local, search tool, préparation adapters.
- Exclu pour cette étape: refonte immédiate du cœur Section Factory, changement du transport, suppression rapide des tools existants.
- Contrainte clé: ne pas casser src/index.ts; uniquement y déléguer progressivement vers de nouveaux modules.

## Further Considerations

1. Source Shopify réelle initiale recommandée: pipeline de fetch sur pages doc officielles + normalisation markdown/json locale, puis index textuel léger.
2. Dépendances recommandées minimales: conserver @modelcontextprotocol/sdk et zod; éviter moteur de recherche lourd au départ (index maison simple + scoring BM25-like minimal).
3. Stratégie de rollout: feature flags internes (resources/search/index-refresh) activables progressivement pour sécuriser la compatibilité clients MCP existants.

## Status Update

- Phase 3: correction URL OS2 terminée dans [src/pipeline/sourceCatalog.ts](src/pipeline/sourceCatalog.ts).
- Phase 3: module interne de lecture d index local terminé dans [src/catalog/localDocsIndex.ts](src/catalog/localDocsIndex.ts).
- Runtime MCP public inchangé: aucune exposition MCP supplémentaire, aucun moteur de recherche branché côté runtime.
- Phase 5: mode fallback local validé côté adapters prompt et validation (flag fallbackUsed + sorties non bloquantes).
- Phase 5: tests d intégration de contrats ajoutés côté sous-projet MCP dans [src/integration/contracts.integration.test.ts](src/integration/contracts.integration.test.ts).
- Côté consumer: tests d intégration reportés à une étape ultérieure, conformément au plan.
- Phase 6: ancien module statique déprécié avec compat API conservée via re-export dans [src/shopifyDocs.ts](src/shopifyDocs.ts).
- Phase 6: données statiques déplacées vers [src/catalog/staticCatalogData.ts](src/catalog/staticCatalogData.ts), provider basculé dessus dans [src/catalog/provider.ts](src/catalog/provider.ts).
- Phase 6: nettoyage réalisé sans changement du contrat externe MCP (tools historiques + resources + search inchangés).
