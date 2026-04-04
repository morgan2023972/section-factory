import assert from "node:assert/strict";
import test from "node:test";

import type { GuideResource } from "../catalog/types.js";
import type { ShopifyDocsIndex } from "../pipeline/types.js";
import { searchShopifyDocsInIndex } from "../search/searchEngine.js";
import { evaluateCoreRules } from "../core/rules/index.js";
import { buildValidationRuleInput } from "./buildValidationRuleInput.js";
import {
  buildPromptContextFromGuides,
  buildPromptContextFromSearchResults,
  buildSectionFactoryPromptContext,
} from "./toSectionFactoryPromptContext.js";
import {
  buildSectionFactoryValidationRules,
  buildSectionFactoryValidationReport,
  buildValidationRulesFromDocs,
} from "./toSectionFactoryValidationRules.js";
import type { BuildSectionFactoryValidationRulesInput } from "./types.js";

const guides: GuideResource[] = [
  {
    uri: "shopify://guides/sections",
    name: "g-sections",
    title: "Sections Guide",
    description: "Sections best practices",
    markdown: "## Required Structure\n- Include schema\n- Scope CSS and JS",
  },
  {
    uri: "shopify://guides/os2-compatibility",
    name: "g-os2",
    title: "OS2 Guide",
    description: "OS2 compatibility",
    markdown: "## OS 2.0 Checklist\n- Compatible with JSON templates",
  },
];

function mockIndex(): ShopifyDocsIndex {
  return {
    version: "1.0",
    generatedAt: "2026-04-02T00:00:00.000Z",
    sourceCount: 2,
    documentCount: 2,
    documents: [
      {
        id: "doc-schema",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/schema",
        title: "Section schema",
        documentSummary:
          "Schema settings blocks presets enabled_on max_blocks.",
        ruleCandidates: ["Use schema settings and blocks."],
        keywords: ["schema", "settings", "blocks", "presets"],
        chunks: [
          { id: "c1", text: "settings blocks presets enabled_on max_blocks" },
        ],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
        schemaHints: {
          settings: true,
          blocks: true,
          presets: true,
          enabled_on: true,
          disabled_on: false,
          max_blocks: true,
        },
      },
      {
        id: "doc-liquid",
        topic: "liquid-reference",
        sourceUrl: "https://shopify.dev/docs/liquid",
        title: "Liquid reference",
        documentSummary: "Liquid tags and filters.",
        ruleCandidates: ["Use standard liquid patterns."],
        keywords: ["liquid", "filters"],
        chunks: [{ id: "c1", text: "liquid tags filters" }],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
  };
}

test("prompt adapters build compact context from guides and search hits", () => {
  const contextFromGuides = buildPromptContextFromGuides(guides, "hero");
  assert.equal(
    contextFromGuides.includes("Shopify generation constraints"),
    true,
  );
  assert.equal(contextFromGuides.toLowerCase().includes("hero"), true);

  const search = searchShopifyDocsInIndex(
    { query: "schema settings blocks", topic: "schema", limit: 2 },
    mockIndex(),
  );
  const contextFromSearch = buildPromptContextFromSearchResults(search.results);
  assert.equal(contextFromSearch.includes("Top documentary signals"), true);

  const combined = buildSectionFactoryPromptContext({
    guides,
    documents: mockIndex().documents,
    searchResults: search.results,
    sectionCategory: "hero",
    limit: 2,
  });

  assert.equal(combined.promptContext.length > 0, true);
  assert.equal(combined.searchHitCount >= 1, true);
});

test("validation adapter builds stable reusable rules", () => {
  const fromDocs = buildValidationRulesFromDocs(mockIndex().documents);
  assert.equal(
    fromDocs.some((rule) => rule.id === "schema-hints"),
    true,
  );
  assert.equal(
    fromDocs.some((rule) => rule.rationale.includes("[documentary]")),
    true,
  );
  assert.equal(
    fromDocs.every((rule) => rule.severity !== "error"),
    true,
  );

  const combined = buildSectionFactoryValidationRules({
    guides,
    documents: mockIndex().documents,
  });

  assert.equal(combined.rules.length >= fromDocs.length, true);
  assert.equal(
    combined.rules[0].id <= combined.rules[combined.rules.length - 1].id,
    true,
  );
  assert.equal(
    combined.rules.some((rule) => rule.id === "schema-required"),
    true,
  );
  assert.equal(
    combined.rules.some((rule) => rule.rationale.includes("[core-rule]")),
    true,
  );
});

test("ValidationRuleInput is built from reliable internal facts", () => {
  const input = buildValidationRuleInput({
    guides,
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
        errors: [],
      },
      settings: { count: 2 },
      blocks: { count: 1 },
      presets: { count: 1 },
      structuralWarningCodes: ["duplicate_ids"],
    },
  });

  assert.equal(input.facts.schema.exists, true);
  assert.equal(input.facts.schema.isValid, true);
  assert.equal(input.facts.settings.count, 2);
  assert.equal(input.facts.blocks.count, 1);
  assert.equal(input.facts.presets.count, 1);
  assert.deepEqual(input.facts.structuralWarnings, ["duplicate_ids"]);
  assert.equal(input.trustedGuideUris.length, guides.length);
});

