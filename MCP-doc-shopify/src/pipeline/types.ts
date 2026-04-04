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
  sectionHint?: string;
}

export interface NormalizedDocNormalizationMetadata {
  // "1.0-legacy" is used when reading historical normalized docs.
  formatVersion: "1.0-legacy" | "1.1";
  parser: "legacy-flat" | "structured-html";
  blockCount: number;
  hasSectionHints: boolean;
  qualityFlags: string[];
  ruleCandidateSignals?: NormalizedDocRuleCandidateSignal[];
}

export interface NormalizedDocRuleCandidateSignal {
  text: string;
  score: number;
  confidence: "low" | "medium" | "high";
  sectionHint?: string;
}

export interface NormalizedDocFile {
  id: string;
  topic: ShopifyDocTopic;
  sourceUrl: string;
  title: string;
  // Documentary excerpt only; never a normative validation source.
  documentSummary: string;
  // Extracted from docs; candidates are informative and non-authoritative.
  ruleCandidates: string[];
  keywords: string[];
  chunks: NormalizedDocChunk[];
  fetchedAt: string;
  lastIndexedAt: string;
  // Documentary schema hints only; never sufficient for critical decisions.
  schemaHints?: {
    settings: boolean;
    blocks: boolean;
    presets: boolean;
    enabled_on: boolean;
    disabled_on: boolean;
    max_blocks: boolean;
  };
  // Optional compatibility-first metadata for richer documentary processing.
  normalization?: NormalizedDocNormalizationMetadata;
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
