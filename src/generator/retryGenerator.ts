import type { ValidationIssue as DesignValidationIssue } from "../core/validation/designValidator";

export type ValidationIssue = Pick<DesignValidationIssue, "path" | "message"> &
  Partial<Pick<DesignValidationIssue, "severity">>;

export interface AISectionClient {
  generateCorrection(prompt: string): Promise<string>;
}

export interface RetryAttempt {
  attemptNumber: number;
  prompt: string;
  inputCode: string;
  outputCode: string | null;
  success: boolean;
  issues: ValidationIssue[];
  errorMessage: string | null;
}

export interface RetryGenerateSectionParams {
  sectionType: string;
  originalCode: string;
  issues: ValidationIssue[];
  shopifyRules: string;
  maxRetries: number;
  generateCorrection: AISectionClient["generateCorrection"];
  validateCandidate: (
    code: string,
  ) => Promise<ValidationIssue[]> | ValidationIssue[];
}

export interface RetryGenerateSectionResult {
  success: boolean;
  finalCode: string | null;
  attempts: RetryAttempt[];
  lastIssues: ValidationIssue[];
}

function toSafePositiveInteger(input: number, fallback: number): number {
  if (!Number.isFinite(input)) {
    return fallback;
  }

  const normalized = Math.floor(input);
  if (normalized < 1) {
    return fallback;
  }

  return normalized;
}

function normalizeIssues(
  issues: ValidationIssue[],
  options?: { fallbackWhenEmpty?: boolean },
): ValidationIssue[] {
  const fallbackWhenEmpty = options?.fallbackWhenEmpty ?? false;

  if (!Array.isArray(issues) || issues.length === 0) {
    if (!fallbackWhenEmpty) {
      return [];
    }

    return [
      {
        path: "unknown",
        message: "Validation failed, but no detailed issues were provided.",
      },
    ];
  }

  return issues.map((issue, index) => ({
    path: issue?.path?.trim() || `issue[${index}]`,
    message: issue?.message?.trim() || "Unknown validation issue",
    ...(issue?.severity ? { severity: issue.severity } : {}),
  }));
}

function formatIssuesForPrompt(issues: ValidationIssue[]): string {
  return issues
    .map((issue, index) => {
      const severityPart = issue.severity ? ` [${issue.severity}]` : "";
      return `${index + 1}. ${issue.path}: ${issue.message}${severityPart}`;
    })
    .join("\n");
}

export function buildRetryPrompt(params: {
  sectionType: string;
  previousCode: string;
  issues: ValidationIssue[];
  shopifyRules: string;
  attemptNumber: number;
  maxRetries: number;
}): string {
  const {
    sectionType,
    previousCode,
    issues,
    shopifyRules,
    attemptNumber,
    maxRetries,
  } = params;

  const formattedIssues = formatIssuesForPrompt(
    normalizeIssues(issues, { fallbackWhenEmpty: true }),
  );

  return [
    "You are fixing an invalid Shopify section.",
    `Section type: ${sectionType}`,
    `Retry attempt: ${attemptNumber}/${maxRetries}`,
    "",
    "The previous generated code is invalid.",
    "Validation issues to fix:",
    formattedIssues,
    "",
    "Required constraints:",
    "- Return ONLY the final Shopify section code (no explanation, no markdown).",
    "- The section must be standalone and reusable.",
    "- The section must be configurable with a valid {% schema %}...{% endschema %} JSON block.",
    "- CSS and JavaScript must be scoped to the section (encapsulated).",
    "- Do not use global CSS selectors or global JS access.",
    "- If JavaScript is needed, use this exact root lookup pattern:",
    "  const root = document.currentScript?.closest('.section-{{ section.id }}');",
    "  if (!root) return;",
    "- After that, only use root.querySelector(...) or root.querySelectorAll(...).",
    "- Never use document.querySelector*, getElementById, getElementsByClassName, getElementsByTagName, window.*, or global addEventListener().",
    "- No external dependencies.",
    "- Keep the output production-ready and valid Liquid/HTML/CSS/JS.",
    "",
    "Shopify and project rules:",
    shopifyRules.trim(),
    "",
    "Previous invalid code to correct:",
    previousCode,
  ].join("\n");
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error while calling AI correction service.";
}

export async function retryGenerateSection(
  params: RetryGenerateSectionParams,
): Promise<RetryGenerateSectionResult> {
  const maxRetries = toSafePositiveInteger(params.maxRetries, 1);
  const attempts: RetryAttempt[] = [];

  let currentCode = (params.originalCode || "").trim();
  let currentIssues = normalizeIssues(params.issues, {
    fallbackWhenEmpty: true,
  });

  for (let attemptNumber = 1; attemptNumber <= maxRetries; attemptNumber += 1) {
    const prompt = buildRetryPrompt({
      sectionType: params.sectionType,
      previousCode: currentCode,
      issues: currentIssues,
      shopifyRules: params.shopifyRules,
      attemptNumber,
      maxRetries,
    });

    try {
      const rawOutput = await params.generateCorrection(prompt);
      const candidateCode = (rawOutput || "").trim();

      if (!candidateCode) {
        attempts.push({
          attemptNumber,
          prompt,
          inputCode: currentCode,
          outputCode: null,
          success: false,
          issues: currentIssues,
          errorMessage: "AI returned an empty response.",
        });
        continue;
      }

      const candidateIssues = normalizeIssues(
        await Promise.resolve(params.validateCandidate(candidateCode)),
      );

      const isValid = candidateIssues.length === 0;

      attempts.push({
        attemptNumber,
        prompt,
        inputCode: currentCode,
        outputCode: candidateCode,
        success: isValid,
        issues: candidateIssues,
        errorMessage: null,
      });

      if (isValid) {
        return {
          success: true,
          finalCode: candidateCode,
          attempts,
          lastIssues: [],
        };
      }

      currentCode = candidateCode;
      currentIssues = candidateIssues;
    } catch (error: unknown) {
      attempts.push({
        attemptNumber,
        prompt,
        inputCode: currentCode,
        outputCode: null,
        success: false,
        issues: currentIssues,
        errorMessage: getReadableErrorMessage(error),
      });
    }
  }

  return {
    success: false,
    finalCode: null,
    attempts,
    lastIssues: currentIssues,
  };
}

/*
Example usage:

import { retryGenerateSection } from "../generator/retryGenerator";
import { validateSectionCode } from "../core/sectionValidator";

const result = await retryGenerateSection({
  sectionType: "hero",
  originalCode,
  issues: initialIssues,
  shopifyRules: shopifyRulesText,
  maxRetries: 3,
  generateCorrection: async (prompt) => {
    return myAiClient.generateCorrection(prompt);
  },
  validateCandidate: (code) => {
    const validation = validateSectionCode(code);
    return validation.errors.map((message) => ({
      path: "section",
      message,
    }));
  },
});

if (result.success) {
  // Export result.finalCode
} else {
  // Log result.attempts and result.lastIssues
}
*/
