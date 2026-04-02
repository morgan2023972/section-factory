import { readLocalDocsIndexSafe } from "../pipeline/readLocalIndex.js";
import type {
  NormalizedDocFile,
  ShopifyDocsIndex,
  ShopifyDocTopic,
} from "../pipeline/types.js";

export interface LocalDocsIndexSummary {
  version: string;
  generatedAt: string;
  sourceCount: number;
  documentCount: number;
}

export function readLocalDocsIndex(): ShopifyDocsIndex {
  return readLocalDocsIndexSafe();
}

export function readLocalDocsIndexSummary(): LocalDocsIndexSummary {
  const index = readLocalDocsIndexSafe();
  return {
    version: index.version,
    generatedAt: index.generatedAt,
    sourceCount: index.sourceCount,
    documentCount: index.documentCount,
  };
}

export function readDocsByTopic(topic: ShopifyDocTopic): NormalizedDocFile[] {
  const index = readLocalDocsIndexSafe();
  return index.documents.filter((doc) => doc.topic === topic);
}
