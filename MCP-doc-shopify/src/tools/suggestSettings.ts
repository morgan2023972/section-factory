import { z } from "zod";
import { CATEGORY_SETTINGS_MAP } from "../shopifyDocs.js";

export const suggestSettingsInputSchema = z.object({
  category: z.string().min(1),
});

export function suggestSettings(input: { category: string }) {
  const key = input.category.toLowerCase();
  const suggestions = CATEGORY_SETTINGS_MAP[key] ?? [
    "title",
    "text",
    "color_scheme",
  ];

  return {
    category: key,
    suggestedSettings: suggestions,
  };
}
