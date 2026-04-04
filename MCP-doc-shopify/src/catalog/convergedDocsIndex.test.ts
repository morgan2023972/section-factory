import assert from "node:assert/strict";
import test from "node:test";

import type { ShopifyDocsIndex } from "../pipeline/types.js";
import {
  buildConvergedDocsIndex,
  buildStaticDocumentaryDocs,
} from "./convergedDocsIndex.js";

test("buildStaticDocumentaryDocs provides deterministic baseline docs", () => {
  const docs = buildStaticDocumentaryDocs("2026-04-04T00:00:00.000Z");

  assert.equal(docs.length >= 2, true);
  assert.equal(
    docs.some((doc) => doc.topic === "schema"),
    true,
  );
  assert.equal(
    docs.some((doc) => doc.topic === "sections-architecture"),
    true,
  );
  assert.equal(
    docs.every((doc) =>
      doc.normalization?.qualityFlags.includes("static-fallback"),
    ),
    true,
  );
});

test("buildConvergedDocsIndex injects static fallback when pipeline is empty", () => {
  const base: ShopifyDocsIndex = {
    version: "1.0",
    generatedAt: "2026-04-04T00:00:00.000Z",
    sourceCount: 0,
    documentCount: 0,
    documents: [],
  };

  const converged = buildConvergedDocsIndex(base, "2026-04-04T00:00:00.000Z");

  assert.equal(converged.documentCount >= 2, true);
  assert.equal(
    converged.documents.some((doc) => doc.topic === "schema"),
    true,
  );
  assert.equal(
    converged.documents.some((doc) => doc.topic === "sections-architecture"),
    true,
  );
  assert.equal(
    converged.sourceCount,
    new Set(converged.documents.map((doc) => doc.sourceUrl)).size,
  );
});

test("buildConvergedDocsIndex supplements missing topic without duplicating existing topic", () => {
  const base: ShopifyDocsIndex = {
    version: "1.0",
    generatedAt: "2026-04-04T00:00:00.000Z",
    sourceCount: 1,
    documentCount: 1,
    documents: [
      {
        id: "pipeline-schema",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/schema",
        title: "Pipeline schema doc",
        documentSummary: "Schema details from normalized pipeline.",
        ruleCandidates: ["Use schema settings and presets."],
        keywords: ["schema", "settings", "presets"],
        chunks: [{ id: "chunk-1", text: "schema settings presets" }],
        fetchedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
      },
    ],
  };

  const converged = buildConvergedDocsIndex(base, "2026-04-04T00:00:00.000Z");
  const schemaDocs = converged.documents.filter(
    (doc) => doc.topic === "schema",
  );

  assert.equal(schemaDocs.length, 1);
  assert.equal(schemaDocs[0]?.id, "pipeline-schema");
  assert.equal(
    converged.documents.some((doc) => doc.topic === "sections-architecture"),
    true,
  );
});
