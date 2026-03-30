import { type SafetyIssue } from "./types";

export function auditCrossThemeSafety(sectionCode: string): SafetyIssue[] {
  const issues: SafetyIssue[] = [];

  if (/(^|\s)(body|html)\s*\{/im.test(sectionCode)) {
    issues.push({
      severity: "high",
      category: "global-selector",
      location: "style",
      description:
        "Global theme selectors (body/html) may impact all templates.",
      fix: "Scope selectors under .section-{{ section.id }}.",
    });
  }

  if (/#[0-9a-f]{3,6}\b/i.test(sectionCode)) {
    issues.push({
      severity: "low",
      category: "hardcoded-colors",
      location: "style",
      description:
        "Hardcoded color values detected. Theme settings or CSS variables improve reusability.",
      fix: "Prefer CSS variables or section settings for theme color compatibility.",
    });
  }

  if (/(?:min-)?width\s*:\s*(?:[89]\d\d|\d{4,})px/i.test(sectionCode)) {
    issues.push({
      severity: "medium",
      category: "fixed-width",
      location: "style",
      description:
        "Large fixed pixel widths detected. This may break responsive behavior on some themes.",
      fix: "Use fluid widths and breakpoint-aware overrides.",
    });
  }

  if (/\bwindow\s*\./.test(sectionCode)) {
    issues.push({
      severity: "high",
      category: "global-js",
      location: "script",
      description:
        "Global window access detected. This can conflict across theme contexts.",
      fix: "Scope JavaScript to the section root element.",
    });
  }

  return issues;
}
