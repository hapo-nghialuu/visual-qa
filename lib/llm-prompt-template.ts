/**
 * Fallback khi không đọc được `prompts/llm-default-prompt.md`.
 * Giữ nội dung khớp file MD để UI / API vẫn hoạt động khi thiếu file.
 */
export const DEFAULT_LLM_PROMPT_TEMPLATE = `You are a UI/UX comparison expert. Compare these 2 images:
- Image 1: {IMAGE_1}
- Image 2: {IMAGE_2}

Return a JSON array where **each object is one separate checklist item** (one task / one issue). Do not merge multiple problems into one object.
Each item may include:
- "task": optional short title (e.g. "Misaligned hero CTA")
- "area": UI region (e.g. header, hero, footer)
- "issue": clear description of the mismatch
- "severity": "critical" | "warning" | "info"
- "suggestion": concrete fix

Example:
[{"task":"Hero spacing","area":"hero","issue":"...","severity":"warning","suggestion":"..."}]

Focus on layout, spacing, colors, typography, missing elements, extra elements.`;
