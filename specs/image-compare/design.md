# Design — Image Compare

## Architecture Overview

Next.js 14 App Router application với shadcn/ui, NextAuth.js, và client-side image processing.

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Upload   │  │  Compare  │  │   Projects   │  │
│  │  Module   │  │  Engine   │  │   & Logs     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│  ┌────┴──────────────┴───────────────┴───────┐  │
│  │           Next.js API Routes              │  │
│  │  /api/auth/*  /api/projects  /api/logs    │  │
│  └────────────────┬──────────────────────────┘  │
│                   │                              │
│  ┌────────────────┴──────────────────────────┐  │
│  │           SQLite (Prisma ORM)             │  │
│  │  users | projects | comparisons | images  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Auth | NextAuth.js (Google Provider) |
| DB | SQLite + Prisma ORM |
| Image Comparison | SSIM.js (client-side structural similarity) |
| LLM Analysis | Claude Vision / GPT-4V / Google Gemini (server-side) |
| Image Storage | Local filesystem (`/public/uploads/`) |

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  projects  Project[]
  comparisons Comparison[]
  createdAt DateTime @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  comparisons Comparison[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AiSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  provider        String   // "anthropic" | "openai" | "custom"
  apiKeyEncrypted String   // AES-256 encrypted
  model           String   // e.g. "claude-sonnet-4-20250514", "gpt-4o"
  endpoint        String?  // custom API endpoint (HTTPS only, no private IPs)
  promptTemplate  String   // default comparison prompt
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Comparison {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  originalImage   String   // file path
  capturedImage   String   // file path
  diffImage       String?  // generated diff image path
  ssimScore       Float    // 0-1 (SSIM)
  analysisMode    String   // "ssim" | "llm" | "both"
  llmReport       String?  // JSON string of LLM analysis results
  llmProvider     String?  // which provider was used
  llmModel        String?  // which model was used
  createdAt       DateTime @default(now())
}
```

## Page Structure

### `/` — Home / Compare Page
```
┌─────────────────────────────────────────────┐
│  Header: Logo | Project Select | User Menu  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │   Original       │ │   Captured       │   │
│  │   Image Upload   │ │   Image Upload   │   │
│  │   [Preview]      │ │   [Preview]      │   │
│  └─────────────────┘ └─────────────────┘   │
│                                             │
│  [Compare Button]                           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  SSIM: 0.92 — Good                  │   │
│  │  Diff Heatmap + Overlay             │   │
│  │  [Deep Analysis] button             │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### `/settings` — AI Model Settings
```
┌─────────────────────────────────────────────┐
│  Header                                     │
├─────────────────────────────────────────────┤
│  AI Model Settings                          │
│                                             │
│  Provider:  [Claude (Anthropic) ▼]          │
│  Model:     [claude-sonnet-4-20250514    ]   │
│  API Key:   [••••••••••••••••] [Show]       │
│                                             │
│  Prompt Template:                           │
│  ┌─────────────────────────────────────┐   │
│  │ You are a UI/UX comparison expert.  │   │
│  │ Compare these 2 images:             │   │
│  │ - Image 1: {IMAGE_1}                │   │
│  │ - Image 2: {IMAGE_2}                │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│  [Reset to default]                         │
│                                             │
│  [Test Connection] [Save Settings]          │
│                                             │
│  Status: ✅ Key configured                  │
└─────────────────────────────────────────────┘
```

### `/projects` — Project List
```
┌─────────────────────────────────────────────┐
│  Header                                     │
├─────────────────────────────────────────────┤
│  [+ New Project]                            │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Project  │ │ Project  │ │ Project  │      │
│  │ "Alpha"  │ │ "Beta"   │ │ "Gamma"  │      │
│  │ 12 logs  │ │ 5 logs   │ │ 0 logs   │      │
│  └─────────┘ └─────────┘ └─────────┘      │
└─────────────────────────────────────────────┘
```

### `/projects/[id]` — Project Detail + Logs
```
┌─────────────────────────────────────────────┐
│  Header                                     │
├─────────────────────────────────────────────┤
│  Project: Alpha  [Edit] [Delete]            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Log #1 | thumb1 vs thumb2 | 95.2%  │   │
│  │ Log #2 | thumb3 vs thumb4 | 87.1%  │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [← Prev] Page 1 of 3 [Next →]            │
└─────────────────────────────────────────────┘
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/projects` | GET | List user's projects |
| `/api/projects` | POST | Create project |
| `/api/projects/[id]` | PUT | Update project |
| `/api/projects/[id]` | DELETE | Delete project |
| `/api/upload` | POST | Upload image, return URL |
| `/api/compare` | POST | Save comparison result |
| `/api/analyze` | POST | LLM Vision analysis (2 images → structured report) |
| `/api/settings` | GET | Get user's AI settings (masked key) |
| `/api/settings` | POST | Save/update AI settings |
| `/api/settings/test` | POST | Test API connection |
| `/api/logs` | GET | List logs (filterable by project) |
| `/api/logs/[id]` | GET | Get log detail |

## Image Comparison Flow

### Step 1: SSIM Comparison (Client-side, ~1-2s)
```
Upload 2 images → /api/upload → save to /public/uploads/
        │
        ▼
Client: Load both images into Canvas
        │
        ▼
Resize to same dimensions (match smaller to larger)
        │
        ▼
Run ssim.js(original, captured) → SSIM score (0-1)
        │
        ▼
Generate SSIM diff map (heatmap: red=diff, green=same)
        │
        ▼
Display: score, classification, diff map, overlay view
        │
        ▼
POST /api/compare → save to DB
```

### Step 2: LLM Vision Analysis (User-triggered, ~5-10s)
```
User clicks "Deep Analysis" button
        │
        ▼
Check: user có AiSettings chưa?
  - Chưa → redirect /settings + warning
  - Có → tiếp tục
        │
        ▼
POST /api/analyze with 2 image URLs
        │
        ▼
Server: Read user's AiSettings (provider, apiKey, model, prompt)
Server: Resize images to max 1024px → convert base64
        │
        ▼
Route to correct provider:
  - anthropic → Claude Vision API (POST /v1/messages)
  - openai → GPT-4V API (POST /v1/chat/completions)
  - google → Gemini API (POST /v1beta/models/{model}:generateContent)
  - custom → user's endpoint
        │
        ▼
Send to selected API with user's prompt template:
  "Compare these 2 images (design vs implementation).
   Report: [{ area, issue, severity, suggestion }]"
        │
        ▼
Parse LLM response → JSON (fallback: extract from markdown, then raw text)
        │
        ▼
Display findings as checklist with severity badges:
  🔴 Critical: layout broken, missing elements
  🟡 Warning: spacing off, color mismatch
  🔵 Info: minor pixel differences
        │
        ▼
Update DB: save llmReport to comparison record
```

### LLM Prompt Template
```
You are a UI/UX comparison expert. Compare these 2 images:
- Image 1: Design reference (Figma/mockup)
- Image 2: Implementation screenshot

Analyze and return a JSON array of findings:
[{
  "area": "header/navbar/hero/footer/etc",
  "issue": "description of difference",
  "severity": "critical|warning|info",
  "suggestion": "how to fix"
}]

Focus on: layout, spacing, colors, typography, missing elements, extra elements.
Ignore: minor anti-aliasing, sub-pixel rendering differences.
```

## Color System (Tailwind Config)

```js
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: '#006242',  // Green Pea
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#114734',  // Sherwood Green
    foreground: '#FFFFFF',
  },
  accent: {
    DEFAULT: '#A7C5EE',  // Perano
    warm: '#F2EA9D',      // Primrose
  },
  foreground: '#101820',  // Black 6C
  background: '#FFFFFF',
  muted: '#F1F5F9',
}
```

## Directory Structure

```
├── app/
│   ├── layout.tsx              # Root layout + providers
│   ├── page.tsx                # Compare page
│   ├── projects/
│   │   ├── page.tsx            # Project list
│   │   └── [id]/page.tsx       # Project detail + logs
│   ├── settings/
│   │   └── page.tsx            # AI model settings
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── projects/route.ts
│   │   ├── projects/[id]/route.ts
│   │   ├── upload/route.ts
│   │   ├── compare/route.ts
│   │   ├── analyze/route.ts
│   │   ├── settings/route.ts
│   │   ├── settings/test/route.ts
│   │   └── logs/route.ts
│   └── providers.tsx           # SessionProvider wrapper
├── components/
│   ├── ui/                     # shadcn components
│   ├── header.tsx
│   ├── image-upload.tsx
│   ├── image-compare.tsx       # Side-by-side + overlay
│   ├── ssim-result.tsx         # SSIM score + diff map
│   ├── llm-analysis.tsx        # LLM findings checklist
│   ├── ai-settings-form.tsx    # Settings form
│   ├── project-selector.tsx
│   ├── project-card.tsx
│   └── log-list.tsx
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── db.ts                   # Prisma client
│   ├── utils.ts                # Utility functions
│   ├── ssim-compare.ts         # SSIM.js wrapper
│   ├── llm-analyze.ts          # LLM Vision API client (multi-provider)
│   └── encryption.ts           # AES-256 encrypt/decrypt for API keys
├── prisma/
│   └── schema.prisma
├── public/
│   └── uploads/                # Image storage
├── tailwind.config.ts
└── package.json
```

## Trade-offs

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| SSIM (client-side) | Pixelmatch, OpenCV | Structural similarity phù hợp design-to-code hơn pixel-exact |
| LLM Vision (server-side) | Pure algorithmic | LLM hiểu context UI, phát hiện semantic differences |
| User-triggered LLM | Auto-run always | Tiết kiệm chi phí (~$0.02/call), user tự quyết định khi nào cần |
| SQLite + Prisma | PostgreSQL | MVP đơn giản, dễ setup, migration-ready |
| Local file storage | S3 | MVP, không cần CDN cho single-user tool |
| JWT sessions | Database sessions | Stateless, nhanh, không cần DB lookup mỗi request |
