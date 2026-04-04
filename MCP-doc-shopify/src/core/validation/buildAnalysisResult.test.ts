import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalysisResult } from "./buildAnalysisResult.js";

test("buildAnalysisResult keeps unknown validity separate from invalid", () => {
  const result = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
      },
      settings: { count: 1 },
      blocks: { count: 0 },
      presets: { count: 1 },
    },
    documents: [],
  });

  assert.equal(result.schema.exists.state, "present");
  assert.equal(result.schema.validity.state, "unknown");
  assert.equal(
    result.limitations.some(
      (limitation) => limitation.code === "schema_analysis_incomplete",
    ),
    true,
  );
});

test("buildAnalysisResult extracts documentary hint candidates by topic", () => {
  const result = buildAnalysisResult({
    guides: [],
    validationSignals: {},
    documents: [
      {
        id: "doc-schema",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/schema",
        title: "Schema",
        documentSummary: "Schema",
        ruleCandidates: [],
        keywords: [],
        chunks: [],
        fetchedAt: "2026-01-01T00:00:00.000Z",
        lastIndexedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result.documentationHintCandidates.length, 1);
  assert.equal(result.documentationHintCandidates[0]?.topic, "schema");
  assert.equal(result.documentationHintCandidates[0]?.confidence, "medium");
});

test("buildAnalysisResult marks schema validity invalid from known errors", () => {
  const result = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
        errors: ["missing_blocks", "missing_blocks"],
      },
    },
    documents: [],
  });

  assert.equal(result.schema.exists.state, "present");
  assert.equal(result.schema.validity.state, "invalid");
  assert.deepEqual(result.schema.errors, ["missing_blocks"]);
});

test("buildAnalysisResult keeps schema validity unknown when schema presence is unknown", () => {
  const result = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schemaJsonValid: false,
    },
    documents: [],
  });

  assert.equal(result.schema.exists.state, "unknown");
  assert.equal(result.schema.validity.state, "unknown");
  assert.equal(
    result.limitations.some(
      (limitation) => limitation.code === "schema_analysis_incomplete",
    ),
    true,
  );
});

test("buildAnalysisResult deduplicates structural warnings", () => {
  const result = buildAnalysisResult({
    guides: [],
    validationSignals: {
      structuralWarningCodes: ["duplicate_ids", "duplicate_ids"],
    },
    documents: [],
  });

  assert.deepEqual(result.sectionStructure.structuralWarnings, [
    "duplicate_ids",
  ]);
});
