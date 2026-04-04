import assert from "node:assert/strict";
import test from "node:test";

import type { ShopifyDocsIndex } from "../pipeline/types.js";
import { searchShopifyDocsInIndex } from "./searchEngine.js";

function indexForQualityTests(): ShopifyDocsIndex {
  return {
    version: "1.0",
    generatedAt: "2026-04-04T00:00:00.000Z",
    sourceCount: 3,
    documentCount: 3,
    documents: [
      {
        id: "hero-arch",
        topic: "sections-architecture",
        sourceUrl: "https://shopify.dev/docs/hero-arch",
        title: "Hero section architecture patterns",
        documentSummary:
          "Hero sections should use reusable architecture and merchant friendly settings.",
        ruleCandidates: ["Hero sections should use reusable architecture."],
        keywords: ["hero", "architecture", "settings"],
        chunks: [
          {
            id: "chunk-1",
            text: "hero architecture reusable settings blocks presets",
            sectionHint: "Architecture",
          },
        ],
        fetchedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
      },
      {
        id: "liquid-ref",
        topic: "liquid-reference",
        sourceUrl: "https://shopify.dev/docs/liquid-ref",
        title: "Liquid rendering reference",
        documentSummary: "Liquid tags and filters reference.",
        ruleCandidates: ["Use liquid filters defensively."],
        keywords: ["liquid", "filters", "render"],
        chunks: [
          {
            id: "chunk-1",
            text: "liquid filters and tags with rendering examples",
          },
        ],
        fetchedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
      },
      {
        id: "schema-heavy",
        topic: "schema",
        sourceUrl: "https://shopify.dev/docs/schema-heavy",
        title: "Schema settings and presets",
        documentSummary: "Schema should define settings, blocks and presets.",
        ruleCandidates: ["Schema should define settings, blocks and presets."],
        keywords: ["schema", "settings", "blocks", "presets"],
        chunks: [
          {
            id: "chunk-1",
            text: "settings blocks presets enabled_on disabled_on max_blocks",
          },
        ],
        fetchedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
      },
    ],
  };
}

test("section category affinity improves ranking relevance", () => {
  const result = searchShopifyDocsInIndex(
    {
      query: "hero settings architecture",
      sectionCategory: "hero",
      limit: 3,
    },
    indexForQualityTests(),
  );

  assert.equal(result.results.length >= 1, true);
  assert.equal(result.results[0]?.docId, "hero-arch");
});

test("topic filter keeps scoped topics only", () => {
  const result = searchShopifyDocsInIndex(
    {
      query: "settings blocks presets",
      topic: "schema",
      limit: 5,
    },
    indexForQualityTests(),
  );

  assert.equal(result.results.length >= 1, true);
  assert.equal(
    result.results.every((hit) => hit.topic === "schema"),
    true,
  );
});

test("snippet is trimmed cleanly and stays within expected length", () => {
  const result = searchShopifyDocsInIndex(
    {
      query: "schema settings blocks presets",
      topic: "schema",
      limit: 1,
    },
    indexForQualityTests(),
  );

  const snippet = result.results[0]?.snippet ?? "";
  assert.equal(snippet.length > 0, true);
  assert.equal(snippet.length <= 240, true);
  assert.equal(snippet.endsWith(" "), false);
});
