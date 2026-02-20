import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

export function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]) as T;
}
