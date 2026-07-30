/**
 * Provider-agnostic AI layer.
 * Supports Anthropic (Claude) and OpenAI (GPT). The active provider is chosen
 * from env: AI_PROVIDER, else whichever API key is present. No SDK required —
 * we call the HTTP APIs directly so no extra packages are needed.
 */

export type AIProvider = "anthropic" | "openai" | "gemini" | "local";

/**
 * Master kill switch. When true, every AI feature reports "out of service"
 * regardless of any provider key that happens to be present in the
 * environment. Set AI_DISABLED="false" to re-enable later — no code changes.
 */
export const AI_DISABLED = process.env.AI_DISABLED !== "false";

/** User-facing message shown wherever an AI feature is invoked while disabled. */
export const AI_OUT_OF_SERVICE =
  "AI features are currently out of service. Everything else in EngiSync works as normal.";

function keyFor(p: AIProvider): boolean {
  if (p === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  if (p === "gemini") return !!process.env.GEMINI_API_KEY;
  if (p === "local") return !!process.env.LOCAL_AI_URL;
  return false;
}

export function getProvider(): AIProvider | null {
  if (AI_DISABLED) return null;
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
  if (AI_DISABLED) return "Out of service";
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
      // Floating "latest" alias rather than a pinned version. Google retires
      // specific versions for new API keys (gemini-1.5-flash, then
      // gemini-2.5-flash), which breaks the app for anyone who signs up after
      // the retirement date while continuing to work for existing keys. The
      // alias cannot rot that way. Pin via AI_MODEL for reproducible output.
      //
      // LITE, and that is a measured choice, not a downgrade.
      // `gemini-flash-latest` is a THINKING model, and on this workload the
      // thinking is nearly all of the cost. Measured on the same prompt:
      //
      //   gemini-flash-latest       374 thinking tokens → 353 chars of answer
      //   gemini-flash-lite-latest    0 thinking tokens → 397 chars of answer
      //
      // Lite produced a longer answer using half the budget. Worse, thinking
      // tokens are spent BEFORE any answer is emitted, so a modest
      // `maxTokens` gets consumed entirely by reasoning and the caller
      // receives an empty string or a sentence cut in half — with a 256-token
      // budget the thinking model returned "Protracted cloudy or rainy" and
      // stopped.
      //
      // On the free tier those invisible tokens also count against the daily
      // quota, so this is roughly 4-5x more usable requests per day for
      // output that is, on this kind of task, no worse.
      //
      // (`thinkingConfig: { thinkingBudget: 0 }` would be the surgical fix,
      // but the v1beta endpoint rejects it for these aliases with a 400.)
      return "gemini-flash-lite-latest";
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
  if (AI_DISABLED) {
    throw new Error(AI_OUT_OF_SERVICE);
  }
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
    const candidate = data?.candidates?.[0];
    const text: string =
      candidate?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim() ?? "";

    // AN EMPTY 200 IS A FAILURE, and it used to be returned as success.
    //
    // Gemini answers HTTP 200 with no text in two situations that look
    // identical to the caller: the token budget ran out before any answer was
    // produced (`MAX_TOKENS`), or a safety filter blocked it. Returning "" let
    // both render as a blank panel with no explanation — the user sees a
    // feature that silently does nothing, which is the worst possible failure
    // for something they are meant to trust.
    if (!text) {
      const reason = candidate?.finishReason ?? "unknown";
      log(`empty response finishReason=${reason}`);
      if (reason === "MAX_TOKENS") {
        throw new Error(
          "The AI ran out of room before it finished answering. Try a shorter request.",
        );
      }
      if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
        throw new Error("The AI declined to answer that request.");
      }
      throw new Error(`The AI returned an empty response (${reason}).`);
    }
    return text;
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
