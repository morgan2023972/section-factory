import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function generateSection(prompt: string): Promise<string> {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required to generate a section.");
  }

  if (!client) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    const generatedCode = (response.output_text || "").trim();

    if (!generatedCode) {
      throw new Error("OpenAI returned an empty response.");
    }

    return generatedCode;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown OpenAI error";
    throw new Error(`Failed to generate section: ${message}`);
  }
}
