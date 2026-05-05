# Visual QA

So sánh thiết kế Figma với screenshot implementation sử dụng SSIM + LLM Vision analysis.

## Features

- Upload 2 ảnh (design reference + implementation screenshot)
- SSIM structural similarity comparison (client-side, ~1-2s)
- LLM Vision deep analysis (user-triggered, server-side, ~5-10s)
- Visual diff heatmap (side-by-side + overlay)
- Google OAuth login
- Project-based comparison logs
- AI model settings (Claude, OpenAI, Google AI Studio, Custom)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Auth | NextAuth.js (Google Provider) |
| DB | SQLite + Prisma ORM |
| Image Comparison | SSIM.js (client-side) |
| LLM Analysis | Claude / GPT-4V / Google Gemini (server-side) |

## Getting Started

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

## Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
ENCRYPTION_KEY=  # 32 bytes hex: openssl rand -hex 32
```

## Project Structure

```
app/
├── page.tsx              # Compare page
├── settings/page.tsx     # AI model settings
├── projects/             # Project management
└── api/                  # API routes
components/               # UI components
lib/                      # Utilities (ssim, llm, encryption)
prisma/                   # Database schema
```
