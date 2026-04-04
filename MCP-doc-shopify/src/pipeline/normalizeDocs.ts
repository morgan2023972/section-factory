import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { NORMALIZED_DOCS_DIR, RAW_DOCS_DIR } from "./paths.js";
import { SHOPIFY_SOURCE_CATALOG } from "./sourceCatalog.js";
import type {
  NormalizedDocFile,
  NormalizedDocRuleCandidateSignal,
  RawDocFile,
} from "./types.js";

interface StructuredTextBlock {
  sectionHint?: string;
  text: string;
}

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

function stripInnerTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function markHeadings(html: string): string {
  return html.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, __, inner) => {
    const heading = stripInnerTags(inner);
    if (!heading) {
      return "\n";
    }

    return `\n__HEADING__ ${heading}\n`;
  });
}

function addStructuralLineBreaks(html: string): string {
  return html
    .replace(
      /<\/(p|li|ul|ol|section|article|div|tr|td|blockquote|pre)>/gi,
      "\n",
    )
    .replace(/<br\s*\/?\s*>/gi, "\n");
}

export function extractStructuredTextBlocks(
  html: string,
): StructuredTextBlock[] {
  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  const withHeadingMarkers = markHeadings(withoutScripts);
  const withBreaks = addStructuralLineBreaks(withHeadingMarkers);
  const plain = decodeHtmlEntities(withBreaks)
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const blocks: StructuredTextBlock[] = [];
  let currentSectionHint: string | undefined;

  for (const rawLine of plain.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("__HEADING__ ")) {
      const heading = line.slice("__HEADING__ ".length).trim();
      currentSectionHint = heading || currentSectionHint;
      continue;
    }

    blocks.push({
      sectionHint: currentSectionHint,
      text: line,
    });
  }

  if (blocks.length > 0) {
    return blocks;
  }

  const fallbackText = stripHtmlNoise(html);
  if (!fallbackText) {
    return [];
  }

  return [{ text: fallbackText }];
}

function splitLongText(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > maxSize) {
    const candidate = remaining.slice(0, maxSize + 1);
    const lastSpace = candidate.lastIndexOf(" ");
    const splitAt = lastSpace > Math.floor(maxSize * 0.6) ? lastSpace : maxSize;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

export function chunkStructuredTextBlocks(
  blocks: readonly StructuredTextBlock[],
  maxSize = 900,
): Array<{ id: string; text: string; sectionHint?: string }> {
  if (blocks.length === 0) {
    return [];
  }

  const chunks: Array<{ id: string; text: string; sectionHint?: string }> = [];
  let chunkIndex = 0;
  let currentText = "";
  let currentSectionHint: string | undefined;

  const flush = (): void => {
    const text = currentText.trim();
    if (!text) {
      return;
    }

    chunks.push({
      id: `chunk-${chunkIndex + 1}`,
      text,
      sectionHint: currentSectionHint,
    });

    chunkIndex += 1;
    currentText = "";
    currentSectionHint = undefined;
  };

  for (const block of blocks) {
    const blockParts = splitLongText(block.text, maxSize);

    for (const part of blockParts) {
      if (!currentText) {
        currentText = part;
        currentSectionHint = block.sectionHint;
        continue;
      }

      const candidate = `${currentText} ${part}`;
      if (candidate.length <= maxSize) {
        currentText = candidate;
        continue;
      }

      flush();
      currentText = part;
      currentSectionHint = block.sectionHint;
    }
  }

  flush();
  return chunks;
}

function flattenStructuredText(blocks: readonly StructuredTextBlock[]): string {
  return blocks
    .map((block) => block.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSentenceForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitBlockIntoSentences(block: StructuredTextBlock): Array<{
  text: string;
  sectionHint?: string;
}> {
  return block.text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 28 && sentence.length <= 320)
    .map((text) => ({ text, sectionHint: block.sectionHint }));
}

function scoreRuleCandidate(input: {
  text: string;
  sectionHint?: string;
}): number {
  const lower = input.text.toLowerCase();

  const mandatoryTerms = ["must", "required", "require"];
  const advisoryTerms = [
    "should",
    "avoid",
    "include",
    "use",
    "recommended",
    "recommend",
  ];
  const schemaTerms = [
    "settings",
    "blocks",
    "presets",
    "enabled_on",
    "disabled_on",
    "max_blocks",
    "schema",
  ];

  const mandatoryHits = mandatoryTerms.filter((term) => lower.includes(term));
  const advisoryHits = advisoryTerms.filter((term) => lower.includes(term));
  const schemaHits = schemaTerms.filter((term) => lower.includes(term));

  let score = 0;
  score += mandatoryHits.length * 2.5;
  score += advisoryHits.length * 1.25;
  score += Math.min(schemaHits.length, 3) * 0.8;

  if (input.sectionHint) {
    const sectionLower = input.sectionHint.toLowerCase();
    if (
      sectionLower.includes("schema") ||
      sectionLower.includes("rule") ||
      sectionLower.includes("guid")
    ) {
      score += 0.75;
    }
  }

  const targetLength = 120;
  const lengthDelta = Math.abs(input.text.length - targetLength);
  const lengthBonus = Math.max(0, 1 - lengthDelta / targetLength);
  score += lengthBonus;

  if (input.text.length < 35) {
    score -= 0.5;
  }

  if (input.text.length > 240) {
    score -= 0.5;
  }

  return Number(score.toFixed(3));
}

function confidenceFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 4.2) {
    return "high";
  }

  if (score >= 2.6) {
    return "medium";
  }

  return "low";
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

export function extractRuleCandidateSignals(
  blocks: readonly StructuredTextBlock[],
  limit = 8,
): NormalizedDocRuleCandidateSignal[] {
  if (blocks.length === 0) {
    return [];
  }

  const scored = blocks
    .flatMap((block) => splitBlockIntoSentences(block))
    .map((candidate) => ({
      ...candidate,
      score: scoreRuleCandidate(candidate),
    }))
    .filter((candidate) => candidate.score >= 2.2);

  const byNormalizedSentence = new Map<
    string,
    { text: string; score: number; sectionHint?: string }
  >();
  for (const candidate of scored) {
    const key = normalizeSentenceForDedup(candidate.text);
    if (!key) {
      continue;
    }

    const previous = byNormalizedSentence.get(key);
    if (!previous || candidate.score > previous.score) {
      byNormalizedSentence.set(key, candidate);
    }
  }

  return [...byNormalizedSentence.values()]
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map((candidate) => ({
      text: candidate.text,
      score: candidate.score,
      confidence: confidenceFromScore(candidate.score),
      sectionHint: candidate.sectionHint,
    }));
}

function lastSentenceEndIndex(text: string): number {
  const period = text.lastIndexOf(".");
  const exclamation = text.lastIndexOf("!");
  const question = text.lastIndexOf("?");

  return Math.max(period, exclamation, question);
}

export function buildDocumentSummary(text: string, maxLength = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length === 0) {
    return "No documentary excerpt available from normalized content.";
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  const boundaryWindow = clean.slice(0, maxLength + 1);
  const sentenceEnd = lastSentenceEndIndex(boundaryWindow);
  if (sentenceEnd >= Math.floor(maxLength * 0.55)) {
    return boundaryWindow.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = boundaryWindow.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLength * 0.55)) {
    return boundaryWindow.slice(0, lastSpace).trim();
  }

  return boundaryWindow.trim();
}

