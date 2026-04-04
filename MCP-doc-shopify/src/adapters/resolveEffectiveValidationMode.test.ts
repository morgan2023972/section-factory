import assert from "node:assert/strict";
import test from "node:test";

import { resolveEffectiveValidationMode } from "./resolveEffectiveValidationMode.js";

test("resolveEffectiveValidationMode keeps requested mode when not forced", () => {
  const resolution = resolveEffectiveValidationMode({
    requestedMode: "full",
    env: {},
  });

  assert.equal(resolution.requestedMode, "full");
  assert.equal(resolution.effectiveMode, "full");
  assert.equal(resolution.forcedByConfig, false);
});

test("resolveEffectiveValidationMode forces report-only from env", () => {
  const resolution = resolveEffectiveValidationMode({
    requestedMode: "full",
    env: { VALIDATION_FORCE_REPORT_ONLY: "true" } as NodeJS.ProcessEnv,
  });

  assert.equal(resolution.requestedMode, "full");
  assert.equal(resolution.effectiveMode, "report-only");
  assert.equal(resolution.forcedByConfig, true);
});

test("resolveEffectiveValidationMode keeps report-only when already requested", () => {
  const resolution = resolveEffectiveValidationMode({
    requestedMode: "report-only",
    env: {},
  });

  assert.equal(resolution.requestedMode, "report-only");
  assert.equal(resolution.effectiveMode, "report-only");
  assert.equal(resolution.forcedByConfig, false);
});
