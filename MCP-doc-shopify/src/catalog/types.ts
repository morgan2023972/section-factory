export interface ShopifySchemaGuide {
  attributes: readonly string[];
  notes: readonly string[];
}

export type CategorySettingsMap = Readonly<Record<string, readonly string[]>>;

export interface SectionRulesPayload {
  title: string;
  rules: readonly string[];
}

export interface SchemaGuidePayload {
  title: string;
  schema: ShopifySchemaGuide;
}

export interface SuggestSettingsPayload {
  category: string;
  suggestedSettings: readonly string[];
}

export interface GuideResource {
  uri: string;
  name: string;
  title: string;
  description: string;
  markdown: string;
}

export interface ShopifyDocsProvider {
  getSectionRules(): SectionRulesPayload;
  getSchemaGuide(): SchemaGuidePayload;
  suggestSettings(category: string): SuggestSettingsPayload;
  listGuideResources(): readonly GuideResource[];
  getGuideResourceByUri(uri: string): GuideResource;
}
