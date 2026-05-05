# Task R1-01: Image Upload

## Objective
Implement upload 2 ảnh (original + captured) với preview và API endpoint lưu file.

## Implementation Steps

- [ ] 1. Upload API endpoint
  - Tạo `app/api/upload/route.ts`
  - POST: nhận FormData với file
  - Validate: type (png/jpg/jpeg/webp), size (< 10MB)
  - Lưu vào `public/uploads/` với unique filename (uuid + extension)
  - Return: `{ url: "/uploads/xxx.jpg" }`

- [ ] 2. ImageUpload component
  - Tạo `components/image-upload.tsx`
  - Drag & drop zone + file input
  - Hiển thị preview sau khi chọn
  - Hiển thị thông tin: filename, size, dimensions
  - Nút "Remove" để xóa ảnh đã chọn
  - Error state cho file không hợp lệ

- [ ] 3. Compare page layout
  - Update `app/page.tsx`
  - 2-column grid: Original | Captured
  - Mỗi column có ImageUpload component
  - Project selector dropdown (placeholder, sẽ kết nối ở R4)
  - Nút "Compare" disabled nếu thiếu 1 trong 2 ảnh

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `app/api/upload/route.ts` | Create | Upload API |
| `components/image-upload.tsx` | Create | Upload component |
| `app/page.tsx` | Modify | Compare page layout |
| `public/uploads/` | Create | Upload directory |

## Completion Criteria
- [ ] Upload ảnh PNG/JPG/WebP thành công, preview hiển thị
- [ ] File > 10MB bị reject với error message
- [ ] File không đúng định dạng bị reject
- [ ] Ảnh hiển thị preview ngay sau khi upload
