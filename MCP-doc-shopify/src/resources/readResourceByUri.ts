import { shopifyDocsProvider } from "../catalog/provider.js";
import type { GuideResource } from "../catalog/types.js";

export function getGuideResourceOrThrow(uri: string): GuideResource {
  return shopifyDocsProvider.getGuideResourceByUri(uri);
}

export function listGuideResources(): readonly GuideResource[] {
  return shopifyDocsProvider.listGuideResources();
}
