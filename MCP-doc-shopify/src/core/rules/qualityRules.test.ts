import assert from "node:assert/strict";
import test from "node:test";

import { evaluateQualityRules } from "./qualityRules.js";
import type { ValidationRuleInput } from "./types.js";

function baseInput(): ValidationRuleInput {
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

test("quality rules emit non-blocking warnings when structure is weak", () => {
  const diagnostics = evaluateQualityRules(baseInput());
  assert.equal(
    diagnostics.some((diag) => diag.id === "settings-coherence"),
    true,
  );
  assert.equal(
    diagnostics.some((diag) => diag.id === "presets-availability"),
    true,
  );
  assert.equal(
    diagnostics.every((diag) => diag.blocking === false),
    true,
  );
});

test("quality rules stay quiet when settings and presets are present", () => {
  const base = baseInput();
  const input: ValidationRuleInput = {
    ...base,
    facts: {
      ...base.facts,
      settings: { exists: true, count: 2 },
      presets: { exists: true, count: 1 },
    },
  };

  const diagnostics = evaluateQualityRules(input);
  assert.equal(diagnostics.length, 0);
});
