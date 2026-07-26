/**
 * Provider-agnostic AI layer.
 * Supports Anthropic (Claude) and OpenAI (GPT). The active provider is chosen
 * from env: AI_PROVIDER, else whichever API key is present. No SDK required —
 * we call the HTTP APIs directly so no extra packages are needed.
 */

export type AIProvider = "anthropic" | "openai" | "gemini" | "local";

function keyFor(p: AIProvider): boolean {
  if (p === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  if (p === "gemini") return !!process.env.GEMINI_API_KEY;
  if (p === "local") return !!process.env.LOCAL_AI_URL;
  return false;
}

export function getProvider(): AIProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AIProvider | undefined;
  if (explicit && keyFor(explicit)) return explicit;
  // Auto-detect by whichever credential is present.
  for (const p of ["anthropic", "openai", "gemini", "local"] as AIProvider[]) {
    if (keyFor(p)) return p;
  }
  return null;
}

export function isAIConfigured(): boolean {
  return getProvider() !== null;
}

export function providerLabel(): string {
  const p = getProvider();
  if (p === "anthropic") return "Anthropic (Claude)";
  if (p === "openai") return "OpenAI (GPT)";
  if (p === "gemini") return "Google Gemini";
  if (p === "local") return "Local model";
  return "Not configured";
}

function defaultModel(provider: AIProvider): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  switch (provider) {
    case "anthropic":
      return "claude-3-5-sonnet-latest";
    case "openai":
      return "gpt-4o-mini";
    case "gemini":
      return "gemini-2.0-flash";
    case "local":
      return "llama3";
  }
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
    throw new Error(
      "AI is not configured. Set a provider key in your environment — the free option is GEMINI_API_KEY (see .env.example).",
    );
  }
  const model = defaultModel(provider);

  // Lightweight structured logging so provider/model/status show up in server logs.
  const log = (msg: string) =>
    console.error(`[ai] provider=${provider} model=${model} ${msg}`);

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
      log(`request failed status=${res.status}`);
      throw new Error(`Anthropic API error (${res.status}): ${detail.slice(0, 300)}`);
    }
    const data = await res.json();
    return (
      data?.content?.map((b: { text?: string }) => b.text ?? "").join("").trim() ??
      ""
    );
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const init = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    };
    // Retry once on transient rate-limit / overload (429/503).
    let res = await fetch(url, init);
    if (res.status === 429 || res.status === 503) {
      log(`transient status=${res.status}; retrying once`);
      await new Promise((r) => setTimeout(r, 1800));
      res = await fetch(url, init);
    }
    if (!res.ok) {
      const detail = await res.text();
      log(`request failed status=${res.status}`);
      if (res.status === 429) {
        throw new Error(
          "AI is temporarily rate-limited on Google Gemini's free tier (about 15 requests/minute and ~1,500/day). Please wait a minute and try again.",
        );
      }
      const hint =
        res.status === 400 || res.status === 403
          ? " — check that GEMINI_API_KEY is valid and the Generative Language API is enabled."
          : "";
      throw new Error(
        `Gemini API error (${res.status}): ${detail.slice(0, 300)}${hint}`,
      );
    }
    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim() ?? ""
    );
  }

  // OpenAI, or a local OpenAI-compatible endpoint (Ollama, LM Studio, etc.).
  const base =
    provider === "local"
      ? (process.env.LOCAL_AI_URL as string).replace(/\/$/, "")
      : "https://api.openai.com/v1";
  const authHeader: Record<string, string> =
    provider === "local"
      ? process.env.LOCAL_AI_KEY
        ? { authorization: `Bearer ${process.env.LOCAL_AI_KEY}` }
        : {}
      : { authorization: `Bearer ${process.env.OPENAI_API_KEY as string}` };

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader },
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
    log(`request failed status=${res.status}`);
    throw new Error(`AI API error (${res.status}): ${detail.slice(0, 300)}`);
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
