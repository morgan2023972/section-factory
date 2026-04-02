import type { ShopifyDocTopic } from "../pipeline/types.js";

export type SearchTopicFilter =
  | "sections"
  | "blocks"
  | "presets"
  | "schema"
  | "liquid"
  | "os2";

export interface SearchShopifyDocsInput {
  query: string;
  topic?: SearchTopicFilter;
  sectionCategory?: string;
  limit?: number;
}

export interface SearchHit {
  docId: string;
  title: string;
  topic: ShopifyDocTopic;
  uri: string;
  sourceUrl: string;
  snippet: string;
  score: number;
  lastIndexedAt: string;
}

export interface SearchResultPayload {
  [key: string]: unknown;
  query: string;
  topic?: SearchTopicFilter;
  sectionCategory?: string;
  totalHits: number;
  returnedHits: number;
  results: SearchHit[];
  note?: string;
}
