import type { GuideResource } from "../../catalog/types.js";
import type { AnalysisResult } from "./analysisTypes.js";
import type { TechnicalGuidanceItem } from "./guidanceTypes.js";

export function buildTechnicalGuidance(input: {
  guides: readonly GuideResource[];
  analysisResult?: AnalysisResult;
}): TechnicalGuidanceItem[] {
  const sourceUrls = input.guides.map((guide) => guide.uri);

  const base: TechnicalGuidanceItem[] = [
    {
      id: "os2-compatibility",
      title: "OS 2.0 compatibility",
      category: "compatibility",
      message:
        "Sections should behave correctly in JSON templates and editor contexts.",
      recommendation:
        "Avoid rigid template assumptions and scope CSS and JS to section instance.",
      sourceUrls,
    },
    {
      id: "theme-assumption-avoidance",
      title: "Avoid theme-specific assumptions",
      category: "portability",
      message: "Hardcoded theme dependencies reduce portability.",
      recommendation:
        "Avoid global selectors and assumptions about specific theme structures.",
      sourceUrls,
    },
    {
      id: "liquid-pattern-sanity",
      title: "Liquid patterns should be reasonable",
      category: "liquid-pattern",
      message: "Defensive Liquid patterns prevent runtime issues.",
      recommendation:
        "Use defaults and conditional rendering around optional settings and blocks.",
      sourceUrls,
    },
  ];

  const hasIncompleteSchemaAnalysis =
    input.analysisResult?.limitations.some(
      (limitation) => limitation.code === "schema_analysis_incomplete",
    ) ?? false;

  if (hasIncompleteSchemaAnalysis) {
    base.push({
      id: "analysis-completeness",
      title: "Improve analysis completeness",
      category: "structure",
      message:
        "Analysis reports incomplete schema signals; results should be treated with caution.",
      recommendation:
        "Provide explicit schema existence and validity signals before generation.",
      sourceUrls,
    });
  }

  return base;
}