function buildSchemaHints(text: string): NormalizedDocFile["schemaHints"] {
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
    const structuredBlocks = extractStructuredTextBlocks(rawDoc.html);
    const cleanText = flattenStructuredText(structuredBlocks);
    const chunks = chunkStructuredTextBlocks(structuredBlocks);
    const ruleCandidateSignals = extractRuleCandidateSignals(structuredBlocks);
    const ruleCandidates = ruleCandidateSignals.map((signal) => signal.text);

    const normalized: NormalizedDocFile = {
      id: rawDoc.id,
      topic: rawDoc.topic,
      sourceUrl: rawDoc.sourceUrl,
      title,
      documentSummary: buildDocumentSummary(cleanText),
      ruleCandidates,
      keywords: extractKeywords(cleanText),
      chunks,
      fetchedAt: rawDoc.fetchedAt,
      lastIndexedAt: indexedAt,
      schemaHints:
        rawDoc.topic === "schema" ? buildSchemaHints(cleanText) : undefined,
      normalization: {
        formatVersion: "1.1",
        parser: "structured-html",
        blockCount: structuredBlocks.length,
        hasSectionHints: structuredBlocks.some((block) =>
          Boolean(block.sectionHint),
        ),
        qualityFlags: [
          ...(structuredBlocks.length > 0 ? [] : ["empty-structured-blocks"]),
          ...(cleanText.length > 0 ? [] : ["empty-clean-text"]),
          ...(chunks.length > 0 ? [] : ["empty-chunks"]),
          ...(ruleCandidates.length > 0 ? [] : ["no-rule-candidates"]),
        ],
        ruleCandidateSignals,
      },
    };

    await fs.writeFile(
      normalizedFilePathFor(source.id),
      JSON.stringify(normalized, null, 2),
      "utf8",
    );
    console.log(`[normalize] OK ${source.id} -> ${chunks.length} chunk(s)`);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  void runNormalizeDocs().catch((error) => {
    console.error("[normalize] Fatal pipeline error:", error);
    process.exitCode = 1;
  });
}
