import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSectionFactoryPromptContext,
  buildSectionFactoryValidationRules,
} from "../adapters/index.js";
import { getSchemaGuide } from "../tools/getSchemaGuide.js";
import { getSectionRules } from "../tools/getSectionRules.js";
import { runSearchShopifyDocs } from "../tools/searchShopifyDocs.js";
import { suggestSettings } from "../tools/suggestSettings.js";

test("fallback local does not block prompt and validation payloads", () => {
  const prompt = buildSectionFactoryPromptContext({
    guides: [],
    documents: [],
    searchResults: [],
    sectionCategory: "hero",
  });

  assert.equal(prompt.fallbackUsed, true);
  assert.equal(
    prompt.promptContext.includes("Shopify generation constraints"),
    true,
  );
  assert.equal(
    prompt.promptContext.includes("Document-derived implementation hints"),
    true,
  );

  const validation = buildSectionFactoryValidationRules({
    guides: [],
    documents: [],
  });

  assert.equal(validation.fallbackUsed, true);
  assert.equal(validation.rules.length > 0, true);
  assert.equal(
    validation.rules.some((rule) => rule.id === "schema-required"),
    true,
  );
  assert.equal(typeof validation.report?.verdict, "string");
});

test("MCP tool contracts remain stable for legacy tools", () => {
  const rules = getSectionRules();
  const schema = getSchemaGuide();
  const settings = suggestSettings({ category: "hero" });

  assert.equal(typeof rules.title, "string");
  assert.equal(Array.isArray(rules.rules), true);
  assert.equal(typeof schema.title, "string");
  assert.equal(Array.isArray(schema.schema.attributes), true);
  assert.equal(settings.category, "hero");
  assert.equal(Array.isArray(settings.suggestedSettings), true);
});

test("search tool returns contract-compatible content and structured payload", () => {
  const output = runSearchShopifyDocs({
    query: "   ",
    topic: "schema",
    limit: 3,
  });

  assert.equal(Array.isArray(output.content), true);
  assert.equal(output.content.length >= 1, true);
  assert.equal(output.content[0]?.type, "text");
  assert.equal(typeof output.content[0]?.text, "string");

  const structured = output.structuredContent as {
    query: string;
    totalHits: number;
    returnedHits: number;
    note?: string;
  };

  assert.equal(structured.query.trim().length, 0);
  assert.equal(structured.totalHits, 0);
  assert.equal(structured.returnedHits, 0);
  assert.equal(typeof structured.note, "string");
});
