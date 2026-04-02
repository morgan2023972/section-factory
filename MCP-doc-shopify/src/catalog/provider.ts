import {
  CATEGORY_SETTINGS_MAP,
  SHOPIFY_SCHEMA_GUIDE,
  SHOPIFY_SECTION_RULES,
} from "./staticCatalogData.js";
import { SHOPIFY_GUIDES } from "../resources/guidesData.js";
import type {
  GuideResource,
  SchemaGuidePayload,
  SectionRulesPayload,
  ShopifyDocsProvider,
  SuggestSettingsPayload,
} from "./types.js";

const DEFAULT_SETTINGS_FALLBACK = ["title", "text", "color_scheme"] as const;

class StaticShopifyDocsProvider implements ShopifyDocsProvider {
  getSectionRules(): SectionRulesPayload {
    return {
      title: "Shopify section rules",
      rules: [...SHOPIFY_SECTION_RULES],
    };
  }

  getSchemaGuide(): SchemaGuidePayload {
    return {
      title: "Shopify section schema guide",
      schema: {
        attributes: [...SHOPIFY_SCHEMA_GUIDE.attributes],
        notes: [...SHOPIFY_SCHEMA_GUIDE.notes],
      },
    };
  }

  suggestSettings(category: string): SuggestSettingsPayload {
    const key = category.toLowerCase();
    const suggestions = CATEGORY_SETTINGS_MAP[key] ?? DEFAULT_SETTINGS_FALLBACK;

    return {
      category: key,
      suggestedSettings: [...suggestions],
    };
  }

  listGuideResources(): readonly GuideResource[] {
    return SHOPIFY_GUIDES.map((guide) => ({ ...guide }));
  }

  getGuideResourceByUri(uri: string): GuideResource {
    const guide = SHOPIFY_GUIDES.find((entry) => entry.uri === uri);
    if (!guide) {
      const available = SHOPIFY_GUIDES.map((entry) => `- ${entry.uri}`).join(
        "\n",
      );
      throw new Error(
        [
          `Unknown Shopify guide resource URI: ${uri}`,
          "Available resource URIs:",
          available,
        ].join("\n"),
      );
    }

    return { ...guide };
  }
}

export const shopifyDocsProvider: ShopifyDocsProvider =
  new StaticShopifyDocsProvider();
