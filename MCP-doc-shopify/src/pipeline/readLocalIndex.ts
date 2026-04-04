import * as fs from "node:fs";

import { INDEX_FILE, INDEX_SNAPSHOT_FILE } from "./paths.js";
import type { ShopifyDocsIndex } from "./types.js";
import { coerceShopifyDocsIndex } from "./normalizedDocCompatibility.js";

function emptyIndex(reason: string): ShopifyDocsIndex {
  console.warn(`[index] ${reason}`);
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sourceCount: 0,
    documentCount: 0,
    documents: [],
  };
}

function tryReadIndex(filePath: string): ShopifyDocsIndex | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(text) as unknown;
    return coerceShopifyDocsIndex(parsed);
  } catch {
    return null;
  }
}

export function readLocalDocsIndexSafe(): ShopifyDocsIndex {
  const primary = tryReadIndex(INDEX_FILE);
  if (primary) {
    return primary;
  }

  const snapshot = tryReadIndex(INDEX_SNAPSHOT_FILE);
  if (snapshot) {
    console.warn("[index] Primary index missing, using snapshot fallback");
    return snapshot;
  }

  return emptyIndex(
    "No local index or snapshot found; using empty index fallback",
  );
}
