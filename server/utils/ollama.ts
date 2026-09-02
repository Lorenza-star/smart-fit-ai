export class OllamaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
  }
}

/**
 * Call the local Ollama advisor asking for strict JSON. Fails loudly with a
 * machine‑readable code: 'ollama_offline' | 'ollama_timeout' | 'ollama_error'.
 * Callers must never convert these failures into a fake success.
 */
export async function callOllama(prompt: string, timeoutMs = 60000): Promise<{ text: string }> {
  const base = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.7 },
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

  const json = (await res.json().catch(() => null)) as { response?: unknown } | null;
  if (!json || typeof json.response !== "string" || json.response.trim().length === 0) {
    throw new OllamaError("ollama_error", "The advisor returned an unexpected payload.");
  }
  return { text: json.response };
}
