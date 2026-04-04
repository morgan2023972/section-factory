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

const CATEGORY_TOPIC_AFFINITY: Readonly<
  Record<string, Partial<Record<ShopifyDocTopic, number>>>
> = {
  hero: {
    "sections-architecture": 1.35,
    schema: 1.2,
    "json-templates": 1.05,
    "liquid-reference": 0.9,
  },
  faq: {
    schema: 1.25,
    "sections-architecture": 1.15,
    "liquid-reference": 0.95,
  },
  testimonial: {
    "sections-architecture": 1.25,
    schema: 1.1,
    "liquid-reference": 0.95,
  },
};

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

function termCoverageRatio(text: string, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }

  return countTermHits(text, terms) / terms.length;
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

function trimSnippet(input: string, maxLength = 240): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  const window = clean.slice(0, maxLength + 1);
  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLength * 0.6)) {
    return window.slice(0, lastSpace).trim();
  }

  return clean.slice(0, maxLength).trim();
}

function makeSnippet(doc: NormalizedDocFile, terms: string[]): string {
  const documentSummary = doc.documentSummary.trim();
  const summaryScore =
    countTermHits(documentSummary, terms) * 2 +
    termCoverageRatio(documentSummary, terms);

  let bestChunk = "";
  let bestChunkScore = -1;
  for (const chunk of doc.chunks) {
    const chunkCoverage = termCoverageRatio(chunk.text, terms);
    const chunkScore =
      countTermHits(chunk.text, terms) * 2 +
      chunkCoverage +
      (chunk.sectionHint ? 0.2 : 0);

    if (chunkScore > bestChunkScore) {
      bestChunk = chunk.text;
      bestChunkScore = chunkScore;
    }
  }

  const source = bestChunkScore > summaryScore ? bestChunk : documentSummary;
  const snippet = trimSnippet(source, 240);
  return snippet.length > 0 ? snippet : "No snippet available.";
}

function applyCategoryTopicAffinity(
  score: number,
  docTopic: ShopifyDocTopic,
  sectionCategory?: string,
): number {
  if (!sectionCategory) {
    return score;
  }

  const affinity = CATEGORY_TOPIC_AFFINITY[normalizeText(sectionCategory)];
  if (!affinity) {
    return score;
  }

  return score * (affinity[docTopic] ?? 1);
}

function scoreDocument(
  doc: NormalizedDocFile,
  terms: string[],
  topicFilter?: SearchTopicFilter,
  sectionCategory?: string,
): number {
  let score = 0;

  const titleHits = countTermHits(doc.title, terms);
  const summaryHits = countTermHits(doc.documentSummary, terms);
  const keywordsHits = countTermHits(doc.keywords.join(" "), terms);
  const chunkHits = doc.chunks.reduce(
    (acc, chunk) => acc + countTermHits(chunk.text, terms),
    0,
  );

  const titleCoverage = termCoverageRatio(doc.title, terms);
  const summaryCoverage = termCoverageRatio(doc.documentSummary, terms);
  const keywordsCoverage = termCoverageRatio(doc.keywords.join(" "), terms);

  const tokenCount = Math.max(
    1,
    `${doc.title} ${doc.documentSummary} ${doc.chunks
      .map((chunk) => chunk.text)
      .join(" ")}`
      .split(/\s+/)
      .filter((token) => token.length > 0).length,
  );
  const lengthNormalization = Math.sqrt(Math.min(tokenCount, 2000) / 120);

  score += titleHits * 8;
  score += summaryHits * 4;
  score += keywordsHits * 6;
  score += Math.min(chunkHits, 12) * 2;
  score += titleCoverage * 6;
  score += summaryCoverage * 3;
  score += keywordsCoverage * 2;

  const hasAllTermsInTitle = terms.every((term) =>
    normalizeText(doc.title).includes(term),
  );
  if (hasAllTermsInTitle) {
    score += 4;
  }

  score = score / Math.max(lengthNormalization, 1);

  if (topicFilter) {
    score += 4;

    if (topicFilter === "blocks") {
      score +=
        countTermHits(`${doc.documentSummary} ${doc.keywords.join(" ")}`, [
          "blocks",
        ]) * 2;
    }

    if (topicFilter === "presets") {
      score +=
        countTermHits(`${doc.documentSummary} ${doc.keywords.join(" ")}`, [
          "presets",
        ]) * 2;
    }
  }

  if (sectionCategory) {
    const categoryHits = countTermHits(
      `${doc.title} ${doc.documentSummary} ${doc.keywords.join(" ")} ${doc.chunks
        .map((chunk) => chunk.text)
        .join(" ")}`,
      [normalizeText(sectionCategory)],
    );
    score += categoryHits > 0 ? 2.5 : 0;
  }

  score = applyCategoryTopicAffinity(score, doc.topic, sectionCategory);

  return Number(score.toFixed(3));
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
