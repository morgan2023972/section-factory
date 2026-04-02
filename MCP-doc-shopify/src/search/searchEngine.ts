import { readLocalDocsIndex } from "../catalog/localDocsIndex.js";
import type {
  NormalizedDocFile,
  ShopifyDocTopic,
  ShopifyDocsIndex,
} from "../pipeline/types.js";
import type {
  SearchHit,
  SearchResultPayload,
  SearchShopifyDocsInput,
  SearchTopicFilter,
} from "./types.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function countTermHits(text: string, terms: string[]): number {
  const lower = normalizeText(text);
  let hits = 0;

  for (const term of terms) {
    if (lower.includes(term)) {
      hits += 1;
    }
  }

  return hits;
}

function mapFilterToTopics(
  filter?: SearchTopicFilter,
): ShopifyDocTopic[] | null {
  if (!filter) {
    return null;
  }

  const mapping: Record<SearchTopicFilter, ShopifyDocTopic[]> = {
    sections: ["sections-architecture", "json-templates"],
    blocks: ["schema", "sections-architecture"],
    presets: ["schema", "sections-architecture"],
    schema: ["schema"],
    liquid: ["liquid-reference"],
    os2: ["os2-compatibility", "sections-architecture"],
  };

  return mapping[filter];
}

function docUri(doc: NormalizedDocFile): string {
  return `shopify://docs/${doc.id}`;
}

function makeSnippet(doc: NormalizedDocFile, terms: string[]): string {
  const summary = doc.summary.trim();
  const summaryHits = countTermHits(summary, terms);

  let bestChunk = "";
  let bestChunkHits = -1;
  for (const chunk of doc.chunks) {
    const hits = countTermHits(chunk.text, terms);
    if (hits > bestChunkHits) {
      bestChunk = chunk.text;
      bestChunkHits = hits;
    }
  }

  const source = bestChunkHits > summaryHits ? bestChunk : summary;
  const snippet = source.slice(0, 240).trim();
  return snippet.length > 0 ? snippet : "No snippet available.";
}

function scoreDocument(
  doc: NormalizedDocFile,
  terms: string[],
  topicFilter?: SearchTopicFilter,
  sectionCategory?: string,
): number {
  let score = 0;

  const titleHits = countTermHits(doc.title, terms);
  const summaryHits = countTermHits(doc.summary, terms);
  const keywordsHits = countTermHits(doc.keywords.join(" "), terms);
  const chunkHits = doc.chunks.reduce(
    (acc, chunk) => acc + countTermHits(chunk.text, terms),
    0,
  );

  score += titleHits * 8;
  score += summaryHits * 4;
  score += keywordsHits * 6;
  score += Math.min(chunkHits, 10) * 2;

  if (topicFilter) {
    score += 5;

    if (topicFilter === "blocks") {
      score +=
        countTermHits(`${doc.summary} ${doc.keywords.join(" ")}`, ["blocks"]) *
        2;
    }

    if (topicFilter === "presets") {
      score +=
        countTermHits(`${doc.summary} ${doc.keywords.join(" ")}`, ["presets"]) *
        2;
    }
  }

  if (sectionCategory) {
    const categoryHits = countTermHits(
      `${doc.title} ${doc.summary} ${doc.keywords.join(" ")} ${doc.chunks
        .map((chunk) => chunk.text)
        .join(" ")}`,
      [normalizeText(sectionCategory)],
    );
    score += categoryHits > 0 ? 2 : 0;
  }

  return score;
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  if (limit < 1) {
    return 1;
  }

  if (limit > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return Math.floor(limit);
}

export function searchShopifyDocs(
  input: SearchShopifyDocsInput,
): SearchResultPayload {
  const index = readLocalDocsIndex();
  return searchShopifyDocsInIndex(input, index);
}

export function searchShopifyDocsInIndex(
  input: SearchShopifyDocsInput,
  index: ShopifyDocsIndex,
): SearchResultPayload {
  const query = input.query?.trim() ?? "";
  if (!query) {
    return {
      query: input.query ?? "",
      topic: input.topic,
      sectionCategory: input.sectionCategory,
      totalHits: 0,
      returnedHits: 0,
      results: [],
      note: "Query is empty. Provide at least one search term.",
    };
  }

  const limit = clampLimit(input.limit);
  const terms = tokenize(query);
  if (terms.length === 0) {
    return {
      query,
      topic: input.topic,
      sectionCategory: input.sectionCategory,
      totalHits: 0,
      returnedHits: 0,
      results: [],
      note: "Query does not contain usable terms.",
    };
  }

  const topicScope = mapFilterToTopics(input.topic);
  const scopedDocs = topicScope
    ? index.documents.filter((doc) => topicScope.includes(doc.topic))
    : index.documents;

  const hits: SearchHit[] = scopedDocs
    .map((doc) => {
      const score = scoreDocument(
        doc,
        terms,
        input.topic,
        input.sectionCategory,
      );
      return {
        doc,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
    .map((entry) => ({
      docId: entry.doc.id,
      title: entry.doc.title,
      topic: entry.doc.topic,
      uri: docUri(entry.doc),
      sourceUrl: entry.doc.sourceUrl,
      snippet: makeSnippet(entry.doc, terms),
      score: entry.score,
      lastIndexedAt: entry.doc.lastIndexedAt,
    }));

  const limited = hits.slice(0, limit);

  return {
    query,
    topic: input.topic,
    sectionCategory: input.sectionCategory,
    totalHits: hits.length,
    returnedHits: limited.length,
    results: limited,
    note:
      index.documentCount === 0
        ? "Local index is empty. Run docs:pipeline before searching."
        : undefined,
  };
}
