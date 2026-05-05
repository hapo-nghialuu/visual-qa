# Task R2-01: Google Auth Flow

## Objective
Hoàn thiện flow đăng nhập Google: login button, session handling, route protection.

## Implementation Steps

- [ ] 1. Header component
  - Tạo `components/header.tsx`
  - Hiển thị logo + nav links (Compare, Projects)
  - Nếu chưa login: nút "Login with Google"
  - Nếu đã login: Avatar + dropdown (name, email, logout)

- [ ] 2. Route protection middleware
  - Tạo `middleware.ts` (Next.js middleware)
  - Protect: `/projects/*`
  - Public: `/`, `/api/auth/*`
  - Redirect unauthenticated users về `/` với callbackUrl

- [ ] 3. Login flow
  - Nút "Login with Google" gọi `signIn("google")`
  - Sau login redirect về callbackUrl hoặc `/`
  - Hiển thị toast "Đăng nhập thành công"
  <!-- Updated: Red Team Finding 7 — default project init -->
  - Sau login lần đầu: auto-create "General" project cho user (nếu chưa có project nào)

- [ ] 4. User dropdown menu
  - Hiển thị avatar, tên, email
  - Nút "Logout" gọi `signOut()`
  - Style theo shadcn DropdownMenu

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `components/header.tsx` | Create | Header with auth |
| `middleware.ts` | Create | Route protection |
| `app/layout.tsx` | Modify | Include header |

## Completion Criteria
- [ ] Click "Login with Google" → redirect Google OAuth → callback thành công
- [ ] Header hiển thị avatar + tên sau login
- [ ] Logout hoạt động, redirect về trang chủ
- [ ] Truy cập `/projects` khi chưa login → redirect về `/`
