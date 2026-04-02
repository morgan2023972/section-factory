import * as fs from "node:fs/promises";
import * as path from "node:path";

import { NORMALIZED_DOCS_DIR, RAW_DOCS_DIR } from "./paths.js";
import { SHOPIFY_SOURCE_CATALOG } from "./sourceCatalog.js";
import type { NormalizedDocFile, RawDocFile } from "./types.js";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "this",
  "your",
  "into",
  "shopify",
  "theme",
  "themes",
  "section",
  "sections",
  "json",
  "liquid",
]);

function rawFilePathFor(id: string): string {
  return path.join(RAW_DOCS_DIR, `${id}.raw.json`);
}

function normalizedFilePathFor(id: string): string {
  return path.join(NORMALIZED_DOCS_DIR, `${id}.normalized.json`);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlNoise(html: string): string {
  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(text);
}

function extractTitle(html: string, titleHint: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return titleHint;
  }

  return decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim();
}

function chunkText(
  text: string,
  maxSize = 900,
): Array<{ id: string; text: string }> {
  if (!text) {
    return [];
  }

  const chunks: Array<{ id: string; text: string }> = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < text.length) {
    const end = Math.min(cursor + maxSize, text.length);
    const slice = text.slice(cursor, end).trim();
    if (slice.length > 0) {
      chunks.push({ id: `chunk-${chunkIndex + 1}`, text: slice });
      chunkIndex += 1;
    }
    cursor = end;
  }

  return chunks;
}

function extractKeywords(text: string, limit = 12): string[] {
  const frequencies = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [];

  for (const word of words) {
    if (STOP_WORDS.has(word)) {
      continue;
    }
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function extractKeyRules(text: string, limit = 8): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);

  return sentences
    .filter((sentence) =>
      /(should|must|avoid|include|use|required)/i.test(sentence),
    )
    .slice(0, limit);
}

function buildSummary(text: string): string {
  const summary = text.slice(0, 320).trim();
  if (summary.length === 0) {
    return "No summary available from normalized content.";
  }

  return summary;
}

function buildSchemaSignals(text: string): NormalizedDocFile["schemaSignals"] {
  const lower = text.toLowerCase();
  return {
    settings: lower.includes("settings"),
    blocks: lower.includes("blocks"),
    presets: lower.includes("presets"),
    enabled_on: lower.includes("enabled_on"),
    disabled_on: lower.includes("disabled_on"),
    max_blocks: lower.includes("max_blocks"),
  };
}

async function readRawDoc(id: string): Promise<RawDocFile | null> {
  try {
    const content = await fs.readFile(rawFilePathFor(id), "utf8");
    return JSON.parse(content) as RawDocFile;
  } catch {
    return null;
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(NORMALIZED_DOCS_DIR, { recursive: true });
}

export async function runNormalizeDocs(): Promise<void> {
  await ensureDir();
  const indexedAt = new Date().toISOString();

  for (const source of SHOPIFY_SOURCE_CATALOG) {
    const rawDoc = await readRawDoc(source.id);
    if (!rawDoc) {
      console.warn(`[normalize] Skip ${source.id}: raw file not found`);
      continue;
    }

    if (rawDoc.status !== "success" || !rawDoc.html) {
      console.warn(
        `[normalize] Skip ${source.id}: fetch status=${rawDoc.status}`,
      );
      continue;
    }

    const title = extractTitle(rawDoc.html, rawDoc.titleHint);
    const cleanText = stripHtmlNoise(rawDoc.html);
    const chunks = chunkText(cleanText);

    const normalized: NormalizedDocFile = {
      id: rawDoc.id,
      topic: rawDoc.topic,
      sourceUrl: rawDoc.sourceUrl,
      title,
      summary: buildSummary(cleanText),
      keyRules: extractKeyRules(cleanText),
      keywords: extractKeywords(cleanText),
      chunks,
      fetchedAt: rawDoc.fetchedAt,
      lastIndexedAt: indexedAt,
      schemaSignals:
        rawDoc.topic === "schema" ? buildSchemaSignals(cleanText) : undefined,
    };

    await fs.writeFile(
      normalizedFilePathFor(source.id),
      JSON.stringify(normalized, null, 2),
      "utf8",
    );
    console.log(`[normalize] OK ${source.id} -> ${chunks.length} chunk(s)`);
  }
}

void runNormalizeDocs().catch((error) => {
  console.error("[normalize] Fatal pipeline error:", error);
  process.exitCode = 1;
});
