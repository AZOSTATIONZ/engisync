/**
 * Provider-agnostic AI layer.
 * Supports Anthropic (Claude) and OpenAI (GPT). The active provider is chosen
 * from env: AI_PROVIDER, else whichever API key is present. No SDK required —
 * we call the HTTP APIs directly so no extra packages are needed.
 */

export type AIProvider = "anthropic" | "openai";

export function getProvider(): AIProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isAIConfigured(): boolean {
  return getProvider() !== null;
}

export function providerLabel(): string {
  const p = getProvider();
  if (p === "anthropic") return "Anthropic (Claude)";
  if (p === "openai") return "OpenAI (GPT)";
  return "Not configured";
}

function defaultModel(provider: AIProvider): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  return provider === "anthropic"
    ? "claude-3-5-sonnet-latest"
    : "gpt-4o-mini";
}

type ChatArgs = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

/** Send a single-turn completion to the active provider and return the text. */
export async function chatComplete({
  system,
  prompt,
  maxTokens = 1024,
}: ChatArgs): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("AI is not configured. Add an API key to your environment.");
  }
  const model = defaultModel(provider);

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${detail.slice(0, 300)}`);
    }
    const data = await res.json();
    return (
      data?.content?.map((b: { text?: string }) => b.text ?? "").join("").trim() ??
      ""
    );
  }

  // OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY as string}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Extract the first JSON array/object from a model response. */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  for (let end = candidate.length; end > start; end--) {
    try {
      return JSON.parse(candidate.slice(start, end)) as T;
    } catch {
      // keep shrinking
    }
  }
  return null;
}
