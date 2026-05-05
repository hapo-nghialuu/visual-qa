# Requirements — Image Compare

## R1: Image Upload & Comparison

### AC 1.1: Dual Image Upload
- Hệ thống cho phép upload 2 ảnh: ảnh gốc (original) và ảnh chụp (captured)
- Hỗ trợ định dạng: PNG, JPG, JPEG, WebP
- Giới hạn kích thước: tối đa 10MB mỗi ảnh
- Hiển thị preview ngay sau khi upload

### AC 1.2: Side-by-Side Display
- Hiển thị 2 ảnh song song (side-by-side) mặc định
- Hỗ trợ đồng bộ zoom và pan giữa 2 ảnh
- Hiển thị kích thước ảnh (width x height) cho mỗi ảnh

### AC 1.3: SSIM Structural Comparison
- Tính toán SSIM score (0-1) giữa 2 ảnh sử dụng thư viện `ssim.js`
- Resize ảnh về cùng kích thước trước khi so sánh
- Hiển thị: SSIM score (%), classification (Excellent >0.95 / Good >0.85 / Fair >0.7 / Poor <0.7)
- Tạo SSIM diff map: heatmap hiển thị vùng nào khác biệt nhiều (đỏ = khác, xanh = giống)

### AC 1.4: LLM Vision Deep Analysis (User-Triggered)
- Nút "Deep Analysis" xuất hiện sau khi có SSIM kết quả
- Gửi 2 ảnh lên LLM Vision API (Claude / GPT-4V)
- LLM trả về structured report: [{ area, issue, severity, suggestion }]
- Hiển thị kết quả dạng checklist với severity color-coded (critical/warning/info)
- Loading state: "Analyzing..." với estimated time (~5-10s)

### AC 1.5: Overlay View
- Chế độ overlay: chồng 2 ảnh lên nhau với opacity slider
- Slider điều khiển opacity từ 0% đến 100%
- Toggle giữa side-by-side và overlay mode

## R2: Google Authentication

### AC 2.1: Google OAuth Login
- Nút "Login with Google" trên header
- Sử dụng NextAuth.js với Google Provider
- Yêu cầu scopes: email, profile

### AC 2.2: User Session
- Hiển thị avatar và tên user sau khi login
- Persist session qua JWT
- Logout button trong dropdown menu

### AC 2.3: Route Protection
- Trang so sánh ảnh yêu cầu đăng nhập
- Redirect về login page nếu chưa authenticated
- Callback URL sau login quay về trang trước đó

## R3: Comparison Logging

### AC 3.1: Auto-Log on Compare
- Mỗi lần thực hiện so sánh, tự động tạo log entry
- Log chứa: user_id, timestamp, original_image_url, captured_image_url, similarity_score, project_id

### AC 3.2: Log List View
- Hiển thị danh sách logs theo thời gian (mới nhất trước)
- Pagination: 20 logs per page
- Hiển thị thumbnail 2 ảnh, similarity score, thời gian

### AC 3.3: Log Detail View
- Click vào log để xem chi tiết
- Hiển thị lại kết quả so sánh (side-by-side + diff)
- Nút "Re-compare" để so sánh lại với ảnh mới

## R4: Project Management

### AC 4.1: Project CRUD
- Tạo project mới với tên và mô tả
- Chỉnh sửa tên, mô tả project
- Xóa project (confirm dialog)

### AC 4.2: Project Selection
- Dropdown chọn project trước khi so sánh
- Default project "General" nếu không chọn
- Ghi nhớ project đã chọn trong session

### AC 4.3: Project Dashboard
- Trang danh sách projects với số lượng logs mỗi project
- Click vào project để xem logs thuộc project đó
- Sort projects theo tên hoặc số lượng logs

## R5: UI & Theming

### AC 5.1: shadcn UI Components
- Sử dụng shadcn/ui làm component library
- Components: Button, Card, Dialog, DropdownMenu, Input, Select, Avatar, Badge

### AC 5.2: Custom Color Palette
- Primary: Green Pea #006242 (nút chính, link, accent)
- Secondary: Sherwood Green #114734 (header, sidebar)
- Background: White với subtle gray
- Text: Black 6C #101820
- Accent/Light: Perano #A7C5EE (diff highlight, badges)
- Accent/Warm: Primrose #F2EA9D (warning, attention)

### AC 5.3: Responsive Layout
- Desktop: 2-column layout (sidebar + main)
- Tablet: stacked layout
- Mobile: single column, collapsible sidebar

## R6: AI Model Settings

### AC 6.1: Settings Page
- Trang Settings accessible từ header (icon gear)
- Chỉ user đã login mới truy cập được
- Route: `/settings`

### AC 6.2: AI Provider Selection
- Dropdown chọn provider: Claude (Anthropic) / OpenAI / Google AI Studio / Custom
- Khi chọn provider → auto-suggest models phổ biến:
  - Claude: claude-sonnet-4-20250514, claude-haiku-4-5-20251001
  - OpenAI: gpt-4o, gpt-4o-mini
  - Google AI Studio: gemini-2.5-flash, gemini-2.5-pro, gemma-4-31b-it
  - Custom: user tự nhập endpoint + model name
- Google AI Studio: API key từ aistudio.google.com, endpoint cố định `https://generativelanguage.googleapis.com/v1beta`

### AC 6.3: API Key Configuration
- Input field cho API key (password type, masked)
- Nút "Show/Hide" toggle
- API key được lưu encrypted trong DB (AES-256)
- Hiển thị: "Key configured" (masked) hoặc "No key set"

### AC 6.4: Model Selection
- Input field cho model name
- Pre-fill khi chọn provider ở AC 6.2
- User có thể override nhập model name khác

### AC 6.5: Custom Prompt Template
- Textarea cho custom prompt (editable)
- Default prompt template pre-filled
- Hiển thị placeholder variables: `{IMAGE_1}`, `{IMAGE_2}`
- Nút "Reset to default" để khôi phục prompt gốc

### AC 6.6: Test Connection
- Nút "Test Connection" kiểm tra API key + model có hoạt động không
- Gửi 1 test request đơn giản (text-only, không gửi ảnh)
- Hiển thị: success (green) / error (red với message)

### AC 6.7: Settings Persistence
- Lưu settings vào DB (per-user)
- Khi user gọi Deep Analysis → đọc settings từ DB
- Nếu chưa cấu hình → hiển thị warning "Please configure AI settings first" + link tới /settings

## NFR (Non-Functional Requirements)

### NFR-1: Performance
- Image upload response < 2s cho ảnh 10MB
- Diff calculation < 3s cho ảnh 1920x1080
- Page load < 3s (LCP)

### NFR-2: Security
- HTTPS only
- Google OAuth tokens stored securely (httpOnly cookies)
- Image uploads scanned for malware (basic check)
- CSRF protection via NextAuth
- API keys encrypted at rest (AES-256-GCM)
- Custom endpoints validated: HTTPS only, no private IPs (SSRF protection)
- LLM API calls: timeout 60s, client-side debounce 30s

### NFR-3: Scalability
- Image storage: local filesystem (MVP), S3-ready architecture
- Database: SQLite (MVP), PostgreSQL-ready schema
