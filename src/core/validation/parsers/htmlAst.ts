import { parseDocument } from "htmlparser2";

export interface HtmlAstIssue {
  ruleId: string;
  message: string;
  path: string;
  confidence: "low" | "medium" | "high";
}

function removeNonHtmlSegments(sectionCode: string): string {
  return sectionCode
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/gi, "");
}

export function validateHtmlAst(sectionCode: string): HtmlAstIssue[] {
  const issues: HtmlAstIssue[] = [];
  const html = removeNonHtmlSegments(sectionCode);

  const doc = parseDocument(html);
  let hasHeading = false;
  let imageWithoutAltFound = false;

  const stack = [...doc.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || node.type !== "tag") {
      if (node && "children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          stack.push(child);
        }
      }
      continue;
    }

    const tagName = String(node.name || "").toLowerCase();
    if (/^h[1-6]$/.test(tagName)) {
      hasHeading = true;
    }

    if (tagName === "img") {
      const attribs =
        "attribs" in node && node.attribs && typeof node.attribs === "object"
          ? (node.attribs as Record<string, string | undefined>)
          : {};
      if (attribs.alt === undefined) {
        imageWithoutAltFound = true;
      }
    }

    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        stack.push(child);
      }
    }
  }

  if (!hasHeading) {
    issues.push({
      ruleId: "ast.a11y.heading_missing",
      message:
        "AST check: no heading tag (h1-h6) detected. Consider semantic heading structure.",
      path: "markup",
      confidence: "low",
    });
  }

  if (imageWithoutAltFound) {
    issues.push({
      ruleId: "ast.a11y.image_alt_missing",
      message: "AST check: image tag without alt attribute detected.",
      path: "markup",
      confidence: "medium",
    });
  }

  return issues;
}
