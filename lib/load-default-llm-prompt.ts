import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_LLM_PROMPT_TEMPLATE } from "@/lib/llm-prompt-template";

const RELATIVE_PATH = ["prompts", "llm-default-prompt.md"] as const;

/**
 * Đọc prompt mặc định từ `prompts/llm-default-prompt.md` (server).
 * Nếu file thiếu hoặc rỗng → dùng `DEFAULT_LLM_PROMPT_TEMPLATE` trong code.
 */
export async function getDefaultLlmPromptFromMarkdown(): Promise<string> {
  const abs = path.join(process.cwd(), ...RELATIVE_PATH);
  try {
    const raw = (await fs.readFile(abs, "utf8")).trim();
    if (!raw) {
      console.warn("prompts/llm-default-prompt.md is empty; using built-in default prompt.");
      return DEFAULT_LLM_PROMPT_TEMPLATE;
    }
    return raw;
  } catch (error) {
    console.warn("Could not read prompts/llm-default-prompt.md; using built-in default prompt.", error);
    return DEFAULT_LLM_PROMPT_TEMPLATE;
  }
}
