import { readLocalDocsIndex } from "../catalog/localDocsIndex.js";
import { shopifyDocsProvider } from "../catalog/provider.js";
import type { GuideResource } from "../catalog/types.js";
import type { NormalizedDocFile } from "../pipeline/types.js";
import { searchShopifyDocs } from "../search/searchEngine.js";
import type { SearchHit } from "../search/types.js";
import type {
  BuildSectionFactoryPromptContextInput,
  SectionFactoryPromptContextPayload,
} from "./types.js";

function compact(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function firstUsefulLines(markdown: string, limit: number): string[] {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const useful = lines.filter(
    (line) =>
      line.startsWith("- ") ||
      line.startsWith("1.") ||
      line.startsWith("2.") ||
      line.startsWith("3.") ||
      line.startsWith("## "),
  );

  return useful.slice(0, limit).map((line) => compact(line));
}

function docsToPromptHints(
  docs: readonly NormalizedDocFile[],
  limit = 3,
): string[] {
  return docs.slice(0, limit).map((doc) => {
    const ruleHints = doc.keyRules.slice(0, 2).join(" | ");
    const schemaHints = doc.schemaSignals
      ? `schema-signals settings=${doc.schemaSignals.settings} blocks=${doc.schemaSignals.blocks} presets=${doc.schemaSignals.presets}`
      : "";
    return compact(
      `${doc.title} [${doc.topic}] :: ${doc.summary} :: ${ruleHints} ${schemaHints}`,
    );
  });
}

export function buildPromptContextFromGuides(
  guides: readonly GuideResource[],
  sectionCategory?: string,
): string {
  const blocks: string[] = [];

  blocks.push("Shopify generation constraints:");
  for (const guide of guides) {
    const lines = firstUsefulLines(guide.markdown, 3);
    if (lines.length > 0) {
      blocks.push(`- ${guide.title}: ${lines.join(" ; ")}`);
    }
  }

  if (sectionCategory && sectionCategory.trim().length > 0) {
    blocks.push(`Section category focus: ${compact(sectionCategory)}`);
  }

  return blocks.join("\n");
}

export function buildPromptContextFromSearchResults(
  results: readonly SearchHit[],
): string {
  if (results.length === 0) {
    return "No ranked documentary hits available.";
  }

  const lines = ["Top documentary signals:"];
  for (const hit of results.slice(0, 5)) {
    lines.push(
      `- ${hit.title} [${hit.topic}] score=${hit.score}: ${compact(hit.snippet)}`,
    );
  }
  return lines.join("\n");
}

export function buildSectionFactoryPromptContext(
  input: BuildSectionFactoryPromptContextInput = {},
): SectionFactoryPromptContextPayload {
  const guides = input.guides ?? shopifyDocsProvider.listGuideResources();
  const indexDocs = input.documents ?? readLocalDocsIndex().documents;

  const searchResults =
    input.searchResults ??
    (input.query
      ? searchShopifyDocs({
          query: input.query,
          topic: input.topic,
          sectionCategory: input.sectionCategory,
          limit: input.limit,
        }).results
      : []);

  const selectedDocs =
    searchResults.length > 0
      ? indexDocs.filter((doc) =>
          searchResults.some((hit) => hit.docId === doc.id),
        )
      : indexDocs.slice(0, Math.max(1, input.limit ?? 3));

  const parts: string[] = [];
  parts.push(buildPromptContextFromGuides(guides, input.sectionCategory));
  parts.push("\nDocument-derived implementation hints:");
  for (const hint of docsToPromptHints(
    selectedDocs,
    Math.max(1, input.limit ?? 3),
  )) {
    parts.push(`- ${hint}`);
  }
  parts.push("\nSearch-derived snippets:");
  parts.push(buildPromptContextFromSearchResults(searchResults));

  const fallbackUsed = guides.length === 0 || indexDocs.length === 0;

  return {
    promptContext: parts.join("\n"),
    guideCount: guides.length,
    documentCount: selectedDocs.length,
    searchHitCount: searchResults.length,
    fallbackUsed,
  };
}
