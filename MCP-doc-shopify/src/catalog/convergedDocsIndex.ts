import { shopifyDocsProvider } from "./provider.js";
import type {
  NormalizedDocFile,
  ShopifyDocTopic,
  ShopifyDocsIndex,
} from "../pipeline/types.js";

const STATIC_SCHEMA_DOC_ID = "static-schema-guide";
const STATIC_SECTION_RULES_DOC_ID = "static-section-rules";

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenizeKeywords(text: string, max = 12): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const unique: string[] = [];
  for (const token of tokens) {
    if (!unique.includes(token)) {
      unique.push(token);
    }
    if (unique.length >= max) {
      break;
    }
  }

  return unique;
}

function makeStaticDoc(input: {
  id: string;
  topic: ShopifyDocTopic;
  sourceUrl: string;
  title: string;
  summary: string;
  ruleCandidates: readonly string[];
  keywordsSeed: string;
  nowIso: string;
}): NormalizedDocFile {
  const chunkText = compact(
    `${input.summary} ${input.ruleCandidates.join(" ")}`,
  );
  return {
    id: input.id,
    topic: input.topic,
    sourceUrl: input.sourceUrl,
    title: input.title,
    documentSummary: compact(input.summary),
    ruleCandidates: input.ruleCandidates
      .map((rule) => compact(rule))
      .filter((rule) => rule.length > 0)
      .slice(0, 8),
    keywords: tokenizeKeywords(input.keywordsSeed),
    chunks: [
      {
        id: "chunk-1",
        text: chunkText.length > 0 ? chunkText : input.title,
        sectionHint: "Static baseline",
      },
    ],
    fetchedAt: input.nowIso,
    lastIndexedAt: input.nowIso,
    normalization: {
      formatVersion: "1.1",
      parser: "legacy-flat",
      blockCount: 1,
      hasSectionHints: true,
      qualityFlags: ["static-fallback"],
    },
  };
}

export function buildStaticDocumentaryDocs(
  nowIso?: string,
): NormalizedDocFile[] {
  const at = nowIso ?? new Date().toISOString();
  const sectionRules = shopifyDocsProvider.getSectionRules();
  const schemaGuide = shopifyDocsProvider.getSchemaGuide();

  const sectionRulesDoc = makeStaticDoc({
    id: STATIC_SECTION_RULES_DOC_ID,
    topic: "sections-architecture",
    sourceUrl: "shopify://static/section-rules",
    title: sectionRules.title,
    summary:
      "Static baseline rules for reusable sections, scoped assets and accessibility.",
    ruleCandidates: sectionRules.rules.slice(0, 6),
    keywordsSeed: `${sectionRules.title} ${sectionRules.rules.join(" ")}`,
    nowIso: at,
  });

  const schemaGuideDoc = makeStaticDoc({
    id: STATIC_SCHEMA_DOC_ID,
    topic: "schema",
    sourceUrl: "shopify://static/schema-guide",
    title: schemaGuide.title,
    summary: schemaGuide.schema.notes.slice(0, 3).join(" "),
    ruleCandidates: schemaGuide.schema.attributes.map(
      (attribute) => `Schema may include attribute: ${attribute}.`,
    ),
    keywordsSeed: `${schemaGuide.title} ${schemaGuide.schema.attributes.join(" ")}`,
    nowIso: at,
  });

  return [schemaGuideDoc, sectionRulesDoc].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

function docFingerprint(doc: NormalizedDocFile): string {
  return `${doc.topic}|${compact(doc.title).toLowerCase()}`;
}

function dedupeDocs(docs: readonly NormalizedDocFile[]): NormalizedDocFile[] {
  const byId = new Map<string, NormalizedDocFile>();
  const byFingerprint = new Set<string>();

  for (const doc of docs) {
    if (byId.has(doc.id)) {
      continue;
    }

    const fingerprint = docFingerprint(doc);
    if (byFingerprint.has(fingerprint)) {
      continue;
    }

    byId.set(doc.id, doc);
    byFingerprint.add(fingerprint);
  }

  return [...byId.values()];
}

export function buildConvergedDocsIndex(
  baseIndex: ShopifyDocsIndex,
  nowIso?: string,
): ShopifyDocsIndex {
  const staticDocs = buildStaticDocumentaryDocs(nowIso);
  const pipelineDocs = dedupeDocs(baseIndex.documents);

  let mergedDocs: NormalizedDocFile[] = [];
  if (pipelineDocs.length === 0) {
    mergedDocs = [...staticDocs];
  } else {
    const topicsFromPipeline = new Set(pipelineDocs.map((doc) => doc.topic));
    const staticSupplements = staticDocs.filter(
      (doc) => !topicsFromPipeline.has(doc.topic),
    );
    mergedDocs = dedupeDocs([...pipelineDocs, ...staticSupplements]);
  }

  return {
    version: baseIndex.version,
    generatedAt: baseIndex.generatedAt,
    sourceCount: new Set(mergedDocs.map((doc) => doc.sourceUrl)).size,
    documentCount: mergedDocs.length,
    documents: mergedDocs,
  };
}
