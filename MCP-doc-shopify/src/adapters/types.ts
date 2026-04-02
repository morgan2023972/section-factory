import type { GuideResource } from "../catalog/types.js";
import type { NormalizedDocFile } from "../pipeline/types.js";
import type { SearchHit, SearchTopicFilter } from "../search/types.js";

export interface BuildSectionFactoryPromptContextInput {
  sectionCategory?: string;
  query?: string;
  topic?: SearchTopicFilter;
  limit?: number;
  guides?: readonly GuideResource[];
  documents?: readonly NormalizedDocFile[];
  searchResults?: readonly SearchHit[];
}

export interface SectionFactoryPromptContextPayload {
  promptContext: string;
  guideCount: number;
  documentCount: number;
  searchHitCount: number;
  fallbackUsed: boolean;
}

export type SectionFactoryValidationSeverity = "info" | "warning" | "error";

export interface SectionFactoryValidationRule {
  id: string;
  title: string;
  severity: SectionFactoryValidationSeverity;
  rationale: string;
  recommendation: string;
  sourceUrls: string[];
}

export interface BuildSectionFactoryValidationRulesInput {
  guides?: readonly GuideResource[];
  documents?: readonly NormalizedDocFile[];
}

export interface SectionFactoryValidationRulesPayload {
  rules: SectionFactoryValidationRule[];
  fallbackUsed: boolean;
}
