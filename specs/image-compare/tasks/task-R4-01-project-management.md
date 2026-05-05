# Task R4-01: Project Management

## Objective
Implement CRUD projects, project selector, và project detail page với logs.

## Implementation Steps

- [ ] 1. Projects API endpoints
  - Tạo `app/api/projects/route.ts`
    - GET: list user's projects với log count
    - POST: create project `{ name, description }`
  - Tạo `app/api/projects/[id]/route.ts`
    - PUT: update project
    - DELETE: delete project (cascade delete logs)

- [ ] 2. ProjectSelector component
  - Tạo `components/project-selector.tsx`
  - Dropdown select hiển thị danh sách projects
  - Default: "General" project
  - Tạo project mới inline (quick create)
  - Lưu selection vào state

- [ ] 3. ProjectCard component
  - Tạo `components/project-card.tsx`
  - Hiển thị: tên project, mô tả, số lượng logs
  - Nút Edit, Delete
  - Click → navigate to `/projects/[id]`

- [ ] 4. Projects page
  - Tạo `app/projects/page.tsx`
  - Grid hiển thị ProjectCards
  - Nút "New Project" mở dialog
  - Empty state nếu chưa có project

- [ ] 5. Project detail page
  - Tạo `app/projects/[id]/page.tsx`
  - Header: project name, description, edit/delete buttons
  - LogList component hiển thị logs thuộc project
  - Breadcrumb: Projects > [Project Name]

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `app/api/projects/route.ts` | Create | Projects list/create API |
| `app/api/projects/[id]/route.ts` | Create | Project update/delete API |
| `components/project-selector.tsx` | Create | Dropdown selector |
| `components/project-card.tsx` | Create | Project card |
| `app/projects/page.tsx` | Create | Projects list page |
| `app/projects/[id]/page.tsx` | Create | Project detail page |

## Completion Criteria
- [ ] Tạo project mới → hiển thị trong danh sách
- [ ] Edit/Delete project hoạt động
- [ ] Project selector trên compare page hoạt động
- [ ] Project detail page hiển thị logs thuộc project
- [ ] Default "General" project được tạo cho user mới
