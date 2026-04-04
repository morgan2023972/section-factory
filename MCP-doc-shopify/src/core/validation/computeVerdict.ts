import type { AnalysisLimitation } from "./analysisTypes.js";
import type { StructuredValidationDiagnostic } from "./diagnosticsTypes.js";
import type { InconclusiveSignal, ValidationVerdict } from "./reportTypes.js";

export function computeVerdict(input: {
  diagnostics: readonly StructuredValidationDiagnostic[];
  analysisLimitations: readonly AnalysisLimitation[];
  criticalUnknownSignals: readonly string[];
}): {
  verdict: ValidationVerdict;
  inconclusiveSignals: InconclusiveSignal[];
} {
  const blockingBusiness = input.diagnostics.filter(
    (diag) => diag.category === "business" && diag.blocking,
  );

  if (blockingBusiness.length > 0) {
    return {
      verdict: "fail",
      inconclusiveSignals: [],
    };
  }

  const inconclusiveSignals: InconclusiveSignal[] = [];

  for (const limitation of input.analysisLimitations) {
    if (limitation.impact === "high") {
      inconclusiveSignals.push({
        code: `limitation_${limitation.code}`,
        message: limitation.message,
      });
    }
  }

  for (const signal of input.criticalUnknownSignals) {
    inconclusiveSignals.push({
      code: `critical_unknown_${signal}`,
      message: `Critical decision field is unknown: ${signal}`,
    });
  }

  if (inconclusiveSignals.length > 0) {
    return {
      verdict: "inconclusive",
      inconclusiveSignals,
    };
  }

  const hasWarnings = input.diagnostics.some(
    (diag) => diag.severity === "warning",
  );

  return {
    verdict: hasWarnings ? "pass_with_warnings" : "pass",
    inconclusiveSignals: [],
  };
}
