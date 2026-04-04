import assert from "node:assert/strict";
import test from "node:test";

import { mapInternalDiagnosticToStructured } from "./diagnosticMappers.js";
import type { InternalValidationDiagnostic } from "../rules/types.js";

function coreDiag(id: string, blocking: boolean): InternalValidationDiagnostic {
  return {
    id,
    origin: "core-rule",
    severity: blocking ? "error" : "warning",
    blocking,
    title: id,
    message: `message ${id}`,
    recommendation: `recommendation ${id}`,
    sourceUrls: ["shopify://guides/sections"],
  };
}

test("maps schema-required to business diagnostic", () => {
  const mapped = mapInternalDiagnosticToStructured(
    coreDiag("schema-required", true),
  );

  assert.equal(mapped?.category, "business");
  assert.equal(mapped?.legacyOrigin, "core-rule");
});

test("maps presets-availability to quality diagnostic", () => {
  const mapped = mapInternalDiagnosticToStructured(
    coreDiag("presets-availability", false),
  );

  assert.equal(mapped?.category, "quality");
  assert.equal(mapped?.blocking, false);
});

test("returns null for non core-rule diagnostics", () => {
  const technical: InternalValidationDiagnostic = {
    id: "os2-compatibility",
    origin: "technical",
    severity: "warning",
    blocking: false,
    title: "OS2",
    message: "message",
    recommendation: "recommendation",
    sourceUrls: [],
  };

  const mapped = mapInternalDiagnosticToStructured(technical);
  assert.equal(mapped, null);
});

test("throws when a core-rule is not reclassified", () => {
  assert.throws(
    () =>
      mapInternalDiagnosticToStructured({
        id: "unclassified-core-rule",
        origin: "core-rule",
        severity: "warning",
        blocking: false,
        title: "unclassified",
        message: "message",
        recommendation: "recommendation",
        sourceUrls: [],
      }),
    /Unclassified core-rule diagnostic/,
  );
});
