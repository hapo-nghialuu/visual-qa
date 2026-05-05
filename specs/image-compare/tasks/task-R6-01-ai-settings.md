# Task R6-01: AI Model Settings

## Objective
Implement Settings page cho user cấu hình AI provider, API key, model, và custom prompt template để sử dụng LLM Vision analysis.

## Implementation Steps

- [ ] 1. Encryption utility
  - Tạo `lib/encryption.ts`
  - Functions: `encrypt(plaintext, key)`, `decrypt(ciphertext, key)`
  - Sử dụng AES-256-GCM (Node.js built-in `crypto`)
  - Encryption key từ env var: `ENCRYPTION_KEY` (32 bytes hex)
  - IV随机生成, prepend vào ciphertext
  <!-- Updated: Red Team Finding 2 — key management -->
  - Graceful handling khi decrypt fail: return null, prompt user re-enter key
  - Document key generation: `openssl rand -hex 32` trong README/.env.example
  - Note: key rotation = all users must re-enter API keys

- [ ] 2. AiSettings API endpoints
  - Tạo `app/api/settings/route.ts`
    - GET: trả về user's settings (API key masked: `sk-...abc`)
    - POST: lưu/update settings
      - Validate: provider required, apiKey required, model required
      - Encrypt API key trước khi lưu DB
      - Nếu provider = "custom" → validate endpoint URL
      <!-- Updated: Red Team Finding 1 — SSRF protection -->
      - Custom endpoint validation: must be HTTPS, không được là private IP (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x), không được là localhost
  - Tạo `app/api/settings/test/route.ts`
    - POST: test connection
    - Decrypt API key, gửi test request tới provider
    - Anthropic: POST https://api.anthropic.com/v1/messages với model, max_tokens=10
    - OpenAI: POST https://api.openai.com/v1/chat/completions với model, max_tokens=10
    - Google: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
      <!-- Updated: Red Team Finding 11 — API key in header, not URL -->
      - Dùng `Authorization: Bearer {apiKey}` header thay vì `?key={apiKey}` query param
    - Custom: POST tới user's endpoint
    <!-- Updated: Red Team Finding 10 — timeout -->
    - Timeout: 10s cho test connection, 60s cho actual LLM analysis
    - Return: `{ success: boolean, message: string, latency: number }`

- [ ] 3. AiSettings form component
  - Tạo `components/ai-settings-form.tsx`
  - Fields:
    - Provider: Select (Claude / OpenAI / Google AI Studio / Custom)
    - Model: Input (auto-fill khi chọn provider)
      - Claude: claude-sonnet-4-20250514
      - OpenAI: gpt-4o
      - Google AI Studio: gemini-2.5-flash (default), gemma-4-31b-it
    - API Key: Input type="password" + toggle show/hide
    - Endpoint: Input (hiển thị khi provider = "custom")
    - Prompt Template: Textarea (min 6 rows)
  - Buttons:
    - "Test Connection" → gọi /api/settings/test
    - "Save Settings" → gọi /api/settings
    - "Reset to default" → reset prompt template
  - Validation: required fields, URL format cho custom endpoint
  <!-- Updated: Red Team Finding 8 — prompt placeholder validation -->
  - Validate prompt template contains `{IMAGE_1}` và `{IMAGE_2}` trước khi save
  - Warning: "Prompt must contain {IMAGE_1} and {IMAGE_2} placeholders"
  - Loading/saving states

- [ ] 4. Settings page
  - Tạo `app/settings/page.tsx`
  - Layout: Card chứa AiSettingsForm
  - Header: "AI Model Settings"
  - Status indicator: "Key configured ✅" hoặc "No key set ⚠️"
  - Fetch existing settings on mount (GET /api/settings)
  - Toast notification on save success/error

- [ ] 5. Integrate settings vào LLM flow
  - Update `lib/llm-analyze.ts`:
    - Accept `provider`, `apiKey`, `model`, `endpoint` params
    - Route to correct API based on provider
    - Anthropic: POST https://api.anthropic.com/v1/messages
    - OpenAI: POST https://api.openai.com/v1/chat/completions
    - Google: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
      - Dùng `Authorization: Bearer {apiKey}` header (không dùng query param)
      <!-- Updated: Red Team Finding 12 — Google response format -->
      - Response format: `{ candidates: [{ content: { parts: [{ text }] } }] }` (khác OpenAI/Anthropic)
      - Cần parser adapter riêng cho Google: extract text từ `response.candidates[0].content.parts[0].text`
    - Custom: POST to user's endpoint
  - Update `app/api/analyze/route.ts`:
    - Read user's AiSettings từ DB
    - Nếu chưa cấu hình → return 400 với message "Please configure AI settings"
    - Decrypt API key, gọi llm-analyze với user's config
    - Save llmProvider + llmModel vào Comparison record

- [ ] 6. Warning banner trên Compare page
  - Update `app/page.tsx`
  - Khi user click "Deep Analysis" lần đầu:
    - Check settings tồn tại (GET /api/settings)
    - Nếu chưa có → hiển thị banner "Configure AI settings to use Deep Analysis" + link /settings
    - Nếu có → proceed bình thường

## Related Files

| File | Action | Description |
|------|--------|-------------|
| `lib/encryption.ts` | Create | AES-256 encrypt/decrypt |
| `app/api/settings/route.ts` | Create | Settings CRUD API |
| `app/api/settings/test/route.ts` | Create | Test connection API |
| `components/ai-settings-form.tsx` | Create | Settings form |
| `app/settings/page.tsx` | Create | Settings page |
| `lib/llm-analyze.ts` | Modify | Multi-provider support |
| `app/api/analyze/route.ts` | Modify | Read settings from DB |
| `app/page.tsx` | Modify | Warning banner |

## Completion Criteria
- [ ] Settings page load được, hiển thị form đúng
- [ ] Chọn provider → model auto-fill
- [ ] API key lưu encrypted vào DB, hiển thị masked
- [ ] Test Connection thành công với API key hợp lệ
- [ ] Test Connection hiển thị lỗi đúng khi key sai
- [ ] Custom prompt template lưu được, reset về default được
- [ ] Deep Analysis đọc settings từ DB, dùng đúng provider
- [ ] Chưa cấu hình settings → hiển thị warning + link /settings
- [ ] Settings persist qua reload (lưu trong DB)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| API key泄露 nếu encryption key leak | Critical | Encryption key từ env var, không commit vào code |
| Custom endpoint có thể là internal network | Medium | Validate URL format, optional allowlist |
| Provider API thay đổi schema | Low | Abstract provider interface, version pinning |
| User nhập sai key → test connection fail | Low | Clear error message, retry button |
