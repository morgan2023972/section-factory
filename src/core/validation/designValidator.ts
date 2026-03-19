// FILE: src/core/validation/designValidator.ts

/**
 * Contexte :
 * Validator pour sections Shopify générées par IA.
 * Doit supporter deux modes :
 * - strict
 * - non-strict
 */

import { isKnownSectionType } from "../section-types/registry";

export type ValidationMode = "strict" | "non-strict";

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface SectionInput {
  type?: string;
  schema?: any;
  content?: any;
}

/**
 * Helper pour gérer strict / non-strict
 */
function pushIssue(
  result: ValidationResult,
  issue: ValidationIssue,
  mode: ValidationMode,
  isCritical: boolean,
) {
  if (isCritical) {
    result.errors.push(issue);
    return;
  }

  if (mode === "strict") {
    result.errors.push(issue);
  } else {
    result.warnings.push(issue);
  }
}

/**
 * VALIDATOR PRINCIPAL
 */
export function validateSection(
  section: SectionInput,
  mode: ValidationMode = "strict",
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // --- type obligatoire
  if (!section.type) {
    pushIssue(
      result,
      { path: "type", message: "Section type is required", severity: "error" },
      mode,
      true,
    );
  } else if (!isKnownSectionType(section.type)) {
    pushIssue(
      result,
      {
        path: "type",
        message: `Unknown section type: ${section.type}`,
        severity: "warning",
      },
      mode,
      false,
    );
  }

  // --- schema obligatoire
  if (!section.schema) {
    pushIssue(
      result,
      {
        path: "schema",
        message: "Schema is required",
        severity: "error",
      },
      mode,
      true,
    );
  }

  // --- settings
  if (section.schema && !Array.isArray(section.schema.settings)) {
    pushIssue(
      result,
      {
        path: "schema.settings",
        message: "Settings must be an array",
        severity: "error",
      },
      mode,
      true,
    );
  }

  // --- limite settings (design rule)
  if (section.schema?.settings?.length > 20) {
    pushIssue(
      result,
      {
        path: "schema.settings",
        message: "Too many settings (max 20 recommended)",
        severity: "warning",
      },
      mode,
      false,
    );
  }

  result.isValid = result.errors.length === 0;

  return result;
}
