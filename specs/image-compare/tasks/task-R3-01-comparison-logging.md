# Task R3-01: Comparison Logging

## Objective
Lưu kết quả so sánh vào DB, hiển thị danh sách logs với pagination.

## Implementation Steps

- [ ] 1. Compare API endpoint
  - Tạo `app/api/compare/route.ts`
  - POST: nhận `{ originalImage, capturedImage, diffImage, ssimScore, analysisMode, llmReport, projectId }`
  - Validate user session
  - Lưu vào DB (Comparison table)
  - Return created record

- [ ] 2. Logs API endpoint
  - Tạo `app/api/logs/route.ts`
  - GET: query params `?projectId=xxx&page=1&limit=20`
  - Return: `{ logs: [...], total, page, totalPages }`
  - Include: user info, project name, thumbnails

- [ ] 3. LogList component
  - Tạo `components/log-list.tsx`
  - Table hoặc card list hiển thị logs
  - Mỗi row: thumbnail original, thumbnail captured, SSIM score + badge, analysis mode icon (SSIM/LLM/Both), timestamp
  - Pagination controls (prev/next, page numbers)
  - Empty state nếu không có logs

- [ ] 4. Log detail modal/page
  - Tạo `components/log-detail.tsx`
  - Click vào log → mở dialog/page detail
  - Hiển thị lại kết quả so sánh (dùng ImageCompare component)
  - Nút "Compare Again" → load lại ảnh lên compare page

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `app/api/compare/route.ts` | Create | Save comparison |
| `app/api/logs/route.ts` | Create | List logs |
| `components/log-list.tsx` | Create | Log list UI |
| `components/log-detail.tsx` | Create | Log detail UI |

## Completion Criteria
- [ ] So sánh ảnh → log được lưu vào DB
- [ ] Trang logs hiển thị danh sách với pagination
- [ ] Click log → xem lại kết quả so sánh
- [ ] Filter theo project hoạt động
