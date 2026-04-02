import { shopifyDocsProvider } from "../catalog/provider.js";
import type { SchemaGuidePayload } from "../catalog/types.js";

export function getSchemaGuide(): SchemaGuidePayload {
  return shopifyDocsProvider.getSchemaGuide();
}
