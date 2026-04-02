export type ShopifyDocTopic =
  | "schema"
  | "sections-architecture"
  | "json-templates"
  | "liquid-reference"
  | "os2-compatibility";

export interface ShopifySourceDefinition {
  id: string;
  topic: ShopifyDocTopic;
  sourceUrl: string;
  titleHint: string;
}

export interface RawDocFile {
  id: string;
  topic: ShopifyDocTopic;
  sourceUrl: string;
  titleHint: string;
  fetchedAt: string;
  status: "success" | "failed";
  httpStatus?: number;
  error?: string;
  html?: string;
}

export interface NormalizedDocChunk {
  id: string;
  text: string;
}

export interface NormalizedDocFile {
  id: string;
  topic: ShopifyDocTopic;
  sourceUrl: string;
  title: string;
  summary: string;
  keyRules: string[];
  keywords: string[];
  chunks: NormalizedDocChunk[];
  fetchedAt: string;
  lastIndexedAt: string;
  schemaSignals?: {
    settings: boolean;
    blocks: boolean;
    presets: boolean;
    enabled_on: boolean;
    disabled_on: boolean;
    max_blocks: boolean;
  };
}

export interface FetchManifest {
  fetchedAt: string;
  total: number;
  successCount: number;
  failureCount: number;
  failures: Array<{
    id: string;
    sourceUrl: string;
    reason: string;
  }>;
}

export interface ShopifyDocsIndex {
  version: "1.0";
  generatedAt: string;
  sourceCount: number;
  documentCount: number;
  documents: NormalizedDocFile[];
}
