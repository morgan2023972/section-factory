export type RuleCategory = "business" | "quality";

export interface RuleReclassificationRow {
  readonly id_regle_actuelle: string;
  readonly classification_actuelle: "core-rule" | "technical" | "documentary";
  readonly classification_cible: RuleCategory | "technical" | "documentary";
  readonly justification: string;
  readonly impact_blocking: "none" | "possible" | "confirmed";
}

// Table initiale pre-remplie et prete a etre completee/affinee.
export const RULE_RECLASSIFICATION_TABLE: readonly RuleReclassificationRow[] = [
  {
    id_regle_actuelle: "schema-required",
    classification_actuelle: "core-rule",
    classification_cible: "business",
    justification: "Valide une contrainte metier critique de structure schema.",
    impact_blocking: "confirmed",
  },
  {
    id_regle_actuelle: "settings-coherence",
    classification_actuelle: "core-rule",
    classification_cible: "quality",
    justification:
      "Concerne la coherence de configurabilite, non bloquant par nature.",
    impact_blocking: "none",
  },
  {
    id_regle_actuelle: "presets-availability",
    classification_actuelle: "core-rule",
    classification_cible: "quality",
    justification:
      "Concerne la decouvrabilite editoriale, signal qualite non critique.",
    impact_blocking: "none",
  },
];
