import { z } from "zod";
import { shopifyDocsProvider } from "../catalog/provider.js";
import type { SuggestSettingsPayload } from "../catalog/types.js";

export const suggestSettingsInputSchema = z.object({
  category: z.string().min(1),
});

export function suggestSettings(input: {
  category: string;
}): SuggestSettingsPayload {
  return shopifyDocsProvider.suggestSettings(input.category);
}
