import assert from "node:assert/strict";
import test from "node:test";

import { listBusinessRules } from "./businessRules.js";
import { listQualityRules } from "./qualityRules.js";
import { RULE_RECLASSIFICATION_TABLE } from "./ruleCategories.js";

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

test("reclassification table exactly covers all core-rule IDs", () => {
  const coreRuleIds = sortedUnique([
    ...listBusinessRules().map((rule) => rule.id),
    ...listQualityRules().map((rule) => rule.id),
  ]);

  const tableCoreRuleRows = RULE_RECLASSIFICATION_TABLE.filter(
    (row) =>
      row.classification_actuelle === "core-rule" &&
      (row.classification_cible === "business" ||
        row.classification_cible === "quality"),
  );

  const tableIds = sortedUnique(
    tableCoreRuleRows.map((row) => row.id_regle_actuelle),
  );

  assert.deepEqual(
    tableIds,
    coreRuleIds,
    "RULE_RECLASSIFICATION_TABLE must match core rules one-to-one.",
  );
});

test("reclassification table has no duplicate core-rule IDs", () => {
  const tableCoreRuleIds = RULE_RECLASSIFICATION_TABLE.filter(
    (row) => row.classification_actuelle === "core-rule",
  ).map((row) => row.id_regle_actuelle);

  assert.equal(
    new Set(tableCoreRuleIds).size,
    tableCoreRuleIds.length,
    "Duplicate core-rule IDs found in RULE_RECLASSIFICATION_TABLE.",
  );
});

test("reclassification rows have a non-empty justification", () => {
  for (const row of RULE_RECLASSIFICATION_TABLE) {
    assert.equal(
      row.justification.trim().length > 0,
      true,
      `Missing justification for ${row.id_regle_actuelle}`,
    );
  }
});
