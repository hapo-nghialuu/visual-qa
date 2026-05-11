# Task R1-03: Compare DOM (Figma layout + DOM + pixel + AI context)

## Objective
Luồng so sánh **tách biệt** trang Compare SSIM: lấy layout từ Figma (REST), chụp web bằng Playwright, trích metadata DOM (JSON), mapping heuristic Figma↔DOM, so màu TEXT, pixel diff viewport đầu trang (`pixelmatch`), ảnh debug 3 cột, và tùy chọn gọi LLM vision kèm `extraContext`.

## Phụ thuộc nhiệm vụ khác
- **R1-02**: Figma PNG export, capture URL, policy SSRF, `POST /api/analyze`.
- **R2-01**: Session cho các API protected.
- **R6-01** (khuyến nghị): Cấu hình LLM cho bước “AI summarize”.

## Implementation Steps

- [ ] 1. **Figma layout (internal format)**
  - `GET /v1/files/{file_key}/nodes?ids={node_id}` → flatten cây node (bbox, TEXT `characters`, fill SOLID → rgba).
  - Module: `lib/compare-dom/figma-layout-fetch.ts`, types `lib/compare-dom/types.ts`.
  - Lưu snapshot JSON artifact (`figma-layout.json`) cùng thư mục uploads.

- [ ] 2. **PNG Figma dùng chung**
  - `lib/figma-node-png.ts` — `fetchFigmaRenderedPngBuffer`.
  - `app/api/figma-image/route.ts` gọi helper trên (tránh trùng logic).

- [ ] 3. **Capture web + trích DOM (một phiên Playwright)**
  - Viewport 1280×800; pipeline scroll/lazy/fonts/ảnh giống `url-page-screenshot` (không `networkidle`).
  - `page.evaluate`: thu thập tag, id/class, text rút gọn, rect tài liệu (`getBoundingClientRect` + scroll), computed color / backgroundColor / fontSize, path hierarchy ngắn.
  - Giới hạn số node (VD 500) để tránh JSON quá lớn.
  - Module: `lib/compare-dom/capture-web-dom.ts`; lưu `dom.json`.

- [ ] 4. **API orchestration**
  - `POST /api/compare-dom`: auth, `FIGMA_ACCESS_TOKEN`, body `{ figmaUrl?, fileKey?, nodeId?, webUrl, basicAuth*? }`, parse URL qua `parseScreenshotTargetUrl`.
  - `lib/compare-dom/run-compare-dom.ts`: gọi tuần tự các bước, `maxDuration` đủ dài (VD 120s).

- [ ] 5. **Mapping Figma ↔ DOM (heuristic)**
  - Level 1 text → 2 vị trí (normalized) → 3 size → 4 hierarchy (token path).
  - Greedy match có ngưỡng tối thiểu; output `matches[]`, `unmatchedFigmaIds[]`.
  - Module: `lib/compare-dom/map-figma-dom.ts`.
  - Test: `lib/compare-dom/map-figma-dom.test.ts` (Vitest).

- [ ] 6. **So style (màu)**
  - TEXT: so fill Figma vs `computedStyle.color` (khoảng cách RGB, ngưỡng).
  - Module: `lib/compare-dom/style-diff.ts`.

- [ ] 7. **Pixel diff viewport**
  - Crop/resize ảnh web full-page về 1280×800; Figma resize fill cùng kích thước.
  - `pixelmatch` + `sharp` raw RGBA; lưu `diff.png`.
  - Module: `lib/compare-dom/pixel-diff.ts`.

- [ ] 8. **Layout flags + debug image**
  - Heuristic: TEXT không match, tỷ lệ pixel lệch, tỷ lệ unmatched.
  - `lib/compare-dom/layout-bugs.ts`.
  - Composite ngang: Figma | Web crop | Diff — `lib/compare-dom/debug-composite.ts`.

- [ ] 9. **UI + điều hướng**
  - Trang `app/compare-dom/page.tsx`: form, steps, metrics, bảng match, preview debug, link JSON/PNG.
  - `components/header.tsx`: link “Compare DOM”.

- [ ] 10. **AI summarize (bước 9 pipeline)**
  - `POST /api/analyze` nhận thêm `extraContext` (cắt max ~12k chars); `lib/llm-analyze.ts` nối context sau prompt template.
  - Nút trên UI gọi analyze với `originalImage` = Figma PNG artifact, `capturedImage` = web PNG artifact, `extraContext` = `summaryForAi`.

- [ ] 11. **Mở rộng tùy chọn (ngoài MVP)**
  - Tích hợp **resemblejs** (perceptual / ignore anti-aliasing) nếu cần — đánh giá phụ thuộc `canvas` trên Node.
  - **OpenCV** (alignment template, contour) — chỉ khi có yêu cầu rõ và pipeline build (native addon / subprocess).

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `lib/figma-node-png.ts` | Create | Tải buffer PNG từ Figma Images API |
| `lib/compare-dom/types.ts` | Create | Figma/DOM/match/result types |
| `lib/compare-dom/figma-layout-fetch.ts` | Create | Nodes API → flatten layout |
| `lib/compare-dom/capture-web-dom.ts` | Create | Playwright + DOM JSON + full-page PNG |
| `lib/compare-dom/map-figma-dom.ts` | Create | Heuristic mapping + scoring |
| `lib/compare-dom/style-diff.ts` | Create | So màu TEXT |
| `lib/compare-dom/pixel-diff.ts` | Create | pixelmatch viewport |
| `lib/compare-dom/debug-composite.ts` | Create | Ảnh debug 3 cột |
| `lib/compare-dom/layout-bugs.ts` | Create | Cờ layout heuristic |
| `lib/compare-dom/run-compare-dom.ts` | Create | Orchestrator server |
| `app/api/compare-dom/route.ts` | Create | POST Compare DOM |
| `app/compare-dom/page.tsx` | Create | UI luồng Compare DOM |
| `app/api/figma-image/route.ts` | Modify | Dùng `fetchFigmaRenderedPngBuffer` |
| `app/api/analyze/route.ts` | Modify | `extraContext` |
| `lib/llm-analyze.ts` | Modify | `buildPrompt` + `extraContext` |
| `components/header.tsx` | Modify | Nav Compare DOM |
| `package.json` | Modify | `pixelmatch`, `@types/pixelmatch` |
| `README.md` | Modify | Mô tả Compare DOM (ngắn) |

## Completion Criteria
- [ ] Đăng nhập → `/compare-dom` → nhập Figma URL (có `node-id`) + URL public → Run → nhận JSON response có `steps`, `artifacts`, `pixelDiff`, `matches`, `layoutFlags`.
- [ ] File `dom.json` và `figma-layout.json` mở được từ `/uploads/...`.
- [ ] Ảnh debug 3 cột hiển thị đúng (Figma | Web crop | Diff).
- [ ] Mapping trả về ít nhất một cặp hợp lý trên trang có TEXT trùng (smoke).
- [ ] Nút AI summarize: nếu đã cấu hình LLM trong Settings → có findings; nếu chưa → thông báo lỗi rõ (501/400 từ analyze).

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| DOM JSON quá lớn / chậm | Medium | Giới hạn node, không serialize toàn bộ attributes |
| Mapping sai (false positive) | Medium | Document heuristic; cho phép tinh chỉnh trọng số sau |
| Full-page vs viewport — pixel chỉ so vùng đầu | Low | Ghi rõ trong UI/README; sau có thể crop theo frame Figma |
| resemblejs / OpenCV phức tạp build | Low | Giữ ngoài MVP; bổ sung khi có spec riêng |
