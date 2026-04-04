import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceNormalizedDocFile,
  coerceShopifyDocsIndex,
} from "./normalizedDocCompatibility.js";

test("coerceNormalizedDocFile upgrades legacy normalized doc", () => {
  const legacyDoc = {
    id: "doc-1",
    topic: "schema",
    sourceUrl: "https://shopify.dev/docs/schema",
    title: "Schema doc",
    documentSummary: "Schema summary.",
    ruleCandidates: ["Use schema settings."],
    keywords: ["schema", "settings"],
    chunks: [{ id: "chunk-1", text: "schema settings blocks" }],
    fetchedAt: "2026-01-01T00:00:00.000Z",
    lastIndexedAt: "2026-01-02T00:00:00.000Z",
  };

  const coerced = coerceNormalizedDocFile(legacyDoc);

  assert.equal(Boolean(coerced), true);
  assert.equal(coerced?.normalization?.formatVersion, "1.0-legacy");
  assert.equal(coerced?.normalization?.parser, "legacy-flat");
  assert.equal(coerced?.normalization?.blockCount, 1);
});

test("coerceNormalizedDocFile rejects malformed doc", () => {
  const malformed = {
    id: "doc-x",
    topic: "schema",
    sourceUrl: "https://shopify.dev/docs/schema",
  };

  const coerced = coerceNormalizedDocFile(malformed);
  assert.equal(coerced, null);
});

test("coerceShopifyDocsIndex recomputes counters from valid docs only", () => {
  const index = {
    version: "1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    sourceCount: 999,
    documentCount: 999,
    documents: [
      {
        id: "doc-1",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/schema",
        title: "Schema doc",
        documentSummary: "Schema summary.",
        ruleCandidates: ["Use schema settings."],
        keywords: ["schema"],
        chunks: [{ id: "chunk-1", text: "schema" }],
        fetchedAt: "2026-01-01T00:00:00.000Z",
        lastIndexedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "bad-doc",
        sourceUrl: "https://shopify.dev/docs/bad",
      },
    ],
  };

  const coerced = coerceShopifyDocsIndex(index);

  assert.equal(Boolean(coerced), true);
  assert.equal(coerced?.documentCount, 1);
  assert.equal(coerced?.sourceCount, 1);
});
