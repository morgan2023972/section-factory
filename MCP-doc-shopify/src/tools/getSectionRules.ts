import { shopifyDocsProvider } from "../catalog/provider.js";
import type { SectionRulesPayload } from "../catalog/types.js";

export function getSectionRules(): SectionRulesPayload {
  return shopifyDocsProvider.getSectionRules();
}
