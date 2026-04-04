import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  INDEX_DIR,
  INDEX_FILE,
  INDEX_SNAPSHOT_FILE,
  NORMALIZED_DOCS_DIR,
} from "./paths.js";
import type { NormalizedDocFile, ShopifyDocsIndex } from "./types.js";
import { coerceNormalizedDocFile } from "./normalizedDocCompatibility.js";

async function ensureDir(): Promise<void> {
  await fs.mkdir(INDEX_DIR, { recursive: true });
}

async function loadNormalizedDocuments(): Promise<NormalizedDocFile[]> {
  try {
    const entries = await fs.readdir(NORMALIZED_DOCS_DIR, {
      withFileTypes: true,
    });
    const files = entries
      .filter(
        (entry) => entry.isFile() && entry.name.endsWith(".normalized.json"),
      )
      .map((entry) => path.join(NORMALIZED_DOCS_DIR, entry.name));

    const docs: NormalizedDocFile[] = [];
    for (const file of files) {
      try {
        const text = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(text) as unknown;
        const coerced = coerceNormalizedDocFile(parsed);
        if (!coerced) {
          console.warn(
            `[build-index] Skip malformed normalized doc ${file}: missing required fields`,
          );
          continue;
        }

        docs.push(coerced);
      } catch (error) {
        console.warn(
          `[build-index] Skip invalid file ${file}: ${String(error)}`,
        );
      }
    }

    return docs;
  } catch {
    return [];
  }
}

function createIndex(docs: NormalizedDocFile[]): ShopifyDocsIndex {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sourceCount: new Set(docs.map((doc) => doc.sourceUrl)).size,
    documentCount: docs.length,
    documents: docs,
  };
}

export async function runBuildIndex(): Promise<void> {
  await ensureDir();
  const docs = await loadNormalizedDocuments();
  const index = createIndex(docs);

  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");

  try {
    await fs.access(INDEX_SNAPSHOT_FILE);
  } catch {
    await fs.writeFile(
      INDEX_SNAPSHOT_FILE,
      JSON.stringify(index, null, 2),
      "utf8",
    );
    console.log("[build-index] Snapshot initialized");
  }

  console.log(
    `[build-index] Done: ${index.documentCount} documents from ${index.sourceCount} source(s)`,
  );
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  void runBuildIndex().catch((error) => {
    console.error("[build-index] Fatal pipeline error:", error);
    process.exitCode = 1;
  });
}
