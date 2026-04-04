## Plan complet de refonte (avec complements structurants)

### Mise a jour d'execution (2026-04-04)

Etat courant verifie apres implementation et validation locale:

1. mini-phases 1 a 4: completees et stabilisees.
2. mini-phase 5 documentaire (tests qualite documentaire + convergence statique/pipeline non bloquante): completee.
3. mini-phases 6 a 8: restent dans la trajectoire cible du plan.

Details de la mini-phase 5 documentaire:

1. Ajout d'une convergence index local: pipeline prioritaire + supplement statique par topic manquant.
2. Fallback statique non bloquant quand l'index pipeline est vide.
3. Dedup deterministe des documents converges.
4. Ajout d'une suite dediee `test:catalog`.
5. Validation complete `npm test` verte.

### Vue d'ensemble (mise a jour)

Objectif global: refondre le systeme de validation de maniere incrementale, sans big bang, en separant clairement analyse, decision, guidance et documentaire, tout en maintenant la compatibilite transitoire.

Principes structurants:

1. Separer le decisionnel metier des signaux documentaires.
2. Rendre explicite la semantique des etats analytiques.
3. Stabiliser l'input des regles avant toute specialisation des regles.
4. Produire une sortie finale structuree, tracable, non aplatie.
5. Maintenir un adaptateur legacy temporaire derive, jamais central.

### Priorisation structurante de la refonte

Toutes les mini-phases n'ont pas le meme poids architectural.
Ordre de priorite reel:

1. Priorite 1: introduire les etats analytiques present, absent, unknown, invalid.
2. Priorite 2: stabiliser ValidationRuleInput, propre et decouple du brut.
3. Priorite 3: separer les regles business, quality, guidance, documentaire.
4. Priorite 4: refondre la sortie en rapport structure/payload structure.
5. Priorite 5: finaliser l'integration documentaire sans contamination decisionnelle.

Consequences:

1. Tant que la semantique analytique est ambigue, les regles restent fragiles.
2. Tant que ValidationRuleInput n'est pas stabilise, la separation des regles reste partielle.
3. Tant que la sortie reste aplatie, la tracabilite des diagnostics est insuffisante.
4. Le documentaire est important, mais ne doit jamais masquer les priorites analytiques et decisionnelles.

### Regle stricte pour les regles metier

Une regle metier ne doit jamais:

1. deviner une donnee
2. appliquer un fallback silencieux
3. interpreter une ambiguite comme un fait certain
4. convertir un unknown en invalid
5. convertir une absence d'information en erreur metier

Corollaires:

1. Toute interpretation appartient a la couche d'analyse.
2. Les regles metier ne consomment que des faits qualifies.
3. Si l'analyse ne sait pas conclure, la regle reste prudente.
4. Un verdict critique doit toujours etre tracable a un fait qualifie.

### Regle stricte sur la sortie finale

La cible n'est pas un payload aplati "un peu enrichi".
La sortie finale doit separer explicitement:

1. verdict
2. businessDiagnostics
3. qualityDiagnostics
4. technicalGuidance
5. documentaryHints
6. analysisIssues
7. analysisLimitations

Consideres comme problemes architecturaux majeurs:

1. perte de origin
2. perte de blocking
3. dilution des diagnostics dans une structure unique
4. transformation de donnees structurees en simple texte de rationale

Compatibilite:

1. Le payload aplati actuel peut exister temporairement.
2. Il doit etre un adaptateur transitoire derive.
3. Il ne doit jamais rester le modele central durable.

---

## Mini-phase 1 - Introduire les etats analytiques

### 1. Objectif

Formaliser la semantique present/absent/unknown/invalid et empecher les interpretations implicites.
Poser la base de fiabilite des decisions futures.

### 2. Fichiers a creer

1. src/core/validation/types.ts
2. src/core/validation/stateMappers.ts
3. src/core/validation/index.ts
4. src/core/validation/stateMappers.test.ts

### 3. Fichiers a modifier

1. src/adapters/buildValidationRuleInput.ts
2. src/adapters/types.ts
3. src/core/rules/types.ts
4. src/adapters/index.ts

### 4. Changements attendus

1. Introduire les types d'etat et confiance.
2. Mapper explicitement les signaux legacy vers etats analytiques.
3. Eliminer les fallback implicites silencieux.

### 5. Compatibilite transitoire

1. Conserver ValidationSignalsInput.
2. Conserver les signatures publiques existantes.
3. Limiter les changements au cablage interne.

### 6. Risques / points de vigilance

1. Regression de verdict par mappings trop agressifs.
2. Confusion absent vs present avec valeur zero.
3. Requalification cachee de unknown.

### 7. Tests a ajouter ou adapter

