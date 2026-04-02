import { describe, expect, it } from "vitest";

import {
  buildSectionFactoryPromptContext,
  buildSectionFactoryValidationRules,
} from "../../MCP-doc-shopify/src/adapters";
import type { GuideResource } from "../../MCP-doc-shopify/src/catalog/types";
import type { NormalizedDocFile } from "../../MCP-doc-shopify/src/pipeline/types";

describe("consumer opt-in adapters", () => {
  it("produces prompt context and validation rules from typed local fixtures", () => {
    const guides: GuideResource[] = [
      {
        uri: "shopify://guides/sections",
        name: "fixture-sections",
        title: "Sections Guide",
        description: "Typed fixture for consumer integration",
        markdown:
          "## Required Structure\n- Include schema\n- Keep section settings merchant-friendly",
      },
    ];

    const documents: NormalizedDocFile[] = [
      {
        id: "fixture-schema",
        topic: "schema",
        sourceUrl:
          "https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema",
        title: "Section schema",
        summary: "Schema settings blocks presets enabled_on max_blocks.",
        keyRules: ["Use schema settings and blocks."],
        keywords: ["schema", "settings", "blocks", "presets"],
        chunks: [
          {
            id: "chunk-1",
            text: "schema settings blocks presets enabled_on max_blocks",
          },
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
    ];

    const promptPayload = buildSectionFactoryPromptContext({
      guides,
      documents,
      sectionCategory: "hero",
      limit: 2,
    });

    expect(promptPayload.promptContext.length).toBeGreaterThan(0);
    expect(promptPayload.guideCount).toBe(1);
    expect(promptPayload.documentCount).toBeGreaterThan(0);
    expect(promptPayload.fallbackUsed).toBe(false);

    const validationPayload = buildSectionFactoryValidationRules({
      guides,
      documents,
    });

    expect(validationPayload.rules.length).toBeGreaterThan(0);
    expect(
      validationPayload.rules.some((rule) => rule.id === "schema-required"),
    ).toBe(true);
    expect(validationPayload.fallbackUsed).toBe(false);
  });

  it("uses explicit local fallback path when guides and documents are empty", () => {
    const promptPayload = buildSectionFactoryPromptContext({
      guides: [],
      documents: [],
      searchResults: [],
      sectionCategory: "faq",
      limit: 2,
    });

    expect(promptPayload.fallbackUsed).toBe(true);
    expect(promptPayload.guideCount).toBe(0);
    expect(promptPayload.documentCount).toBe(0);
    expect(promptPayload.searchHitCount).toBe(0);
    expect(promptPayload.promptContext).toContain(
      "Shopify generation constraints",
    );
    expect(promptPayload.promptContext).toContain(
      "Document-derived implementation hints",
    );

    const validationPayload = buildSectionFactoryValidationRules({
      guides: [],
      documents: [],
    });

    expect(validationPayload.fallbackUsed).toBe(true);
    expect(validationPayload.rules.length).toBeGreaterThan(0);
    expect(
      validationPayload.rules.some((rule) => rule.id === "schema-required"),
    ).toBe(true);
  });
});
