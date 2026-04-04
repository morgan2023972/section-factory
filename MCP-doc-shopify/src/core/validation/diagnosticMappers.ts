import {
  RULE_RECLASSIFICATION_TABLE,
  type RuleCategory,
} from "../rules/ruleCategories.js";
import type { InternalValidationDiagnostic } from "../rules/types.js";
import type {
  BusinessDiagnostic,
  QualityDiagnostic,
  StructuredValidationDiagnostic,
} from "./diagnosticsTypes.js";

function buildStrictRuleCategoryIndex(): ReadonlyMap<string, RuleCategory> {
  const index = new Map<string, RuleCategory>();

  for (const row of RULE_RECLASSIFICATION_TABLE) {
    if (row.classification_actuelle !== "core-rule") {
      continue;
    }

    if (
      row.classification_cible !== "business" &&
      row.classification_cible !== "quality"
    ) {
      continue;
    }

    if (index.has(row.id_regle_actuelle)) {
      throw new Error(
        `Duplicate core-rule reclassification entry for '${row.id_regle_actuelle}'.`,
      );
    }

    index.set(row.id_regle_actuelle, row.classification_cible);
  }

  return index;
}

const RULE_CATEGORY_BY_ID = buildStrictRuleCategoryIndex();

function resolveRuleCategory(
  diagnostic: InternalValidationDiagnostic,
): RuleCategory | null {
  if (diagnostic.origin !== "core-rule") {
    return null;
  }

  const category = RULE_CATEGORY_BY_ID.get(diagnostic.id);
  if (!category) {
    throw new Error(
      `Unclassified core-rule diagnostic '${diagnostic.id}'. Update RULE_RECLASSIFICATION_TABLE.`,
    );
  }

  return category;
}

export function mapInternalDiagnosticToStructured(
  diagnostic: InternalValidationDiagnostic,
): StructuredValidationDiagnostic | null {
  const category = resolveRuleCategory(diagnostic);
  if (!category) {
    return null;
  }

  if (category === "business") {
    const mapped: BusinessDiagnostic = {
      id: diagnostic.id,
      category: "business",
      title: diagnostic.title,
      severity: diagnostic.severity,
      blocking: diagnostic.blocking,
      message: diagnostic.message,
      recommendation: diagnostic.recommendation,
      sourceUrls: [...diagnostic.sourceUrls],
      reasons: diagnostic.reasons,
      legacyOrigin: "core-rule",
    };
    return mapped;
  }

  const mapped: QualityDiagnostic = {
    id: diagnostic.id,
    category: "quality",
    title: diagnostic.title,
    severity: diagnostic.severity,
    blocking: false,
    message: diagnostic.message,
    recommendation: diagnostic.recommendation,
    sourceUrls: [...diagnostic.sourceUrls],
    reasons: diagnostic.reasons,
    legacyOrigin: "core-rule",
  };
  return mapped;
}