1. Tests unitaires des 4 etats.
2. Tests de non-regression adapters.

### 8. Criteres de fin de mini-phase

1. Etats analytiques disponibles et testes.
2. unknown n'est jamais converti en invalid dans les regles.
3. Aucune absence d'information n'est transformee en erreur metier par defaut.
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Creer types.
2. Creer mappers.
3. Brancher mappers.
4. Ajouter tests.
5. Valider non-regression.

---

## Mini-phase 2 - Creer AnalysisResult

### 1. Objectif

Creer un objet d'analyse enrichie unique et tracable, separe de la decision.

### 2. Fichiers a creer

1. src/core/validation/analysisTypes.ts
2. src/core/validation/buildAnalysisResult.ts
3. src/core/validation/buildAnalysisResult.test.ts

### 3. Fichiers a modifier

1. src/core/validation/index.ts
2. src/adapters/types.ts
3. src/adapters/buildValidationRuleInput.ts
4. src/adapters/toSectionFactoryValidationRules.ts

### 4. Changements attendus

1. Introduire AnalysisResult, issues, limitations, candidats documentaires.
2. Construire cet artefact depuis les signaux actuels.
3. Preserver les ambiguites au niveau analyse.

### 5. Compatibilite transitoire

1. Maintenir les entrees/sorties publiques actuelles.
2. Construire AnalysisResult a la volee si besoin.

### 6. Risques / points de vigilance

1. Confusion issues vs limitations.
2. Duplication temporaire de logique.

### 7. Tests a ajouter ou adapter

1. Tests de construction d'analyse enrichie.
2. Cas absent/unknown/invalid.

### 8. Criteres de fin de mini-phase

1. AnalysisResult systematique en interne.
2. Aucune ambiguite promue en fait metier certain.
3. Pas de fallback silencieux dans l'analyse.
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Types d'analyse.
2. Builder.
3. Cablage.
4. Tests.
5. Validation globale.

---

## Mini-phase 3 - Introduire ValidationRuleInput

### 1. Objectif

Imposer un input stabilise unique pour les regles; interdire la lecture brute par les regles.

### 2. Fichiers a creer

1. src/core/validation/validationRuleInputTypes.ts
2. src/core/validation/buildValidationRuleInputFromAnalysis.ts
3. src/core/validation/buildValidationRuleInputFromAnalysis.test.ts

### 3. Fichiers a modifier

1. src/core/rules/types.ts
2. src/core/rules/criticalRules.ts
3. src/adapters/buildValidationRuleInput.ts
4. src/adapters/toSectionFactoryValidationRules.ts
5. src/adapters/adapters.test.ts

### 4. Changements attendus

1. Creer le contrat ValidationRuleInput cible.
2. Migrer les regles vers ce contrat.
3. Garder un wrapper legacy transitoire.

### 5. Compatibilite transitoire

1. Garder les signatures publiques.
2. Maintenir les exports legacy via adaptation.

### 6. Risques / points de vigilance

1. Regles qui lisent encore le brut.
2. Problemes null vs 0.

### 7. Tests a ajouter ou adapter

1. Contrat "regles consomment uniquement ValidationRuleInput".
2. Tests de non-regression diagnostics.

### 8. Criteres de fin de mini-phase

1. Les regles metier consomment uniquement des faits qualifies.
2. Aucun fallback implicite dans les regles metier.
3. Toute decision critique est tracable a un fait qualifie.
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Types.
2. Builder.
3. Migration regles.
4. Wrapper compat.
5. Validation tests.

---

## Mini-phase 4 - Separer regles metier et regles qualite

### 1. Objectif

Dissocier explicitement responsabilites business et quality, et clarifier la chaine decisionnelle.

### 2. Fichiers a creer

1. src/core/rules/businessRules.ts
2. src/core/rules/qualityRules.ts
3. src/core/rules/ruleCategories.ts
4. src/core/rules/qualityRules.test.ts

### 3. Fichiers a modifier

1. src/core/rules/criticalRules.ts
2. src/core/rules/types.ts
3. src/core/rules/index.ts
4. src/adapters/toSectionFactoryValidationRules.ts
5. src/adapters/adapters.test.ts

### 4. Changements attendus

1. Categoriser et extraire les regles.
2. Introduire une facade legacy minimale.
3. Clarifier le calcul des diagnostics par categorie.
4. Produire une table de reclassification des regles existantes avec les colonnes minimales: id_regle_actuelle, classification_actuelle, classification_cible, justification, impact_blocking.

### 5. Compatibilite transitoire

1. Preserver ids/messages existants autant que possible.
2. Maintenir le contrat de sortie actuel.

### 6. Risques / points de vigilance

