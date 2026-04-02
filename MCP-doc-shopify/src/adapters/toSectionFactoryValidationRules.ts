import { readLocalDocsIndex } from "../catalog/localDocsIndex.js";
import { shopifyDocsProvider } from "../catalog/provider.js";
import type { GuideResource } from "../catalog/types.js";
import type { NormalizedDocFile } from "../pipeline/types.js";
import type {
  BuildSectionFactoryValidationRulesInput,
  SectionFactoryValidationRule,
  SectionFactoryValidationRulesPayload,
} from "./types.js";

function uniqueRules(
  rules: SectionFactoryValidationRule[],
): SectionFactoryValidationRule[] {
  const byId = new Map<string, SectionFactoryValidationRule>();
  for (const rule of rules) {
    if (!byId.has(rule.id)) {
      byId.set(rule.id, rule);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const BASELINE_RULES: SectionFactoryValidationRule[] = [
  {
    id: "schema-required",
    title: "Section schema is required",
    severity: "error",
    rationale: "Shopify sections require a valid schema block.",
    recommendation:
      "Ensure {% schema %} ... {% endschema %} exists and JSON is valid.",
    sourceUrls: [],
  },
  {
    id: "settings-coherence",
    title: "Settings should be coherent",
    severity: "warning",
    rationale: "Settings must be clear and configurable for merchants.",
    recommendation:
      "Keep setting ids explicit, labels clear, and defaults reasonable.",
    sourceUrls: [],
  },
  {
    id: "presets-availability",
    title: "Presets should be present",
    severity: "warning",
    rationale: "Presets improve section discoverability in the editor.",
    recommendation:
      "Add at least one practical preset when section is merchant-facing.",
    sourceUrls: [],
  },
  {
    id: "os2-compatibility",
    title: "OS 2.0 compatibility",
    severity: "warning",
    rationale:
      "Sections should behave correctly in JSON templates and editor contexts.",
    recommendation:
      "Avoid rigid template assumptions and scope CSS and JS to section instance.",
    sourceUrls: [],
  },
  {
    id: "theme-assumption-avoidance",
    title: "Avoid theme-specific assumptions",
    severity: "warning",
    rationale: "Hardcoded theme dependencies reduce portability.",
    recommendation:
      "Avoid global selectors and assumptions about specific theme structures.",
    sourceUrls: [],
  },
  {
    id: "liquid-pattern-sanity",
    title: "Liquid patterns should be reasonable",
    severity: "info",
    rationale: "Defensive Liquid patterns prevent runtime issues.",
    recommendation:
      "Use defaults and conditional rendering around optional settings and blocks.",
    sourceUrls: [],
  },
];

export function buildValidationRulesFromGuides(
  guides: readonly GuideResource[],
): SectionFactoryValidationRule[] {
  if (guides.length === 0) {
    return BASELINE_RULES;
  }

  const sourceUrls = guides.map((guide) => guide.uri);

  return BASELINE_RULES.map((rule) => ({
    ...rule,
    sourceUrls,
  }));
}

export function buildValidationRulesFromDocs(
  docs: readonly NormalizedDocFile[],
): SectionFactoryValidationRule[] {
  const rules: SectionFactoryValidationRule[] = [];

  if (docs.some((doc) => doc.topic === "schema")) {
    rules.push({
      id: "schema-signals",
      title: "Schema signals should be represented",
      severity: "warning",
      rationale:
        "Indexed schema docs mention settings, blocks, presets and OS 2.0 selectors.",
      recommendation:
        "Check schema for settings, blocks, presets, and relevant enabled_on or disabled_on constraints when applicable.",
      sourceUrls: docs
        .filter((doc) => doc.topic === "schema")
        .map((doc) => doc.sourceUrl),
    });
  }

  if (docs.some((doc) => doc.topic === "liquid-reference")) {
    rules.push({
      id: "liquid-reference-alignment",
      title: "Liquid reference alignment",
      severity: "info",
      rationale: "Liquid reference docs are available in local index.",
      recommendation:
        "Prefer standard Liquid tags and filters; avoid brittle custom assumptions.",
      sourceUrls: docs
        .filter((doc) => doc.topic === "liquid-reference")
        .map((doc) => doc.sourceUrl),
    });
  }

  return rules;
}

export function buildSectionFactoryValidationRules(
  input: BuildSectionFactoryValidationRulesInput = {},
): SectionFactoryValidationRulesPayload {
  const guides = input.guides ?? shopifyDocsProvider.listGuideResources();
  const docs = input.documents ?? readLocalDocsIndex().documents;

  const fromGuides = buildValidationRulesFromGuides(guides);
  const fromDocs = buildValidationRulesFromDocs(docs);

  const rules = uniqueRules([...fromGuides, ...fromDocs]);

  return {
    rules,
    fallbackUsed: guides.length === 0 || docs.length === 0,
  };
}
