import { analyzedField, type AnalyzedField } from "./types.js";

export function mapOptionalBoolean(
  value: boolean | undefined,
): AnalyzedField<boolean> {
  if (value === true) {
    return analyzedField({ state: "present", value: true, confidence: "high" });
  }

  if (value === false) {
    return analyzedField({ state: "absent", value: false, confidence: "high" });
  }

  return analyzedField({
    state: "unknown",
    confidence: "low",
    note: "Boolean signal is missing.",
  });
}

export function mapCountToAnalyzedField(
  value: number | undefined,
): AnalyzedField<number> {
  if (typeof value !== "number") {
    return analyzedField({
      state: "unknown",
      confidence: "low",
      note: "Count signal is missing.",
    });
  }

  if (!Number.isFinite(value) || value < 0) {
    return analyzedField({
      state: "invalid",
      confidence: "high",
      note: "Count signal is malformed.",
    });
  }

  return analyzedField({
    state: "present",
    value: Math.trunc(value),
    confidence: "high",
  });
}

export function resolveCountCompatibility(
  analyzed: AnalyzedField<number>,
  fallback = 0,
): number {
  if (analyzed.state === "present" && typeof analyzed.value === "number") {
    return analyzed.value;
  }

  return fallback;
}

export function resolveBooleanCompatibility(
  analyzed: AnalyzedField<boolean>,
  fallback: boolean,
): boolean {
  if (typeof analyzed.value === "boolean") {
    return analyzed.value;
  }

  if (analyzed.state === "present") {
    return true;
  }

  if (analyzed.state === "absent" || analyzed.state === "invalid") {
    return false;
  }

  return fallback;
}

export function mapSchemaValidity(input: {
  schemaExists: AnalyzedField<boolean>;
  explicitIsValid?: boolean;
  legacyIsValid?: boolean;
  hasKnownErrors: boolean;
}): AnalyzedField<boolean> {
  if (input.schemaExists.state === "absent") {
    return analyzedField({ state: "absent", value: false, confidence: "high" });
  }

  if (input.schemaExists.state === "unknown") {
    return analyzedField({
      state: "unknown",
      confidence: "low",
      note: "Schema presence is unknown.",
    });
  }

  if (input.explicitIsValid === true || input.legacyIsValid === true) {
    return analyzedField({ state: "present", value: true, confidence: "high" });
  }

  if (input.explicitIsValid === false || input.legacyIsValid === false) {
    return analyzedField({
      state: "invalid",
      value: false,
      confidence: "high",
    });
  }

  if (input.hasKnownErrors) {
    return analyzedField({
      state: "invalid",
      value: false,
      confidence: "medium",
      note: "Schema errors imply invalid state.",
    });
  }

  return analyzedField({
    state: "unknown",
    confidence: "low",
    note: "Schema validity is not explicit.",
  });
}
