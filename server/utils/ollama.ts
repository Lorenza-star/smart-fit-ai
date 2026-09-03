export class OllamaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
  }
}

/**
 * Call the Ollama Cloud advisor (OpenAI-compatible /v1/chat/completions API)
 * asking for strict JSON. Fails loudly with a machine-readable code:
 * 'ollama_offline' | 'ollama_timeout' | 'ollama_error'.
 * Callers must never convert these failures into a fake success.
 */
export async function callOllama(prompt: string, timeoutMs = 60000): Promise<{ text: string }> {
  const base = (process.env.OLLAMA_BASE_URL ?? "https://ollama.com/v1").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL ?? "gpt-oss:120b-cloud";
  const apiKey = process.env.OLLAMA_API_KEY ?? "";

  if (!apiKey) {
    throw new OllamaError("ollama_offline", "OLLAMA_API_KEY is not configured on the server.");
  }

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new OllamaError("ollama_timeout", "The advisor took too long to respond.");
    }
    throw new OllamaError("ollama_offline", "The advisor is offline or unreachable.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OllamaError("ollama_error", `The advisor responded with HTTP ${res.status}. ${detail.slice(0, 200)}`);
  }

  const json = (await res.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: unknown } }> }
    | null;
  const content = json?.choices?.[0]?.message?.content;
  if (!json || typeof content !== "string" || content.trim().length === 0) {
    throw new OllamaError("ollama_error", "The advisor returned an unexpected payload.");
  }
  return { text: content };
}