test("core rules react to reliable input variations", () => {
  const invalidInput = buildValidationRuleInput({
    guides,
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
    },
  });

  const validInput = buildValidationRuleInput({
    guides,
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
        errors: [],
      },
      settings: { count: 2 },
      blocks: { count: 1 },
      presets: { count: 1 },
    },
  });

  const invalidDiagnostics = evaluateCoreRules(invalidInput);
  const validDiagnostics = evaluateCoreRules(validInput);

  assert.equal(
    invalidDiagnostics.some((diag) => diag.id === "schema-required"),
    true,
  );
  assert.equal(
    validDiagnostics.some((diag) => diag.blocking),
    false,
  );
});

test("missing schema or presets and weak structure produce expected diagnostics", () => {
  const combined = buildSectionFactoryValidationRules({
    guides,
    documents: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
        errors: [],
      },
      settings: { count: 0 },
      blocks: { count: 2 },
      presets: { count: 0 },
    },
  });

  assert.equal(
    combined.rules.some((rule) => rule.id === "presets-availability"),
    true,
  );
  assert.equal(
    combined.rules.some((rule) => rule.id === "settings-coherence"),
    true,
  );
  assert.equal(combined.criticalVerdictBlocked, false);
});

test("core rule reports specific missing_blocks reason when schema is invalid", () => {
  const diagnostics = evaluateCoreRules(
    buildValidationRuleInput({
      guides,
      validationSignals: {
        schema: {
          exists: true,
          isValid: false,
          errors: ["missing_blocks", "invalid_schema_json"],
        },
        settings: { count: 0 },
        blocks: { count: 0 },
        presets: { count: 0 },
      },
    }),
  );

  const schema = diagnostics.find((diag) => diag.id === "schema-required");
  assert.equal(Boolean(schema), true);
  assert.equal((schema?.reasons ?? []).includes("missing_blocks"), true);
  assert.equal(
    (schema?.message ?? "").includes("missing required blocks"),
    true,
  );
});

test("reason codes produce targeted recommendations", () => {
  const combined = buildSectionFactoryValidationRules({
    guides,
    documents: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: false,
        errors: ["missing_blocks", "invalid_schema_json"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
      structuralWarningCodes: ["duplicate_ids"],
    },
  });

  const schemaRule = combined.rules.find(
    (rule) => rule.id === "schema-required",
  );
  assert.equal(Boolean(schemaRule), true);
  assert.equal(
    (schemaRule?.recommendation ?? "").includes(
      "Define at least one block definition in schema",
    ),
    true,
  );
  assert.equal(
    (schemaRule?.recommendation ?? "").includes("Fix schema JSON syntax"),
    true,
  );

  const structuralRule = combined.rules.find((rule) =>
    rule.id.startsWith("structural-warning-"),
  );
  assert.equal(Boolean(structuralRule), true);
  assert.equal(
    (structuralRule?.recommendation ?? "").includes(
      "Rename duplicated schema ids",
    ),
    true,
  );
});

test("minimal valid business case passes core blocking checks", () => {
  const combined = buildSectionFactoryValidationRules({
    guides,
    documents: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
        errors: [],
      },
      settings: { count: 1 },
      blocks: { count: 0 },
      presets: { count: 1 },
    },
  });

  assert.equal(
    combined.rules.some((rule) => rule.id === "schema-required"),
    false,
  );
  assert.equal(combined.criticalVerdictBlocked, false);
});

test("validator keeps critical rules when no normalized documentation is available", () => {
  const combined = buildSectionFactoryValidationRules({
    guides: [],
    documents: [],
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
    },
  });

  assert.equal(combined.fallbackUsed, true);
  assert.equal(
    combined.rules.some(
      (rule) =>
        rule.id === "schema-required" &&
        rule.severity === "error" &&
        rule.rationale.includes("[core-rule]"),
    ),
    true,
  );
  assert.equal(combined.criticalVerdictBlocked, true);
});

