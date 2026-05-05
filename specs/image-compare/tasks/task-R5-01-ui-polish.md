# Task R5-01: UI Polish & Responsive

## Objective
Hoàn thiện UI theo design spec: responsive layout, loading states, toast notifications, error handling.

## Implementation Steps

- [ ] 1. Responsive layout
  - Desktop: sidebar + main content
  - Tablet: stacked layout
  - Mobile: single column, hamburger menu
  - Test breakpoints: sm (640px), md (768px), lg (1024px)

- [ ] 2. Loading states
  - Skeleton loaders cho: image upload, log list, project list
  - Spinner cho: image comparison processing
  - Progress bar cho: file upload

- [ ] 3. Toast notifications
  - Install: `npm install sonner`
  - Success: upload complete, comparison saved, project created
  - Error: upload failed, comparison failed, auth error
  - Position: bottom-right

- [ ] 4. Error boundaries
  - Wrap pages trong error boundary
  - Friendly error messages (không expose stack trace)
  - Nút "Try Again" để retry

- [ ] 5. Empty states
  - Compare page: placeholder "Upload 2 images to compare"
  - Logs page: "No comparisons yet"
  - Projects page: "Create your first project"

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `app/layout.tsx` | Modify | Responsive layout |
| `components/ui/skeleton.tsx` | Create | Skeleton loader |
| `app/error.tsx` | Create | Error boundary |
| `app/loading.tsx` | Create | Loading state |
| `components/empty-state.tsx` | Create | Empty state component |

## Completion Criteria
- [ ] Mobile layout hoạt động (không overflow, không cắt nội dung)
- [ ] Loading states hiển thị đúng khi chờ data
- [ ] Toast notifications hiển thị cho mọi action
- [ ] Error states hiển thị friendly messages
