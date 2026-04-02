import * as fs from "node:fs/promises";
import * as path from "node:path";

import { RAW_DOCS_DIR, FETCH_MANIFEST_FILE } from "./paths.js";
import { SHOPIFY_SOURCE_CATALOG } from "./sourceCatalog.js";
import type { FetchManifest, RawDocFile } from "./types.js";

const REQUEST_TIMEOUT_MS = 15000;

function rawFilePathFor(id: string): string {
  return path.join(RAW_DOCS_DIR, `${id}.raw.json`);
}

async function fetchSingleSource(
  source: (typeof SHOPIFY_SOURCE_CATALOG)[number],
): Promise<RawDocFile> {
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(source.sourceUrl, {
      signal: controller.signal,
      headers: {
        "user-agent": "shopify-docs-mcp-phase3-pipeline",
      },
    });

    if (!response.ok) {
      return {
        id: source.id,
        topic: source.topic,
        sourceUrl: source.sourceUrl,
        titleHint: source.titleHint,
        fetchedAt,
        status: "failed",
        httpStatus: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    return {
      id: source.id,
      topic: source.topic,
      sourceUrl: source.sourceUrl,
      titleHint: source.titleHint,
      fetchedAt,
      status: "success",
      httpStatus: response.status,
      html,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: source.id,
      topic: source.topic,
      sourceUrl: source.sourceUrl,
      titleHint: source.titleHint,
      fetchedAt,
      status: "failed",
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(RAW_DOCS_DIR, { recursive: true });
}

export async function runFetchDocs(): Promise<void> {
  await ensureDir();

  const failures: FetchManifest["failures"] = [];
  let successCount = 0;

  for (const source of SHOPIFY_SOURCE_CATALOG) {
    console.log(`[fetch] ${source.id} -> ${source.sourceUrl}`);
    const rawDoc = await fetchSingleSource(source);
    await fs.writeFile(
      rawFilePathFor(source.id),
      JSON.stringify(rawDoc, null, 2),
      "utf8",
    );

    if (rawDoc.status === "success") {
      successCount += 1;
      console.log(`[fetch] OK ${source.id}`);
    } else {
      failures.push({
        id: rawDoc.id,
        sourceUrl: rawDoc.sourceUrl,
        reason: rawDoc.error ?? `HTTP ${rawDoc.httpStatus ?? "unknown"}`,
      });
      console.warn(
        `[fetch] FAIL ${source.id}: ${rawDoc.error ?? "unknown error"}`,
      );
    }
  }

  const manifest: FetchManifest = {
    fetchedAt: new Date().toISOString(),
    total: SHOPIFY_SOURCE_CATALOG.length,
    successCount,
    failureCount: failures.length,
    failures,
  };

  await fs.writeFile(
    FETCH_MANIFEST_FILE,
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  console.log(
    `[fetch] Done: ${manifest.successCount}/${manifest.total} success, ${manifest.failureCount} failure(s)`,
  );
}

void runFetchDocs().catch((error) => {
  console.error("[fetch] Fatal pipeline error:", error);
  process.exitCode = 1;
});
