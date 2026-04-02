import assert from "node:assert/strict";
import test from "node:test";

import type { GuideResource } from "../catalog/types.js";
import type { ShopifyDocsIndex } from "../pipeline/types.js";
import { searchShopifyDocsInIndex } from "../search/searchEngine.js";
import {
  buildPromptContextFromGuides,
  buildPromptContextFromSearchResults,
  buildSectionFactoryPromptContext,
} from "./toSectionFactoryPromptContext.js";
import {
  buildSectionFactoryValidationRules,
  buildValidationRulesFromDocs,
} from "./toSectionFactoryValidationRules.js";

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
        summary: "Schema settings blocks presets enabled_on max_blocks.",
        keyRules: ["Use schema settings and blocks."],
        keywords: ["schema", "settings", "blocks", "presets"],
        chunks: [
          { id: "c1", text: "settings blocks presets enabled_on max_blocks" },
        ],
        fetchedAt: "2026-04-02T00:00:00.000Z",
        lastIndexedAt: "2026-04-02T00:00:00.000Z",
        schemaSignals: {
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
        summary: "Liquid tags and filters.",
        keyRules: ["Use standard liquid patterns."],
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
    fromDocs.some((rule) => rule.id === "schema-signals"),
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
});