1. Mauvaise classification.
2. Changement involontaire du blocking.

### 7. Tests a ajouter ou adapter

1. Tests unitaires par categorie.
2. Integration adapters.

### 8. Criteres de fin de mini-phase

1. Separation metier/qualite active.
2. Facade legacy stable.
3. Table de reclassification complete, validee, et sans regle non classee.
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Categories.
2. Extraction regles.
3. Facade.
4. Cablage.
5. Tests.

---

## Mini-phase 5 - Introduire les nouveaux diagnostics

### 1. Objectif

Passer a des diagnostics structures distincts par nature (business vs quality).

### 2. Fichiers a creer

1. src/core/validation/diagnosticsTypes.ts
2. src/core/validation/diagnosticMappers.ts
3. src/core/validation/diagnosticMappers.test.ts

### 3. Fichiers a modifier

1. src/core/rules/types.ts
2. src/core/rules/businessRules.ts
3. src/core/rules/qualityRules.ts
4. src/adapters/toSectionFactoryValidationRules.ts
5. src/adapters/adapters.test.ts

### 4. Changements attendus

1. Mapper vers diagnostics structures.
2. Conserver conversion transitoire vers format legacy.

### 5. Compatibilite transitoire

1. Maintenir payload public actuel.
2. Ajouter structure en interne d'abord.

### 6. Risques / points de vigilance

1. Perte d'info au mapping.
2. Incoherences de severite.

### 7. Tests a ajouter ou adapter

1. Tests mappers business.
2. Tests mappers quality.
3. Non-regression payload.

### 8. Criteres de fin de mini-phase

1. Diagnostics structures disponibles en interne.
2. Compatibilite preservee.
3. Build et tests verts.

### 9. Ordre d'execution interne

1. Types diagnostics.
2. Mappers.
3. Cablage.
4. Compat.
5. Tests.

---

## Mini-phase 6 - Introduire guidance technique permanente et hints documentaires

### 1. Objectif

Separer explicitement guidance technique durable et hints documentaires contextuels.

### 2. Fichiers a creer

1. src/core/validation/guidanceTypes.ts
2. src/core/validation/buildTechnicalGuidance.ts
3. src/core/validation/buildDocumentaryHints.ts
4. src/core/validation/guidanceAndHints.test.ts

### 3. Fichiers a modifier

1. src/adapters/toSectionFactoryValidationRules.ts
2. src/core/validation/analysisTypes.ts
3. src/adapters/types.ts
4. src/adapters/adapters.test.ts

### 4. Changements attendus

1. Structurer guidance et hints separement.
2. Garantir hints non bloquants.
3. Eviter contamination decisionnelle.
4. Verrouiller `TechnicalGuidanceItem` comme objet non decisionnel: aucun champ severity, aucun champ blocking.
5. Garantir explicitement que la guidance technique ne participe jamais au calcul du verdict.

### 5. Compatibilite transitoire

1. Conserver ids techniques legacy si necessaires.
2. Conserver fallback/flag legacy pendant transition.

### 6. Risques / points de vigilance

1. Dedoublonnage guidance/hints.
2. Confusion quality vs guidance.

### 7. Tests a ajouter ou adapter

1. Tests categories guidance.
2. Tests confiance documentaire.
3. Tests anti-contamination.

### 8. Criteres de fin de mini-phase

1. Guidance/hints separes.
2. Hints sans impact sur verdict.
3. Guidance technique strictement non decisionnelle (sans severity/blocking et sans influence sur verdict).
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Types.
2. Builders.
3. Fusion.
4. Tests.
5. Validation.

---

## Mini-phase 7 - Introduire ValidationReport et computeVerdict

### 1. Objectif

Installer le rapport structure final et la logique de verdict centralisee.

### 2. Fichiers a creer

1. src/core/validation/reportTypes.ts
2. src/core/validation/computeVerdict.ts
3. src/core/validation/buildValidationReport.ts
4. src/core/validation/report.test.ts

### 3. Fichiers a modifier

1. src/adapters/toSectionFactoryValidationRules.ts
2. src/adapters/types.ts
3. src/adapters/index.ts
4. src/adapters/adapters.test.ts
5. src/integration/contracts.integration.test.ts

### 4. Changements attendus

