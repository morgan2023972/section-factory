import assert from "node:assert/strict";
import test from "node:test";

import type { ShopifyDocsIndex } from "../pipeline/types.js";
import { searchShopifyDocsInIndex } from "./searchEngine.js";

function mockIndex(): ShopifyDocsIndex {
  return {
    version: "1.0",
    generatedAt: "2026-04-02T00:00:00.000Z",
    sourceCount: 3,
    documentCount: 3,
    documents: [
      {
        id: "doc-a",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/a",
        title: "Section schema settings and blocks",
        summary:
          "Schema rules include settings, blocks, presets, enabled_on and max_blocks for robust section architecture.",
        keyRules: ["Use settings and blocks.", "Include presets in schema."],
        keywords: ["schema", "settings", "blocks", "presets"],
        chunks: [
          {
            id: "chunk-1",
            text: "settings blocks presets schema enabled_on disabled_on max_blocks",
          },
        ],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
        schemaSignals: {
          settings: true,
          blocks: true,
          presets: true,
          enabled_on: true,
          disabled_on: true,
          max_blocks: true,
        },
      },
      {
        id: "doc-b",
        topic: "sections-architecture",
        sourceUrl: "https://shopify.dev/docs/b",
        title: "Theme sections architecture",
        summary:
          "Sections architecture explains templates and reusable components.",
        keyRules: ["Use modular sections."],
        keywords: ["sections", "architecture", "templates"],
        chunks: [
          {
            id: "chunk-1",
            text: "architecture templates and reusable sections",
          },
        ],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
      },
      {
        id: "doc-c",
        topic: "liquid-reference",
        sourceUrl: "https://shopify.dev/docs/c",
        title: "Liquid reference",
        summary: "Reference for liquid filters and tags.",
        keyRules: ["Use liquid filters carefully."],
        keywords: ["liquid", "filters", "tags"],
        chunks: [
          {
            id: "chunk-1",
            text: "liquid filters and tags",
          },
        ],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
  };
}

test("searchShopifyDocsInIndex orders hits by deterministic score", () => {
  const result = searchShopifyDocsInIndex(
    {
      query: "schema settings blocks presets",
      topic: "schema",
      limit: 3,
    },
    mockIndex(),
  );

  assert.equal(result.totalHits >= 1, true);
  assert.equal(result.results[0]?.docId, "doc-a");

  for (let i = 1; i < result.results.length; i += 1) {
    assert.equal(result.results[i - 1].score >= result.results[i].score, true);
  }
});

test("searchShopifyDocsInIndex returns clear note for empty query", () => {
  const result = searchShopifyDocsInIndex({ query: "   " }, mockIndex());

  assert.equal(result.returnedHits, 0);
  assert.equal(result.totalHits, 0);
  assert.equal(
    result.note,
    "Query is empty. Provide at least one search term.",
  );
});
