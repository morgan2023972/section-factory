import type { NormalizedDocFile } from "../../pipeline/types.js";
import type { AnalysisResult } from "./analysisTypes.js";
import type { DocumentaryHint } from "./guidanceTypes.js";

function topicHint(
  topic: string,
  docs: readonly NormalizedDocFile[],
): DocumentaryHint | null {
  const fromTopic = docs.filter((doc) => doc.topic === topic);
  if (fromTopic.length === 0) {
    return null;
  }

  if (topic === "schema") {
    return {
      id: "schema-hints",
      topic,
      confidence: "medium",
      message:
        "Normalized schema documentation is available as contextual guidance.",
      recommendation:
        "Use schema docs as hints only; do not override business-critical decisions.",
      sourceUrls: fromTopic.map((doc) => doc.sourceUrl),
    };
  }

  if (topic === "liquid-reference") {
    return {
      id: "liquid-reference-hint",
      topic,
      confidence: "medium",
      message:
        "Liquid reference documentation is available as contextual guidance.",
      recommendation:
        "Use liquid reference as hints only; do not treat them as critical validation truth.",
      sourceUrls: fromTopic.map((doc) => doc.sourceUrl),
    };
  }

  return {
    id: `topic-hint-${topic}`,
    topic,
    confidence: "low",
    message: `Documentary hints are available for topic ${topic}.`,
    recommendation:
      "Use documentary hints as additional context and keep core-rule decisions authoritative.",
    sourceUrls: fromTopic.map((doc) => doc.sourceUrl),
  };
}

export function buildDocumentaryHints(input: {
  docs: readonly NormalizedDocFile[];
  analysisResult?: AnalysisResult;
}): DocumentaryHint[] {
  const hints: DocumentaryHint[] = [];

  const schema = topicHint("schema", input.docs);
  if (schema) {
    hints.push(schema);
  }

  const liquid = topicHint("liquid-reference", input.docs);
  if (liquid) {
    hints.push(liquid);
  }

  for (const candidate of input.analysisResult?.documentationHintCandidates ??
    []) {
    hints.push({
      id: `analysis-doc-hint-${candidate.topic}`,
      topic: candidate.topic,
      confidence: candidate.confidence,
      message:
        "Hint candidate extracted during analysis; keep as context only.",
      recommendation:
        "Use this documentary context to assist implementation details, never to override critical rules.",
      sourceUrls: [...candidate.sourceUrls],
    });
  }

  const deduped = new Map<string, DocumentaryHint>();
  for (const hint of hints) {
    if (!deduped.has(hint.id)) {
      deduped.set(hint.id, hint);
    }
  }

  return [...deduped.values()];
}
