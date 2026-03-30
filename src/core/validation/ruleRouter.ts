import { validateCssAst } from "./parsers/cssAst";
import { validateHtmlAst } from "./parsers/htmlAst";
import { validateJsAst } from "./parsers/jsAst";
import { resolveAstRuleSeverity } from "./astRuleConfig";

export type AstValidationPhase = "off" | "advisory" | "warn" | "block";

export interface SectionValidationDiagnostic {
  source: "ast-light-v1";
  ruleId: string;
  path: string;
  severity: "warning" | "error";
  message: string;
  confidence: "low" | "medium" | "high";
}

export interface AstRuleRouterResult {
  diagnostics: SectionValidationDiagnostic[];
  blockingErrors: string[];
}

function normalizePhase(phase?: AstValidationPhase): AstValidationPhase {
  return phase ?? "off";
}

function toSeverity(
  phase: AstValidationPhase,
  confidence: "low" | "medium" | "high",
): "warning" | "error" {
  if (phase !== "block") {
    return "warning";
  }

  return confidence === "high" ? "error" : "warning";
}

function resolveDiagnosticSeverity(
  phase: AstValidationPhase,
  ruleId: string,
  confidence: "low" | "medium" | "high",
): "warning" | "error" | null {
  if (phase === "off") {
    return null;
  }

  const configured = resolveAstRuleSeverity(ruleId, phase);
  if (configured === "off") {
    return null;
  }

  if (configured === "warning" || configured === "error") {
    return configured;
  }

  return toSeverity(phase, confidence);
}

export function runAstRuleRouter(
  sectionCode: string,
  phase?: AstValidationPhase,
): AstRuleRouterResult {
  const activePhase = normalizePhase(phase);
  if (activePhase === "off") {
    return {
      diagnostics: [],
      blockingErrors: [],
    };
  }

  const astIssues = [
    ...validateCssAst(sectionCode),
    ...validateJsAst(sectionCode),
    ...validateHtmlAst(sectionCode),
  ];

  const diagnostics: SectionValidationDiagnostic[] = astIssues
    .map((issue) => {
      const severity = resolveDiagnosticSeverity(
        activePhase,
        issue.ruleId,
        issue.confidence,
      );

      if (!severity) {
        return null;
      }

      return {
        source: "ast-light-v1",
        ruleId: issue.ruleId,
        path: issue.path,
        severity,
        message: issue.message,
        confidence: issue.confidence,
      } satisfies SectionValidationDiagnostic;
    })
    .filter(
      (diagnostic): diagnostic is SectionValidationDiagnostic =>
        diagnostic !== null,
    );

  const blockingErrors = diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

  return {
    diagnostics,
    blockingErrors,
  };
}
