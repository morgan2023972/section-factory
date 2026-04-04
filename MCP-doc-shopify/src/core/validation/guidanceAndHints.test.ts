import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalysisResult } from "./buildAnalysisResult.js";
import { buildDocumentaryHints } from "./buildDocumentaryHints.js";
import { buildTechnicalGuidance } from "./buildTechnicalGuidance.js";

test("technical guidance contains no severity and no blocking fields", () => {
  const guidance = buildTechnicalGuidance({ guides: [] });
  assert.equal(guidance.length > 0, true);

  for (const item of guidance) {
    assert.equal("severity" in item, false);
    assert.equal("blocking" in item, false);
  }
});

test("documentary hints are built from docs and analysis candidates", () => {
  const analysis = buildAnalysisResult({
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

  const hints = buildDocumentaryHints({
    docs: [
      {
        id: "doc-liquid",
        topic: "liquid-reference",
        sourceUrl: "https://shopify.dev/docs/liquid",
        title: "Liquid",
        documentSummary: "Liquid",
        ruleCandidates: [],
        keywords: [],
        chunks: [],
        fetchedAt: "2026-01-01T00:00:00.000Z",
        lastIndexedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    analysisResult: analysis,
  });

  assert.equal(
    hints.some((hint) => hint.id === "liquid-reference-hint"),
    true,
  );
  assert.equal(
    hints.some((hint) => hint.id === "analysis-doc-hint-schema"),
    true,
  );
});
