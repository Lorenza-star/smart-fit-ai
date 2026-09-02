import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { getAdminClient } from "../../utils/supabase-admin";

/**
 * GET /api/advisor-status – lightweight health check for the local Ollama
 * instance. Returns { online: boolean, model: string | null }.
 * Used by the UI to show a friendly "advisor offline" banner before a
 * generation attempt.
 */
export default defineHandler(async (event) => {
  const admin = getAdminClient();
  const config = event.context.runtimeConfig;
  const base = (config.ollamaBaseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const model = config.ollamaModel || "llama3.1";

  try {
    // Ping Ollama's tags endpoint – fast, no body needed.
    const res = await fetch(`${base}/api/tags`, { method: "GET", signal: AbortSignal.timeout(3_000) });
    if (!res.ok) throw new Error("non‑200");
    return { online: true, model };
  } catch {
    return { online: false, model: null };
  }
});