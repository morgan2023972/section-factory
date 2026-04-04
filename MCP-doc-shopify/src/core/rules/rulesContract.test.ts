import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBusinessRules } from "./businessRules.js";
import { evaluateQualityRules } from "./qualityRules.js";
import type { ValidationRuleInput } from "./types.js";

function baseRuleInput(): ValidationRuleInput {
  return {
    trustedGuideUris: ["shopify://guides/sections"],
    facts: {
      schema: {
        exists: true,
        isValid: true,
        errors: [],
      },
      settings: {
        exists: false,
        count: 0,
      },
      blocks: {
        exists: true,
        count: 1,
      },
      presets: {
        exists: false,
        count: 0,
      },
      structuralWarnings: [],
    },
  };
}

test("rules contract: diagnostics depend only on ValidationRuleInput facts", () => {
  const baseline = baseRuleInput();

  const withLegacyLikeNoise = {
    ...baseline,
    // Noise fields intentionally emulate legacy/raw shapes and must be ignored by rules.
    hasSchema: false,
    schemaJsonValid: false,
    settingsCount: 999,
    blocksCount: 999,
    presetsCount: 999,
    ruleCandidates: ["legacy-noise"],
    schemaHints: { settings: false, blocks: false, presets: false },
    documentSummary: "legacy-noise",
  } as unknown as ValidationRuleInput;

  const baselineBusiness = evaluateBusinessRules(baseline);
  const noisyBusiness = evaluateBusinessRules(withLegacyLikeNoise);
  assert.deepEqual(noisyBusiness, baselineBusiness);

  const baselineQuality = evaluateQualityRules(baseline);
  const noisyQuality = evaluateQualityRules(withLegacyLikeNoise);
  assert.deepEqual(noisyQuality, baselineQuality);
});
