import type {
  NormalizedDocFile,
  NormalizedDocNormalizationMetadata,
  NormalizedDocRuleCandidateSignal,
  ShopifyDocsIndex,
  ShopifyDocTopic,
} from "./types.js";

const VALID_TOPICS = new Set<ShopifyDocTopic>([
  "schema",
  "sections-architecture",
  "json-templates",
  "liquid-reference",
  "os2-compatibility",
]);

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const item of value) {
    const parsed = asString(item);
    if (parsed) {
      unique.add(parsed);
    }
  }

  return [...unique];
}

function asSchemaHints(value: unknown): NormalizedDocFile["schemaHints"] {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const hints = value as Record<string, unknown>;
  return {
    settings: hints.settings === true,
    blocks: hints.blocks === true,
    presets: hints.presets === true,
    enabled_on: hints.enabled_on === true,
    disabled_on: hints.disabled_on === true,
    max_blocks: hints.max_blocks === true,
  };
}

function asChunks(
  value: unknown,
  fallbackSummary: string,
): NormalizedDocFile["chunks"] {
  if (!Array.isArray(value)) {
    return fallbackSummary ? [{ id: "chunk-1", text: fallbackSummary }] : [];
  }

  const chunks: NormalizedDocFile["chunks"] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const obj = raw as Record<string, unknown>;
    const id = asString(obj.id);
    const text = asString(obj.text);
    const sectionHint = asString(obj.sectionHint);
    if (!id || !text) {
      continue;
    }

    chunks.push({
      id,
      text,
      sectionHint: sectionHint ?? undefined,
    });
  }

  if (chunks.length > 0) {
    return chunks;
  }

  return fallbackSummary ? [{ id: "chunk-1", text: fallbackSummary }] : [];
}

function defaultNormalizationMetadata(input: {
  parser: "legacy-flat" | "structured-html";
  chunkCount: number;
  hasSectionHints: boolean;
  qualityFlags: string[];
}): NormalizedDocNormalizationMetadata {
  return {
    formatVersion: input.parser === "structured-html" ? "1.1" : "1.0-legacy",
    parser: input.parser,
    blockCount: input.chunkCount,
    hasSectionHints: input.hasSectionHints,
    qualityFlags: input.qualityFlags,
  };
}

function asRuleCandidateSignals(
  value: unknown,
): NormalizedDocRuleCandidateSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const signals: NormalizedDocRuleCandidateSignal[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const obj = raw as Record<string, unknown>;
    const text = asString(obj.text);
    const sectionHint = asString(obj.sectionHint);
    const confidence =
      obj.confidence === "low" ||
      obj.confidence === "medium" ||
      obj.confidence === "high"
        ? obj.confidence
        : null;
    const score =
      typeof obj.score === "number" && Number.isFinite(obj.score)
        ? Number(obj.score.toFixed(3))
        : null;

    if (!text || !confidence || score === null) {
      continue;
    }

    signals.push({
      text,
      score,
      confidence,
      sectionHint: sectionHint ?? undefined,
    });
  }

  return signals;
}

function asNormalizationMetadata(
  value: unknown,
  chunkCount: number,
  hasSectionHints: boolean,
): NormalizedDocNormalizationMetadata {
  if (!value || typeof value !== "object") {
    return defaultNormalizationMetadata({
      parser: "legacy-flat",
      chunkCount,
      hasSectionHints,
      qualityFlags: [],
    });
  }

  const obj = value as Record<string, unknown>;
  const formatVersion =
    obj.formatVersion === "1.1" || obj.formatVersion === "1.0-legacy"
      ? obj.formatVersion
      : "1.0-legacy";
  const parser =
    obj.parser === "structured-html" || obj.parser === "legacy-flat"
      ? obj.parser
      : formatVersion === "1.1"
        ? "structured-html"
        : "legacy-flat";

  const blockCount =
    typeof obj.blockCount === "number" && Number.isFinite(obj.blockCount)
      ? Math.max(0, Math.trunc(obj.blockCount))
      : chunkCount;

  const qualityFlags = asStringArray(obj.qualityFlags);
  const ruleCandidateSignals = asRuleCandidateSignals(obj.ruleCandidateSignals);

  return {
    formatVersion,
    parser,
    blockCount,
    hasSectionHints:
      obj.hasSectionHints === true || obj.hasSectionHints === false
        ? obj.hasSectionHints
        : hasSectionHints,
    qualityFlags,
    ruleCandidateSignals,
  };
}

export function coerceNormalizedDocFile(
  value: unknown,
): NormalizedDocFile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  const id = asString(raw.id);
  const topicRaw = asString(raw.topic);
  const sourceUrl = asString(raw.sourceUrl);
  const title = asString(raw.title);

  if (!id || !topicRaw || !sourceUrl || !title) {
    return null;
  }

  if (!VALID_TOPICS.has(topicRaw as ShopifyDocTopic)) {
    return null;
  }

  const documentSummary =
    asString(raw.documentSummary) ??
    "No documentary excerpt available from normalized content.";

  const ruleCandidates = asStringArray(raw.ruleCandidates);
  const keywords = asStringArray(raw.keywords);
  const chunks = asChunks(raw.chunks, documentSummary);

  const fetchedAt = asString(raw.fetchedAt) ?? new Date(0).toISOString();
  const lastIndexedAt =
    asString(raw.lastIndexedAt) ?? new Date(0).toISOString();

  const hasSectionHints = chunks.some((chunk) => Boolean(chunk.sectionHint));
  const qualityFlags: string[] = [];
  if (documentSummary.length === 0) {
    qualityFlags.push("empty-summary");
  }
  if (chunks.length === 0) {
    qualityFlags.push("empty-chunks");
  }

  const normalization = asNormalizationMetadata(
    raw.normalization,
    chunks.length,
    hasSectionHints,
  );

  if (qualityFlags.length > 0) {
    const mergedQualityFlags = new Set([
      ...normalization.qualityFlags,
      ...qualityFlags,
    ]);
    normalization.qualityFlags = [...mergedQualityFlags];
  }

  return {
    id,
    topic: topicRaw as ShopifyDocTopic,
    sourceUrl,
    title,
    documentSummary,
    ruleCandidates,
    keywords,
    chunks,
    fetchedAt,
    lastIndexedAt,
    schemaHints: asSchemaHints(raw.schemaHints),
    normalization,
  };
}

export function coerceShopifyDocsIndex(
  value: unknown,
): ShopifyDocsIndex | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (raw.version !== "1.0") {
    return null;
  }

  const generatedAt = asString(raw.generatedAt) ?? new Date(0).toISOString();

  const rawDocs = Array.isArray(raw.documents) ? raw.documents : [];
  const docs = rawDocs
    .map((doc) => coerceNormalizedDocFile(doc))
    .filter((doc): doc is NormalizedDocFile => Boolean(doc));

  return {
    version: "1.0",
    generatedAt,
    sourceCount: new Set(docs.map((doc) => doc.sourceUrl)).size,
    documentCount: docs.length,
    documents: docs,
  };
}
