import type {
  DiagnosticSeverity,
  ValidationReasonCode,
} from "../rules/types.js";

interface BaseStructuredDiagnostic {
  readonly id: string;
  readonly title: string;
  readonly severity: DiagnosticSeverity;
  readonly recommendation: string;
  readonly sourceUrls: readonly string[];
  readonly message: string;
  readonly reasons?: readonly ValidationReasonCode[];
  readonly legacyOrigin: "core-rule";
}

export interface BusinessDiagnostic extends BaseStructuredDiagnostic {
  readonly category: "business";
  readonly blocking: boolean;
}

export interface QualityDiagnostic extends BaseStructuredDiagnostic {
  readonly category: "quality";
  readonly blocking: false;
}

export type StructuredValidationDiagnostic =
  | BusinessDiagnostic
  | QualityDiagnostic;
