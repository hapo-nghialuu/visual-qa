# Visual QA

Ứng dụng Next.js để **đối chiếu thiết kế Figma với bản implement trên web**: hai luồng — **Compare** (SSIM + ảnh + AI) và **Compare DOM** (layout Figma + DOM + pixel + AI có ngữ cảnh). Đăng nhập Google, lưu log theo project, cài đặt LLM/Redmine từng user.

## Hai luồng chính

| | **Compare** (`/`) | **Compare DOM** (`/compare-dom`) |
|--|-------------------|----------------------------------|
| **Đầu vào** | Original: PNG Figma (node). Captured: chụp full-page từ URL (Playwright). Cần chọn **project** trước khi so sánh. | Figma URL (có `node-id`) + URL web (+ HTTP Basic tùy chọn). |
| **So sánh** | SSIM (client, `ssim.js`), heatmap, side-by-side / overlay. | Nodes API + DOM JSON + mapping heuristic + **pixelmatch** (crop viewport đầu trang 1280×800) + ảnh debug 3 cột. |
| **AI** | `POST /api/analyze` (hai ảnh). | Cùng API + `extraContext` (tóm tắt pipeline DOM). |
| **Bảng review** | Mỗi dòng một hạng mục: 1 dòng **SSIM** sau khi so + các dòng từ AI; tick Review, tạo issue Redmine theo dòng. | Dòng từ heuristic (layout, màu TEXT, pixel) + dòng từ AI sau khi chạy. |

**Lưu ý:** `resemblejs` và **OpenCV** chưa tích hợp; pixel viewport dùng `pixelmatch` + `sharp`.

## Tính năng (tóm tắt)

- **Figma:** parse link / file key + node id (`lib/figma-node-parse.ts`); export PNG (`POST /api/figma-image`, `lib/figma-node-png.ts`).
- **Chụp URL:** policy chống SSRF (`lib/screenshot-url-policy.ts`); production chặn host private trừ khi `ALLOW_SCREENSHOT_INTERNAL=true` (xem `.env.example`).
- **Redmine (tuỳ chọn):** `REDMINE_URL` + `REDMINE_API_KEY` chỉ trong `.env`; mặc định project/tracker/priority: `.env` hoặc **Cài đặt → Redmine** (lưu DB).
- **Cài đặt AI:** provider (Claude / OpenAI / Google / Custom), model, prompt; key mã hoá với `ENCRYPTION_KEY`.
- **Projects & log:** CRUD project, xem log so sánh (`/projects`, `/projects/[id]`).
- **Prompt mặc định:** `prompts/llm-default-prompt.md` (không đọc từ env).

## Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| Framework | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | NextAuth.js (Google) + middleware bảo vệ app (trừ `/login`, `api/auth`) |
| DB | SQLite + Prisma (`DATABASE_URL`, mặc định `file:./dev.db`) |
| So ảnh (Compare) | SSIM.js (client), heatmap Canvas |
| So pixel (Compare DOM) | Playwright + sharp + pixelmatch |
| LLM | Claude / OpenAI-compatible / Google Gemini (server) |

## Cài đặt & chạy

```bash
npm install
cp .env.example .env
npx prisma db push
npx playwright install chromium   # bắt buộc cho capture từ URL / Compare DOM
npm run dev
```

Lệnh khác: `npm run build`, `npm run lint`, `npm run test` (Vitest).

## Biến môi trường

Chỉnh đầy đủ trong **`.env.example`**. Tối thiểu cho local:

- **`DATABASE_URL`**: ví dụ `file:./dev.db` (SQLite).
- **`NEXTAUTH_URL`**, **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`**, **`NEXTAUTH_SECRET`**.
- **`ENCRYPTION_KEY`**: hex 32 byte (`openssl rand -hex 32`) — đổi key là mất giải mã API key đã lưu trong DB.

Tuỳ chọn / theo tính năng:

- **`FIGMA_ACCESS_TOKEN`**: bắt buộc cho Figma PNG + Compare DOM + Nodes API.
- **`LLM_DEFAULT_*`**: cho phép Deep Analysis trước khi user lưu Cài đặt AI; DB vẫn ưu tiên nếu đã có.
- **`ALLOW_SCREENSHOT_INTERNAL`**: cho phép URL nội bộ khi capture (production).
- **Redmine:** `REDMINE_URL`, `REDMINE_API_KEY`, và các `REDMINE_DEFAULT_*` nếu cần.

Google Cloud → OAuth client → **Authorized redirect URIs** phải khớp `{NEXTAUTH_URL}/api/auth/callback/google` (host, cổng, path, không `/` thừa cuối).

## Cấu trúc thư mục (rút gọn)

```
app/
├── page.tsx                 # Compare: Figma + URL capture, SSIM, review, AI
├── compare-dom/page.tsx     # Compare DOM pipeline + review + AI
├── login/page.tsx
├── settings/page.tsx        # AI + Redmine
├── projects/                # Danh sách project
├── projects/[id]/page.tsx   # Chi tiết / log
└── api/                     # upload, figma-image, screenshot, analyze, compare, compare-dom, …
components/                  # UI (image-upload, llm-analysis, redmine, …)
lib/
├── compare-dom/             # Figma layout, DOM extract, map, pixel, review rows → findings
├── ssim-compare.ts
├── ssim-review-findings.ts
├── llm-analyze.ts
├── figma-node-parse.ts
├── figma-node-png.ts
├── url-page-screenshot.ts
└── screenshot-url-policy.ts
prompts/llm-default-prompt.md
prisma/schema.prisma
specs/image-compare/         # spec + tasks (vd. task-R1-03-compare-dom.md)
```

## Tài liệu spec

Kế hoạch chi tiết nằm trong `specs/image-compare/` (`requirements.md`, `design.md`, `tasks/*.md`).
