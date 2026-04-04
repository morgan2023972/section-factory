export type TechnicalGuidanceCategory =
  | "compatibility"
  | "portability"
  | "liquid-pattern"
  | "structure";

// By design, technical guidance carries no severity and no blocking flag.
export interface TechnicalGuidanceItem {
  readonly id: string;
  readonly title: string;
  readonly category: TechnicalGuidanceCategory;
  readonly message: string;
  readonly recommendation: string;
  readonly sourceUrls: readonly string[];
}

export interface DocumentaryHint {
  readonly id: string;
  readonly topic: string;
  readonly confidence: "low" | "medium" | "high";
  readonly message: string;
  readonly recommendation: string;
  readonly sourceUrls: readonly string[];
}
