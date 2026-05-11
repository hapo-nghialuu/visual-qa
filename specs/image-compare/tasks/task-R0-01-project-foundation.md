# Task R0-01: Project Foundation

## Objective
Khởi tạo Next.js project với Prisma, NextAuth, shadcn/ui, và cấu hình Tailwind custom colors.

## Implementation Steps

- [x] 1. Init Next.js project
  - `npx create-next-app@latest ui-compare --typescript --tailwind --app --src-dir=false`
  - Verify dev server chạy được

- [x] 2. Setup Prisma + SQLite
  - `npm install prisma @prisma/client`
  - `npx prisma init --datasource-provider sqlite`
  - Tạo schema.prisma với models: User, Project, Comparison
  - `npx prisma db push`
  - Tạo `lib/db.ts` singleton PrismaClient

- [x] 3. Setup NextAuth.js
  - `npm install next-auth @auth/prisma-adapter`
  - Tạo `app/api/auth/[...nextauth]/route.ts`
  - Tạo `lib/auth.ts` với GoogleProvider config
  - Tạo `app/providers.tsx` với SessionProvider
  - Wrap layout.tsx với providers

- [x] 4. Setup shadcn/ui
  - `npx shadcn@latest init`
  - Install components: button, card, dialog, dropdown-menu, input, select, avatar, badge, label

- [x] 5. Configure Tailwind custom colors
  - Update `tailwind.config.ts` với color palette:
    - primary: #006242 (Green Pea)
    - secondary: #114734 (Sherwood Green)
    - accent: #A7C5EE (Perano)
    - accent-warm: #F2EA9D (Primrose)
    - foreground: #101820 (Black 6C)

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Create | Dependencies |
| `prisma/schema.prisma` | Create | DB schema |
| `lib/db.ts` | Create | Prisma singleton |
| `lib/auth.ts` | Create | NextAuth config |
| `app/api/auth/[...nextauth]/route.ts` | Create | Auth API |
| `app/providers.tsx` | Create | SessionProvider |
| `app/layout.tsx` | Modify | Wrap providers, fonts |
| `tailwind.config.ts` | Modify | Custom colors |
| `components.json` | Create | shadcn config |

## Completion Criteria
- [ ] `npm run dev` chạy thành công
- [ ] `npx prisma studio` mở được, thấy 3 tables
- [x] shadcn components import được
- [x] Tailwind custom colors hoạt động (test bằng div có bg-primary)