1. Modele central de sortie = rapport structure.
2. computeVerdict explicite et testable.
3. Le payload aplati legacy devient derive transitoire uniquement.
4. Aucune perte structurelle de origin et blocking dans le modele central.
5. Regle stricte pour `inconclusive`: uniquement si limitation d'analyse a fort impact sur la decision OU si un champ de decision critique est a l'etat `unknown`.
6. Interdiction explicite: un `unknown` limite a des champs non critiques ne suffit jamais a produire `inconclusive`.
7. Introduire une resolution explicite du mode de validation: `requestedMode` puis `effectiveMode`.
8. Brancher un override global `VALIDATION_FORCE_REPORT_ONLY` sans modifier la logique metier des regles ni la production des diagnostics bruts.
9. Appliquer l'override uniquement au statut final du report (post-calcul de verdict), avec tracabilite complete.
10. Exposer dans `ValidationReport`: `requestedMode`, `effectiveMode`, `forcedByConfig`, `downgradedDiagnosticsCount`.

### 5. Compatibilite transitoire

1. Conserver API legacy en facade.
2. Exposer rapport v2 en parallele.

### 6. Risques / points de vigilance

1. Matrice de verdict.
2. Coherence summary.

### 7. Tests a ajouter ou adapter

1. Matrice complete de verdict.
2. Tests summary.
3. Tests de derivation vers payload legacy.
4. Tests unitaires de resolution de mode effectif (avec/sans env override).
5. Tests de report pour verifier le downgrade du statut final en `report-only`.
6. Test d'integration adapter sur override global via `VALIDATION_FORCE_REPORT_ONLY`.

### 8. Criteres de fin de mini-phase

1. Rapport structure genere et coherent.
2. Verdict deterministe.
3. Compatibilite maintenue.
4. Build et tests verts.

### 9. Ordre d'execution interne

1. Types rapport.
2. Verdict.
3. Builder rapport.
4. Derivation legacy.
5. Tests.

---

## Mini-phase 8 - Migration progressive et nettoyage

### 1. Objectif

Retirer progressivement les couches legacy et cloturer la migration sans rupture.

Etat d'avancement courant:

1. Le contrat `ValidationReport` est expose via une facade adapter dediee.
2. Le payload legacy est maintenu comme derivation de compatibilite.
3. Les notes de migration et le contrat report sont documentes dans `docs/`.
4. Le mode effectif est resolu par fonction dediee et peut etre force en `report-only` via `VALIDATION_FORCE_REPORT_ONLY`.
5. La tracabilite de mode est exposee dans `ValidationReport` via `requestedMode`, `effectiveMode`, `forcedByConfig` et `downgradedDiagnosticsCount`.

### 2. Fichiers a creer

1. docs/validation-migration-notes.md
2. docs/validation-report-contract.md

### 3. Fichiers a modifier

1. src/adapters/types.ts
2. src/adapters/buildValidationRuleInput.ts
3. src/adapters/toSectionFactoryValidationRules.ts
4. src/adapters/index.ts
5. src/adapters/adapters.test.ts
6. src/integration/contracts.integration.test.ts
7. README.md
8. REFONTE_PLAN.md

### 4. Changements attendus

1. Deprecier puis retirer les artefacts legacy.
2. Consolider le contrat final structure.
3. Mettre a jour docs et regles de migration.
4. Maintenir un retrait controle du legacy via mode effectif `report-only` avant suppression definitive.
5. Rendre visible en environnement d'integration les ecarts de blocage via `downgradedDiagnosticsCount`.

### 5. Compatibilite transitoire

1. Le payload aplati ne subsiste que comme adaptateur de compatibilite.
2. Sa suppression depend de la migration des consommateurs.
3. Le modele durable reste le rapport structure separe par nature d'information.
4. Un override global `VALIDATION_FORCE_REPORT_ONLY` peut forcer temporairement le mode effectif sans casser le contrat externe.

### 6. Risques / points de vigilance

1. Suppression prematuree de compat.
2. Rupture silencieuse consommateur.

### 7. Tests a ajouter ou adapter

1. Tests de deprecation.
2. Tests de suppression.
3. Tests de compat versionnee.

### 8. Criteres de fin de mini-phase

1. Plus de chemin legacy central.
2. Contrat final documente et valide.
3. Build/tests/integration verts.

### 9. Ordre d'execution interne

1. Deprecation.
2. Migration consommateurs.
3. Suppression.
4. Documentation.
5. Validation finale.

---

## Recommandation d'ordre reel d'execution (alignee priorisation)

Ordre d'execution recommande (strict):

1. mini-phase 1
2. mini-phase 2
3. mini-phase 3
4. mini-phase 4
5. mini-phase 5
6. mini-phase 6
7. mini-phase 7
8. mini-phase 8

Lecture operationnelle:

1. Verrouiller d'abord la semantique analytique.
2. Stabiliser ensuite l'input decisionnel.
3. Separer ensuite les regles et les diagnostics par nature.
4. Introduire puis verrouiller guidance, hints et rapport structure dans l'ordre.
5. Terminer par la migration finale et le nettoyage en mini-phase 8.
