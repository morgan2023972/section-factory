# Notes de migration de validation

## Perimetre

Cette note suit la migration du payload legacy aplati vers le rapport de validation structure.

## Etat actuel

- Modele canonique: `ValidationReport` dans `src/core/validation/reportTypes.ts`.
- Compatibilite legacy: `SectionFactoryValidationRulesPayload.rules` reste disponible.
- Derivation legacy: construite depuis `ValidationReport` dans `src/adapters/toSectionFactoryValidationRules.ts`.
- L'index documentaire local est maintenant converge (pipeline prioritaire avec supplements statiques non bloquants).

## API des adaptateurs

- Sortie structuree (v2): `buildSectionFactoryValidationReport(...)`.
- Sortie de compatibilite (facade legacy): `buildSectionFactoryValidationRules(...)`.
- Suppression controlee du legacy: `buildSectionFactoryValidationRules({ legacyPayloadMode: "report-only" })`.
- Surcharge globale (environnement d'integration): `VALIDATION_FORCE_REPORT_ONLY=1`.

## Checklist de migration consommateur

1. Lire `report.verdict` au lieu de deduire l'etat de blocage depuis les regles legacy.
2. Consommer `businessDiagnostics` et `qualityDiagnostics` directement pour l'UI et la logique de decision.
3. Conserver `rules` legacy uniquement pour la retrocompatibilite ou les surfaces UI anciennes.
4. Ne plus utiliser les hints documentaires pour des decisions bloquantes.

## Politique de retrait du payload legacy

- `rules` reste supporte pendant la transition.
- `legacyPayloadMode: "report-only"` permet une migration consommateur par consommateur sans rupture immediate d'API.
- `VALIDATION_FORCE_REPORT_ONLY` peut forcer `effectiveMode="report-only"` meme quand `requestedMode="full"`.
- Le retrait est autorise uniquement apres migration de tous les consommateurs vers les champs de `ValidationReport`.
- Aucune suppression silencieuse: annoncer la suppression dans une note de version avant retrait.

## Notes sur la convergence documentaire

- Implementation de convergence: `src/catalog/convergedDocsIndex.ts`.
- Point d'entree index local compatible: `src/catalog/localDocsIndex.ts`.
- Pas de rupture de payload MCP: les contrats recherche/adaptateurs restent inchanges.
- Les documents de fallback statique restent strictement documentaires et non decisionnels.
