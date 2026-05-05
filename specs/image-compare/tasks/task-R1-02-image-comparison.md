# Task R1-02: Image Comparison Engine (SSIM + LLM Vision)

## Objective
Implement 2-tier image comparison: SSIM structural similarity (client-side) + LLM Vision deep analysis (server-side, user-triggered).

## Implementation Steps

- [ ] 1. Install dependencies
  - `npm install ssim.js`
  - SSIM.js chạy client-side, không cần native bindings

- [ ] 2. SSIM comparison utility
  - Tạo `lib/ssim-compare.ts`
  - Function `compareSSIM(originalUrl, capturedUrl)`:
    - Load 2 ảnh vào Canvas
    - Resize về cùng kích thước (match smaller to larger)
    - Run ssim.js → trả về `{ ssim, diffMap }`
    - ssim score: 0-1 (1 = identical)
    - diffMap: ImageData heatmap (red=diff, green=same)
  <!-- Updated: Red Team Finding 4 — SSIM fallback -->
  - Fallback: wrap ssim.js trong try-catch. Nếu fail → dùng simple pixel-diff (count different pixels), trả về warning "Using basic comparison mode"
  - Classification helper: Excellent (>0.95) / Good (>0.85) / Fair (>0.7) / Poor (<0.7)
  - Return: `{ score, classification, diffMapBlob, dimensions, fallback: boolean }`

- [ ] 3. SSIM result component
  - Tạo `components/ssim-result.tsx`
  - Hiển thị SSIM score lớn (VD: "0.92 — Good")
  - Badge color: Excellent=green, Good=blue, Fair=yellow, Poor=red
  - Hiển thị diff heatmap image (Perano #A7C5EE cho vùng khác)
  - Stats: image dimensions, comparison method

- [ ] 4. LLM Vision analysis utility
  - Tạo `lib/llm-analyze.ts`
  - Function `analyzeWithLLM(originalUrl, capturedUrl)`:
    - POST `/api/analyze` với 2 image URLs
    - Parse response: `LlmFinding[]`
  - Type: `{ area: string, issue: string, severity: "critical"|"warning"|"info", suggestion: string }`

- [ ] 5. LLM analysis API endpoint
  - Tạo `app/api/analyze/route.ts`
  - POST handler:
    - Validate session (require auth)
    - Validate input: 2 image URLs
    <!-- Updated: Red Team Finding 5 — resize before base64 -->
    - Resize ảnh xuống max 1024px (longest edge) trước khi convert base64 để fit LLM context limits
    - Read 2 ảnh từ filesystem → resize → convert base64
    - Gọi LLM API với structured prompt (đọc provider settings từ DB)
    <!-- Updated: Red Team Finding 3 — LLM response fallback parsing -->
    <!-- Updated: Red Team Finding 12 — provider-specific response parsing -->
    - Parse response theo provider:
      - Anthropic/OpenAI: extract `content` từ response
      - Google: extract `candidates[0].content.parts[0].text` (response format khác)
      - Custom: assume OpenAI-compatible format
    - Fallback parsing: (1) Try JSON.parse, (2) If fail, try extract JSON from markdown code block, (3) If still fail, return raw text as single finding
    - Validate schema: mỗi finding phải có area, issue, severity, suggestion
    - Return: `{ findings: LlmFinding[], model: string, tokensUsed: number }`
    <!-- Updated: Red Team Finding 6 — client-side debounce -->
    - Client-side: disable "Deep Analysis" button 30s sau mỗi lần click để tránh spam
  - Error handling: rate limit, invalid images, API failure, timeout (60s)
  - Env vars: từ user's AiSettings (không hardcode)

- [ ] 6. LLM analysis result component
  - Tạo `components/llm-analysis.tsx`
  - Hiển thị danh sách findings dạng checklist
  - Severity badges: critical=red, warning=yellow, info=blue
  - Group theo area (header, hero, footer, etc.)
  - Nút "Copy report" để copy JSON
  - Loading state: skeleton + "Analyzing with AI..." (~5-10s)

- [ ] 7. ImageCompare component (updated)
  - Tạo `components/image-compare.tsx`
  - Toggle: Side-by-Side | Overlay
  - Side-by-side: 2 ảnh + SSIM diff heatmap
  - Overlay: 2 ảnh chồng nhau với opacity slider (0-100%)
  - Nút "Deep Analysis" → trigger LLM Vision
  - Tab switching: SSIM Results | AI Analysis

- [ ] 8. Wire up Compare page
  - Update `app/page.tsx`
  - Nút "Compare" gọi `compareSSIM()` (client-side, ~1-2s)
  - Hiển thị SSIM result + ImageCompare
  - Nút "Deep Analysis" xuất hiện sau SSIM result
  - Click → gọi `analyzeWithLLM()`, hiển thị LlmAnalysis
  - Auto-save kết quả qua POST /api/compare (bao gồm ssimScore + llmReport)

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `lib/ssim-compare.ts` | Create | SSIM.js wrapper |
| `lib/llm-analyze.ts` | Create | LLM Vision API client |
| `app/api/analyze/route.ts` | Create | LLM analysis endpoint |
| `components/ssim-result.tsx` | Create | SSIM score + heatmap display |
| `components/llm-analysis.tsx` | Create | LLM findings checklist |
| `components/image-compare.tsx` | Create | Side-by-side + overlay + tabs |
| `app/page.tsx` | Modify | Wire up comparison flow |

## Completion Criteria
- [ ] Upload 2 ảnh → click Compare → thấy SSIM score + heatmap trong ~2s
- [ ] SSIM classification đúng (Excellent/Good/Fair/Poor)
- [ ] Diff heatmap hiển thị vùng khác biệt (red=diff, green=same)
- [ ] Toggle side-by-side / overlay hoạt động
- [ ] Overlay opacity slider điều khiển được
- [ ] Nút "Deep Analysis" → gọi LLM → hiển thị findings checklist
- [ ] LLM findings hiển thị đúng severity badges
- [ ] Kết quả lưu vào DB (ssimScore + llmReport)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| SSIM.js không chạy được trên browser | High | Fallback: dùng Canvas pixel comparison thủ công |
| Claude Vision API rate limit | Medium | Queue request, hiển thị retry button |
| LLM trả về JSON không đúng schema | Medium | Validate + retry 1 lần, fallback hiển thị raw text |
| Ảnh quá lớn → base64 quá dài | Medium | Resize ảnh xuống max 1920px trước khi gửi LLM |
