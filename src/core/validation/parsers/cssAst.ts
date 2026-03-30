import * as postcss from "postcss";

export interface CssAstIssue {
  ruleId: string;
  message: string;
  path: string;
  confidence: "low" | "medium" | "high";
}

function extractCssBlocks(sectionCode: string): string[] {
  const styleBlocks =
    sectionCode.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  return styleBlocks.map((block) =>
    block
      .replace(/^<style[^>]*>/i, "")
      .replace(/<\/style>$/i, "")
      .trim(),
  );
}

export function validateCssAst(sectionCode: string): CssAstIssue[] {
  const issues: CssAstIssue[] = [];
  const cssText = extractCssBlocks(sectionCode).join("\n");

  if (!cssText.trim()) {
    return issues;
  }

  if (!/section\.id/.test(cssText)) {
    issues.push({
      ruleId: "ast.css.section_id_required",
      message: "AST check: CSS should reference section.id for robust scoping.",
      path: "style",
      confidence: "high",
    });
  }

  if (!/\.section-\{\{\s*section\.id\s*\}\}/.test(cssText)) {
    issues.push({
      ruleId: "ast.css.scope_selector_required",
      message:
        'AST check: CSS should include the ".section-{{ section.id }}" scope selector.',
      path: "style",
      confidence: "high",
    });
  }

  const normalizedCss = cssText.replace(
    /\{\{\s*section\.id\s*\}\}/g,
    "SECTION_ID",
  );
  const globalSelectors: string[] = [];

  try {
    const ast = postcss.parse(normalizedCss);

    ast.walkRules((rule) => {
      const isInsideKeyframes =
        rule.parent?.type === "atrule" &&
        "name" in rule.parent &&
        typeof rule.parent.name === "string" &&
        /keyframes/i.test(rule.parent.name);

      if (isInsideKeyframes) {
        return;
      }

      const selectors = rule.selectors ?? [];
      for (const selector of selectors) {
        const normalizedSelector = selector.replace(/\s+/g, " ").trim();
        const lower = normalizedSelector.toLowerCase();

        if (!normalizedSelector || /^(from|to|\d+%)$/.test(lower)) {
          continue;
        }

        if (!normalizedSelector.includes(".section-SECTION_ID")) {
          globalSelectors.push(normalizedSelector);
        }
      }
    });
  } catch {
    issues.push({
      ruleId: "ast.css.parse_failure",
      message:
        "AST check: unable to parse CSS reliably. Keep section styles syntactically valid.",
      path: "style",
      confidence: "low",
    });
    return issues;
  }

  if (globalSelectors.length > 0) {
    issues.push({
      ruleId: "ast.css.global_selector",
      message: `AST check: global CSS selectors detected (${globalSelectors
        .slice(0, 3)
        .join(", ")}).`,
      path: "style",
      confidence: "medium",
    });
  }

  return issues;
}
