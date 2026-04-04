import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalysisResult } from "./buildAnalysisResult.js";
import { buildValidationRuleInputFromAnalysis } from "./buildValidationRuleInputFromAnalysis.js";

test("buildValidationRuleInputFromAnalysis returns stabilized rule input", () => {
  const analysisResult = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
      },
      settings: { count: 2 },
      blocks: { count: 1 },
      presets: { count: 1 },
    },
    documents: [],
  });

  const input = buildValidationRuleInputFromAnalysis({
    trustedGuideUris: ["shopify://guides/sections"],
    analysisResult,
  });

  assert.equal(input.facts.schema.analysis?.validityState, "unknown");
  assert.equal(input.facts.schema.isValid, true);
  assert.equal(input.facts.settings.count, 2);
  assert.equal(input.facts.blocks.count, 1);
  assert.equal(input.facts.presets.count, 1);
  assert.equal(input.trustedGuideUris.length, 1);
});

test("buildValidationRuleInputFromAnalysis keeps compatibility fallbacks for unknown counts", () => {
  const analysisResult = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
      },
      settings: { count: undefined },
      blocks: { count: undefined },
      presets: { count: undefined },
    },
    documents: [],
  });

  const input = buildValidationRuleInputFromAnalysis({
    trustedGuideUris: ["shopify://guides/sections"],
    analysisResult,
  });

  assert.equal(input.facts.settings.count, 0);
  assert.equal(input.facts.blocks.count, 0);
  assert.equal(input.facts.presets.count, 0);
  assert.equal(input.facts.settings.exists, false);
  assert.equal(input.facts.blocks.exists, false);
  assert.equal(input.facts.presets.exists, false);
});

test("buildValidationRuleInputFromAnalysis enforces schema invalid when schema is absent", () => {
  const analysisResult = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: false,
        isValid: true,
      },
    },
    documents: [],
  });

  const input = buildValidationRuleInputFromAnalysis({
    trustedGuideUris: ["shopify://guides/sections"],
    analysisResult,
  });

  assert.equal(input.facts.schema.exists, false);
  assert.equal(input.facts.schema.isValid, false);
});

test("buildValidationRuleInputFromAnalysis deduplicates guide URIs and structural warnings", () => {
  const analysisResult = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
        errors: ["missing_blocks", "missing_blocks"],
      },
      structuralWarningCodes: ["duplicate_ids", "duplicate_ids"],
    },
    documents: [],
  });

  const input = buildValidationRuleInputFromAnalysis({
    trustedGuideUris: [
      "shopify://guides/sections",
      "shopify://guides/sections",
      "shopify://guides/blocks",
    ],
    analysisResult,
  });

  assert.deepEqual(input.trustedGuideUris, [
    "shopify://guides/sections",
    "shopify://guides/blocks",
  ]);
  assert.deepEqual(input.facts.structuralWarnings, ["duplicate_ids"]);
});
