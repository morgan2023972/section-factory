import { validateDesignSystemCompliance } from "./designSystemValidator";
import {
  runAstRuleRouter,
  type AstValidationPhase,
  type SectionValidationDiagnostic,
} from "./validation/ruleRouter";

export interface SectionValidationResult {
  isValid: boolean;
  errors: string[];
  diagnostics?: SectionValidationDiagnostic[];
}

export interface SectionValidationOptions {
  designSystemEnabled?: boolean;
  astValidationPhase?: AstValidationPhase;
}

function extractSchemaContent(sectionCode: string): string | null {
  const match = sectionCode.match(
    /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i,
  );

  if (!match) {
    return null;
  }

  return match[1].trim();
}

function extractCssContent(sectionCode: string): string {
  const styleBlockMatches =
    sectionCode.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];

  return styleBlockMatches
    .map((block) =>
      block
        .replace(/^<style[^>]*>/i, "")
        .replace(/<\/style>$/i, "")
        .trim(),
    )
    .join("\n");
}

function extractJsContent(sectionCode: string): string {
  const scriptBlockMatches =
    sectionCode.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  return scriptBlockMatches.join("\n");
}

function getGlobalCssSelectors(cssContent: string): string[] {
  const normalizedCss = cssContent.replace(
    /\{\{\s*section\.id\s*\}\}/g,
    "SECTION_ID",
  );
  const disallowedSelectors: string[] = [];
  const selectorRegex = /(^|})\s*([^@{}][^{]+)\{/g;
  let match: RegExpExecArray | null;

  while ((match = selectorRegex.exec(normalizedCss)) !== null) {
    const selectorGroup = match[2];
    const selectors = selectorGroup
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);

    for (const selector of selectors) {
      const normalizedSelector = selector.replace(/\s+/g, " ").trim();
      const lower = normalizedSelector.toLowerCase();

      // Ignore malformed declaration fragments that are not selectors.
      if (
        normalizedSelector.includes(";") ||
        normalizedSelector.startsWith("@") ||
        /^[a-z-]+\s*:\s+.+$/i.test(normalizedSelector)
      ) {
        continue;
      }

      if (/^(from|to|\d+%)$/.test(lower)) {
        continue;
      }

      if (
        !normalizedSelector.startsWith(".section-SECTION_ID") &&
        !normalizedSelector.includes(".section-SECTION_ID")
      ) {
        disallowedSelectors.push(normalizedSelector);
      }
    }
  }

  return disallowedSelectors;
}

function validateSchemaConfigurability(
  schemaContent: string,
  errors: string[],
): void {
  try {
    const schema = JSON.parse(schemaContent) as {
      name?: unknown;
      settings?: unknown;
      blocks?: unknown;
      presets?: unknown;
    };

    if (typeof schema.name !== "string" || !schema.name.trim()) {
      errors.push("Schema must include a non-empty name.");
    }

    if (!Array.isArray(schema.settings)) {
      errors.push("Schema must include a settings array.");
    }

    if (!Array.isArray(schema.blocks)) {
      errors.push("Schema must include a blocks array.");
    }

    if (!Array.isArray(schema.presets)) {
      errors.push("Schema must include a presets array.");
    }

    if (
      Array.isArray(schema.settings) &&
      Array.isArray(schema.blocks) &&
      schema.settings.length === 0 &&
      schema.blocks.length === 0
    ) {
      errors.push(
        "Section is not configurable: schema settings and blocks are both empty.",
      );
    }
  } catch {
    errors.push("Schema JSON is invalid.");
  }
}

function validateMobileUx(cssContent: string, errors: string[]): void {
  if (!cssContent.trim()) {
    return;
  }

  const hasMediaQueries = /@media\b/i.test(cssContent);
  if (!hasMediaQueries) {
    errors.push("Mobile UX issue: missing responsive @media rules.");
  }

  const hasWideFixedWidths = /(?:min-)?width\s*:\s*(?:[89]\d\d|\d{4,})px/i.test(
    cssContent,
  );
  if (hasWideFixedWidths) {
    errors.push("Mobile UX issue: fixed large pixel widths detected.");
  }

  const multiColumnGrid =
    /grid-template-columns\s*:\s*repeat\(\s*([3-9]|\d{2,})\s*,/i.exec(
      cssContent,
    );
  if (multiColumnGrid && !/@media\b[^\{]*max-width/i.test(cssContent)) {
    errors.push(
      "Mobile UX issue: multi-column grid without mobile max-width override.",
    );
  }
}

function validateComplexity(
  sectionCode: string,
  cssContent: string,
  jsContent: string,
  errors: string[],
): void {
  const htmlTagCount = (sectionCode.match(/<([a-z][a-z0-9-]*)\b/gi) || [])
    .length;
  const cssRuleCount = (cssContent.match(/{/g) || []).length;
  const jsLineCount = jsContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  if (
    sectionCode.length > 30000 ||
    htmlTagCount > 180 ||
    cssRuleCount > 120 ||
    jsLineCount > 200
  ) {
    errors.push(
      "Section is too complex: reduce markup, CSS, or JavaScript complexity.",
    );
  }
}

export function validateSectionCode(
  sectionCode: string,
  options?: SectionValidationOptions,
): SectionValidationResult {
  const errors: string[] = [];
  const diagnostics: SectionValidationDiagnostic[] = [];

  if (!sectionCode || !sectionCode.trim()) {
    return {
      isValid: false,
      errors: ["Section code is empty."],
    };
  }

  const schemaContent = extractSchemaContent(sectionCode);
  if (!schemaContent) {
    errors.push(
      "Missing Shopify schema tags: {% schema %} ... {% endschema %}.",
    );
  } else {
    validateSchemaConfigurability(schemaContent, errors);
  }

  const jsContent = extractJsContent(sectionCode);
  if (
    /\bdocument\.(querySelector|querySelectorAll|getElementById|getElementsByClassName|getElementsByTagName)\b/.test(
      jsContent,
    )
  ) {
    errors.push("Global JS access via document.* selectors is not allowed.");
  }

  if (
    /\bwindow\s*\./.test(jsContent) ||
    /(^|[^.\w$])addEventListener\s*\(/.test(jsContent)
  ) {
    errors.push(
      "Global JS access is not allowed: scope JS to the section element.",
    );
  }

  const cssContent = extractCssContent(sectionCode);

  if (!/section\.id/.test(cssContent)) {
    errors.push("CSS must use section.id for scoping.");
  }

  if (!/\.section-\{\{\s*section\.id\s*\}\}/.test(cssContent)) {
    errors.push('CSS must be scoped with ".section-{{ section.id }}".');
  }

  const globalSelectors = getGlobalCssSelectors(cssContent);
  if (globalSelectors.length > 0) {
    const sample = globalSelectors.slice(0, 3).join(", ");
    errors.push(`Global CSS selectors are not allowed: ${sample}`);
  }

  validateMobileUx(cssContent, errors);
  validateComplexity(sectionCode, cssContent, jsContent, errors);

  const astValidation = runAstRuleRouter(
    sectionCode,
    options?.astValidationPhase,
  );
  diagnostics.push(...astValidation.diagnostics);
  errors.push(...astValidation.blockingErrors);

  if (options?.designSystemEnabled) {
    const designValidation = validateDesignSystemCompliance(sectionCode);
    errors.push(...designValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}
