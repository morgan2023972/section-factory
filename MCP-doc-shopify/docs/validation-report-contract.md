# Contrat du rapport de validation

## Type

`ValidationReport` est defini dans `src/core/validation/reportTypes.ts`.

## Champs du contrat

- `generatedAt`: horodatage ISO.
- `requestedMode`: mode demande par le consommateur (`full | report-only`).
- `effectiveMode`: mode reellement applique apres resolution de la configuration.
- `forcedByConfig`: `true` quand la configuration force le mode effectif.
- `downgradedDiagnosticsCount`: nombre de diagnostics bloquants degrades dans le statut final du rapport.
- `verdict`: `pass | pass_with_warnings | fail | inconclusive`.
- `inconclusiveSignals`: raisons explicites quand le verdict est inconclusif.
- `businessDiagnostics`: diagnostics metier structures.
- `qualityDiagnostics`: diagnostics qualite structures.
- `technicalGuidance`: guidance technique non decisionnelle.
- `documentaryHints`: hints de contexte issus de la documentation indexee.
- `analysisIssues`: problemes de niveau analyse.
- `analysisLimitations`: limitations de niveau analyse.
- `summary`: compteurs agreges.

Regle de priorite:

- `requestedMode` reflete toujours la demande consommateur.
- `effectiveMode` reflete le mode applique a l'execution apres resolution d'override.
- Quand `forcedByConfig=true`, `effectiveMode` est force a `report-only` et `requestedMode` reste inchange.

## Regles de verdict

1. `fail` si au moins un diagnostic metier bloquant existe.
1. En `effectiveMode=report-only`, un `fail` calcule est degrade en `pass_with_warnings` pour le statut final du rapport.
1. `inconclusive` si une limitation d'analyse a fort impact existe ou si un champ de decision critique est `unknown`.
1. `pass_with_warnings` si des avertissements non bloquants existent et qu'aucune condition fail/inconclusive ne s'applique.
1. `pass` sinon.

## Garanties non decisionnelles

- `technicalGuidance` ne porte ni `severity` ni `blocking`.
- `documentaryHints` sont non bloquants et ne peuvent pas inverser un resultat critique.
- `documentaryHints` peuvent provenir des docs pipeline et/ou du fallback statique via l'index local converge, sans modifier la semantique decisionnelle.

## Compatibilite

`buildSectionFactoryValidationRules(...)` reste une facade de compatibilite qui derive les `rules` legacy depuis le rapport structure.

Pour une migration controlee, utiliser `legacyPayloadMode: "report-only"` sur la facade de compatibilite afin d'arreter la consommation des regles legacy tout en gardant un point d'entree stable.

Note sur la convergence:

- La convergence de l'index documentaire (pipeline prioritaire + supplements statiques) est une preoccupation interne de source de donnees et ne modifie pas ce contrat de rapport.
