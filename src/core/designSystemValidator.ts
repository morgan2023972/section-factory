export interface DesignValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateDesignSystemCompliance(
  sectionCode: string,
): DesignValidationResult {
  const errors: string[] = [];

  const styleBlocks =
    sectionCode.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const cssContent = styleBlocks.join("\n");

  if (!cssContent.trim()) {
    errors.push("Missing CSS style block for design system rules.");
  }

  if (cssContent.trim() && !/@media\s*\(/i.test(cssContent)) {
    errors.push("Design system expects responsive CSS using @media rules.");
  }

  if (
    cssContent.trim() &&
    !/(transition\s*:|animation\s*:|@keyframes)/i.test(cssContent)
  ) {
    errors.push("Design system expects animation or transition rules.");
  }

  if (cssContent.trim() && !/--[a-z0-9-]+\s*:/i.test(cssContent)) {
    errors.push("Design system expects CSS tokens via custom properties.");
  }

  if (
    cssContent.trim() &&
    !/\.section-\{\{\s*section\.id\s*\}\}[^{]*\b(button|\.btn)/i.test(
      cssContent,
    )
  ) {
    errors.push(
      "Design system expects button styling scoped under .section-{{ section.id }}.",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
