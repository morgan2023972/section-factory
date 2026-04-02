import { z } from "zod";

import { searchShopifyDocs } from "../search/searchEngine.js";
import type { SearchResultPayload } from "../search/types.js";

export const searchShopifyDocsInputSchema = z.object({
  query: z.string(),
  topic: z
    .enum(["sections", "blocks", "presets", "schema", "liquid", "os2"])
    .optional(),
  sectionCategory: z.string().optional(),
  limit: z.number().int().positive().max(20).optional(),
});

function formatTextResult(payload: SearchResultPayload): string {
  const lines: string[] = [];
  lines.push(`Search query: ${payload.query}`);
  if (payload.topic) {
    lines.push(`Topic filter: ${payload.topic}`);
  }
  if (payload.sectionCategory) {
    lines.push(`Section category hint: ${payload.sectionCategory}`);
  }
  lines.push(`Hits: ${payload.returnedHits}/${payload.totalHits}`);

  if (payload.note) {
    lines.push(`Note: ${payload.note}`);
  }

  for (const [index, hit] of payload.results.entries()) {
    lines.push("");
    lines.push(`${index + 1}. ${hit.title}`);
    lines.push(`   docId: ${hit.docId}`);
    lines.push(`   topic: ${hit.topic}`);
    lines.push(`   uri: ${hit.uri}`);
    lines.push(`   sourceUrl: ${hit.sourceUrl}`);
    lines.push(`   score: ${hit.score}`);
    lines.push(`   lastIndexedAt: ${hit.lastIndexedAt}`);
    lines.push(`   snippet: ${hit.snippet}`);
  }

  if (payload.results.length === 0) {
    lines.push("\nNo matching documents found.");
  }

  return lines.join("\n");
}

export function runSearchShopifyDocs(input: {
  query: string;
  topic?: "sections" | "blocks" | "presets" | "schema" | "liquid" | "os2";
  sectionCategory?: string;
  limit?: number;
}) {
  const result = searchShopifyDocs(input);

  return {
    content: [
      {
        type: "text" as const,
        text: formatTextResult(result),
      },
    ],
    structuredContent: result,
  };
}
