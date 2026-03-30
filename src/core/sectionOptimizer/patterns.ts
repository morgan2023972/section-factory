import { type OptimizationSuggestion } from "./types";

function countOccurrences(input: string, pattern: RegExp): number {
  return (input.match(pattern) || []).length;
}

export function collectPatternSuggestions(
  sectionCode: string,
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  const buttonSelectors = countOccurrences(
    sectionCode,
    /\.section-\{\{\s*section\.id\s*\}\}__[a-z0-9-]*?(button|cta|btn)/gi,
  );
  if (buttonSelectors >= 2) {
    suggestions.push({
      type: "reusability",
      message:
        "Multiple CTA/button selectors detected. Consider extracting a reusable button style token set.",
    });
  }

  const mediaQueryCount = countOccurrences(sectionCode, /@media\b/gi);
  if (mediaQueryCount >= 3) {
    suggestions.push({
      type: "reusability",
      message:
        "Repeated media queries detected. Consider consolidating breakpoints for better maintainability.",
    });
  }

  return suggestions;
}