test("documentary hints cannot invert critical verdicts", () => {
  const contradictoryDocs: ShopifyDocsIndex["documents"] = [
    {
      id: "doc-contradictory",
      topic: "schema",
      sourceUrl: "https://shopify.dev/docs/contradictory",
      title: "Contradictory documentary hint",
      documentSummary: "This documentary excerpt is non-authoritative.",
      ruleCandidates: ["Schema might be optional in some examples."],
      keywords: ["schema", "optional"],
      chunks: [{ id: "c1", text: "schema optional maybe" }],
      fetchedAt: "2026-04-02T00:00:00.000Z",
      lastIndexedAt: "2026-04-02T00:00:00.000Z",
      schemaHints: {
        settings: true,
        blocks: true,
        presets: false,
        enabled_on: false,
        disabled_on: false,
        max_blocks: false,
      },
    },
  ];

  const combined = buildSectionFactoryValidationRules({
    guides: [],
    documents: contradictoryDocs,
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
    },
  });

  assert.equal(
    combined.rules.some(
      (rule) =>
        rule.id === "schema-required" &&
        rule.severity === "error" &&
        rule.rationale.includes("[core-rule]"),
    ),
    true,
  );
  assert.equal(
    combined.rules.some(
      (rule) =>
        rule.id === "schema-hints" &&
        rule.severity !== "error" &&
        rule.rationale.includes("[documentary]"),
    ),
    true,
  );
  assert.equal(combined.criticalVerdictBlocked, true);
  assert.equal(
    combined.rules
      .filter((rule) => rule.rationale.includes("[documentary]"))
      .every((rule) => rule.severity !== "error"),
    true,
  );
});

test("critical messages remain readable without documentary enrichment", () => {
  const combined = buildSectionFactoryValidationRules({
    guides: [],
    documents: [],
  });

  const critical = combined.rules.find((rule) => rule.id === "schema-required");
  assert.equal(Boolean(critical), true);
  assert.equal((critical?.rationale ?? "").includes("core-rule"), true);
  assert.equal((critical?.recommendation ?? "").length > 0, true);
});

test("unknown schema validity is not coerced to invalid by default", () => {
  const input = buildValidationRuleInput({
    guides,
    validationSignals: {
      schema: {
        exists: true,
      },
      settings: { count: 1 },
      blocks: { count: 0 },
      presets: { count: 1 },
    },
  });

  assert.equal(input.facts.schema.analysis?.validityState, "unknown");
  assert.equal(input.facts.schema.isValid, true);

  const diagnostics = evaluateCoreRules(input);
  assert.equal(
    diagnostics.some((diag) => diag.id === "schema-required"),
    false,
  );
});

test("report payload v2 is exposed and legacy payload stays derived", () => {
  const input: BuildSectionFactoryValidationRulesInput = {
    guides,
    documents: mockIndex().documents,
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
      structuralWarningCodes: ["duplicate_ids"],
    },
  };

  const reportPayload = buildSectionFactoryValidationReport(input);
  const legacyPayload = buildSectionFactoryValidationRules(input);

  assert.equal(reportPayload.report.verdict, "fail");
  assert.equal(reportPayload.report.businessDiagnostics.length > 0, true);
  assert.equal(reportPayload.report.technicalGuidance.length >= 1, true);

  assert.equal(legacyPayload.report?.verdict, reportPayload.report.verdict);
  assert.equal(legacyPayload.criticalVerdictBlocked, true);
  assert.equal(
    legacyPayload.rules.some((rule) => rule.id === "schema-required"),
    true,
  );
});

test("legacy facade supports controlled report-only mode", () => {
  const payload = buildSectionFactoryValidationRules({
    guides,
    documents: mockIndex().documents,
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
    },
    legacyPayloadMode: "report-only",
  });

  assert.equal(payload.rules.length, 0);
  assert.equal(typeof payload.report?.verdict, "string");
  assert.equal(payload.criticalVerdictBlocked, undefined);
});

test("global config can force effective report-only mode", () => {
  const previous = process.env.VALIDATION_FORCE_REPORT_ONLY;
  process.env.VALIDATION_FORCE_REPORT_ONLY = "1";

  try {
    const payload = buildSectionFactoryValidationRules({
      guides,
      documents: mockIndex().documents,
      validationSignals: {
        schema: {
          exists: false,
          isValid: false,
          errors: ["missing_schema"],
        },
        settings: { count: 0 },
        blocks: { count: 0 },
        presets: { count: 0 },
      },
      legacyPayloadMode: "full",
    });

    assert.equal(payload.rules.length, 0);
    assert.equal(payload.report?.requestedMode, "full");
    assert.equal(payload.report?.effectiveMode, "report-only");
    assert.equal(payload.report?.forcedByConfig, true);
    assert.equal(payload.report?.downgradedDiagnosticsCount, 1);
    assert.equal(payload.report?.verdict, "pass_with_warnings");
  } finally {
    if (previous === undefined) {
      delete process.env.VALIDATION_FORCE_REPORT_ONLY;
    } else {
      process.env.VALIDATION_FORCE_REPORT_ONLY = previous;
    }
  }
});
