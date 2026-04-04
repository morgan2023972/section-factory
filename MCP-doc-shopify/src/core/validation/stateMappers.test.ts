import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCountToAnalyzedField,
  mapOptionalBoolean,
  mapSchemaValidity,
  resolveBooleanCompatibility,
  resolveCountCompatibility,
} from "./stateMappers.js";

test("mapOptionalBoolean returns present/absent/unknown", () => {
  assert.equal(mapOptionalBoolean(true).state, "present");
  assert.equal(mapOptionalBoolean(false).state, "absent");
  assert.equal(mapOptionalBoolean(undefined).state, "unknown");
});

test("mapCountToAnalyzedField handles present/unknown/invalid", () => {
  assert.equal(mapCountToAnalyzedField(3).state, "present");
  assert.equal(mapCountToAnalyzedField(undefined).state, "unknown");
  assert.equal(mapCountToAnalyzedField(-1).state, "invalid");
  assert.equal(mapCountToAnalyzedField(Number.NaN).state, "invalid");
});

test("compatibility resolvers preserve legacy defaults", () => {
  const unknownCount = mapCountToAnalyzedField(undefined);
  const unknownBoolean = mapOptionalBoolean(undefined);

  assert.equal(resolveCountCompatibility(unknownCount, 0), 0);
  assert.equal(resolveBooleanCompatibility(unknownBoolean, true), true);
  assert.equal(resolveBooleanCompatibility(unknownBoolean, false), false);
});

test("mapSchemaValidity keeps unknown distinct from invalid", () => {
  const schemaExists = mapOptionalBoolean(true);

  const unknownValidity = mapSchemaValidity({
    schemaExists,
    explicitIsValid: undefined,
    legacyIsValid: undefined,
    hasKnownErrors: false,
  });
  assert.equal(unknownValidity.state, "unknown");

  const invalidValidity = mapSchemaValidity({
    schemaExists,
    explicitIsValid: undefined,
    legacyIsValid: undefined,
    hasKnownErrors: true,
  });
  assert.equal(invalidValidity.state, "invalid");
});
