import type { ShopifySourceDefinition } from "./types.js";

export const SHOPIFY_SOURCE_CATALOG: readonly ShopifySourceDefinition[] = [
  {
    id: "section-schema",
    topic: "schema",
    sourceUrl:
      "https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema",
    titleHint: "Section schema",
  },
  {
    id: "sections-architecture",
    topic: "sections-architecture",
    sourceUrl:
      "https://shopify.dev/docs/storefronts/themes/architecture/sections",
    titleHint: "Sections architecture",
  },
  {
    id: "json-templates",
    topic: "json-templates",
    sourceUrl:
      "https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates",
    titleHint: "JSON templates",
  },
  {
    id: "liquid-reference",
    topic: "liquid-reference",
    sourceUrl: "https://shopify.dev/docs/api/liquid",
    titleHint: "Liquid reference",
  },
  {
    id: "os2-intro",
    topic: "os2-compatibility",
    sourceUrl: "https://shopify.dev/docs/storefronts/themes/architecture",
    titleHint: "Online Store 2.0",
  },
];
