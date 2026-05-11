import { describe, expect, it } from "vitest";
import { getDefaultLlmPromptFromMarkdown } from "@/lib/load-default-llm-prompt";

describe("getDefaultLlmPromptFromMarkdown", () => {
  it("returns non-empty prompt from file or fallback", async () => {
    const p = await getDefaultLlmPromptFromMarkdown();
    expect(p.trim().length).toBeGreaterThan(50);
  });
});
