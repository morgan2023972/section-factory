export interface DesignValidationIssue {
  path: string;
  message: string;
}

export interface DesignValidationResult {
  isValid: boolean;
  issues: DesignValidationIssue[];
  errors: string[];
}

export function validateDesignSystemCompliance(
  sectionCode: unknown,
): DesignValidationResult {
  const issues: DesignValidationIssue[] = [];
  const pushIssue = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  const source = typeof sectionCode === "string" ? sectionCode : "";

  if (typeof sectionCode !== "string") {
    pushIssue("sectionCode", "Section code must be a string.");
  }

  const styleBlocks = source.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const cssContent = styleBlocks.join("\n");

  if (!cssContent.trim()) {
    pushIssue("style", "Missing CSS style block for design system rules.");
  }

  if (cssContent.trim() && !/@media\s*\(/i.test(cssContent)) {
    pushIssue(
      "style.@media",
      "Design system expects responsive CSS using @media rules.",
    );
  }

  if (
    cssContent.trim() &&
    !/(transition\s*:|animation\s*:|@keyframes)/i.test(cssContent)
  ) {
    pushIssue(
      "style.motion",
      "Design system expects animation or transition rules.",
    );
  }

  if (cssContent.trim() && !/--[a-z0-9-]+\s*:/i.test(cssContent)) {
    pushIssue(
      "style.tokens",
      "Design system expects CSS tokens via custom properties.",
    );
  }

  if (
    cssContent.trim() &&
    !/\.section-\{\{\s*section\.id\s*\}\}[^{]*\b(button|\.btn)/i.test(
      cssContent,
    )
  ) {
    pushIssue(
      "style.buttonScope",
      "Design system expects button styling scoped under .section-{{ section.id }}.",
    );
  }

  const errors = issues.map((issue) => issue.message);

  return {
    isValid: issues.length === 0,
    issues,
    errors,
  };
}
