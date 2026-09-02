import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1",
  },
});