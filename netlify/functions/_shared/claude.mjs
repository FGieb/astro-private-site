// Small wrapper around the Anthropic SDK for one-shot requests.
// Reads ANTHROPIC_API_KEY from the environment.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

let client;
const getClient = () => (client ??= new Anthropic());

/**
 * Ask Claude once. With `schema`, the answer is constrained to that JSON
 * schema and returned parsed; otherwise the text is returned.
 */
export async function askClaude({
  prompt,
  system,
  schema,
  effort = "medium",
  maxTokens = 16000,
  timeoutMs,
}) {
  const response = await getClient().beta.messages.create(
    {
      model: MODEL,
      max_tokens: maxTokens,
      // If a safety classifier declines, let the API retry on its recommended model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort,
        ...(schema ? { format: { type: "json_schema", schema } } : {}),
      },
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    },
    timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : undefined
  );

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined: ${response.stop_details?.explanation || "no details"}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's answer was cut off (max_tokens)");
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return schema ? JSON.parse(text) : text;
}
