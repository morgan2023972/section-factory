import type { ValidationIssue } from "./types";

function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue, index) => {
      const path = issue.path?.trim() || `issue[${index}]`;
      const message = issue.message?.trim() || "Unknown issue";
      const severity = issue.severity ? ` [${issue.severity}]` : "";
      return `${index + 1}. ${path}: ${message}${severity}`;
    })
    .join("\n");
}

export function buildRepairPrompt(params: {
  sectionType: string;
  previousCode: string;
  blockingIssues: ValidationIssue[];
  shopifyRules: string;
  attemptNumber: number;
  maxRetries: number;
}): string {
  const formattedIssues = formatIssues(params.blockingIssues);

  return [
    "You are repairing an invalid Shopify section.",
    `Section type: ${params.sectionType}`,
    `Attempt: ${params.attemptNumber}/${params.maxRetries}`,
    "",
    "Fix all blocking issues listed below.",
    formattedIssues,
    "",
    "Output rules:",
    "- Return only final section code.",
    "- No markdown, no explanations.",
    "- Keep valid Liquid syntax.",
    "- Include a valid {% schema %}...{% endschema %} block.",
    "",
    "Project and Shopify constraints:",
    params.shopifyRules.trim(),
    "",
    "Code to repair:",
    params.previousCode,
  ].join("\n");
}
