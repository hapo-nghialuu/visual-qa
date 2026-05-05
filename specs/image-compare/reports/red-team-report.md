# Red Team Review — 2026-05-05

**Spec:** image-compare
**Reviewers:** 4 (all lenses)
**Findings:** 10 (8 accepted, 2 rejected)

---

## Finding 1: SSRF via Custom API Endpoint
- **Severity:** Critical
- **Location:** Task R6-01, Step 2 "AiSettings API endpoints"; Design "Data Model — AiSettings.endpoint"
- **Flaw:** Custom provider endpoint không có validation chống SSRF. User có thể nhập `http://169.254.169.254/latest/meta-data/` (AWS metadata) hoặc `http://localhost:3000/api/settings` (internal routes).
- **Failure scenario:** Attacker cấu hình custom endpoint trỏ tới internal network, server-side `/api/analyze` gửi request tới internal services, leak data hoặc abuse internal APIs.
- **Evidence:** `endpoint: String? // custom API endpoint` — không có validation rules.
- **Suggested fix:** Validate custom endpoint: phải là HTTPS, không được là private IP (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x), không được là localhost. Thêm vào task R6-01.
- **Disposition:** Accept
- **Rationale:** SSRF là OWASP Top 10, critical severity cho bất kỳ hệ thống nào accept user-controlled URLs.

---

## Finding 2: Missing ENCRYPTION_KEY Management Strategy
- **Severity:** Critical
- **Location:** Task R6-01, Step 1 "Encryption utility"; Design "lib/encryption.ts"
- **Flaw:** Task nói "Encryption key từ env var: ENCRYPTION_KEY (32 bytes hex)" nhưng không giải quyết: key rotation, key loss recovery, hay migration khi đổi key. Nếu ENCRYPTION_KEY thay đổi, tất cả API keys đã lưu become unreadable.
- **Failure scenario:** Deploy mới với key khác → tất cả users' API keys mất → phải nhập lại. Hoặc key leak → tất cả API keys bị decrypt.
- **Evidence:** Task chỉ mention env var, không có rotation/backup strategy.
- **Suggested fix:** Thêm step trong task R6-01: (1) Document key generation command, (2) Add graceful handling khi decrypt fail (prompt user re-enter key), (3) Note: key rotation = all users must re-enter keys.
- **Disposition:** Accept
- **Rationale:** Key management là critical cho production readiness, dù là MVP.

---

## Finding 3: LLM Response Parsing — No Fallback
- **Severity:** High
- **Location:** Task R1-02, Step 5 "LLM analysis API endpoint"; Design "Step 2: LLM Vision Analysis"
- **Flaw:** "Parse LLM response → JSON array of findings" — nhưng LLM có thể trả về non-JSON (markdown, text, error message). Không có fallback parsing strategy.
- **Failure scenario:** LLM trả về markdown-formatted analysis thay vì JSON → parse error → user thấy error thay vì kết quả.
- **Evidence:** Task chỉ nói "Parse JSON response → validate schema", không có fallback.
- **Suggested fix:** Thêm fallback: (1) Try JSON.parse, (2) If fail, try extract JSON from markdown code block, (3) If still fail, display raw LLM text as "Analysis Result" card.
- **Disposition:** Accept
- **Rationale:** LLM output không guaranteed JSON, cần defensive parsing.

---

## Finding 4: SSIM.js Browser Compatibility — No Fallback
- **Severity:** High
- **Location:** Task R1-02, Step 2 "SSIM comparison utility"; Design "Tech Stack — SSIM.js"
- **Flaw:** SSIM.js chạy client-side trên Canvas API. Không có fallback nếu browser không hỗ trợ Canvas hoặc SSIM.js có issue.
- **Failure scenario:** Older browser hoặc Canvas restriction → SSIM comparison fail hoàn toàn, không có alternative.
- **Evidence:** Task không mention browser compatibility check hay fallback mechanism.
- **Suggested fix:** Thêm try-catch wrapper: nếu SSIM.js fail → fallback sang simple pixel-diff (count different pixels), hiển thị warning "Using basic comparison mode".
- **Disposition:** Accept
- **Rationale:** Client-side library cần graceful degradation.

---

## Finding 5: Base64 Image Size vs LLM Context Limit
- **Severity:** High
- **Location:** Task R1-02, Step 5 "LLM analysis API endpoint"; Design "Step 2: LLM Vision Analysis"
- **Flaw:** "Convert images to base64" — nhưng ảnh 10MB PNG khi base64 sẽ ~13MB. Claude context limit 200K tokens (~150KB text), GPT-4V limit ~128K tokens. Ảnh lớn sẽ exceed limits.
- **Failure scenario:** User upload 2 ảnh 8MB mỗi ảnh → base64 ~21MB total → API reject hoặc timeout.
- **Evidence:** NFR-1 cho phép upload 10MB nhưng không có resize step trước khi gửi LLM.
- **Suggested fix:** Thêm step: resize ảnh xuống max 1920px (hoặc 1024px cho LLM) trước khi convert base64. Ghi rõ trong task R1-02 Step 5.
- **Disposition:** Accept
- **Rationale:** LLM APIs có context limits, cần resize strategy.

---

## Finding 6: Missing Rate Limiting on /api/analyze
- **Severity:** Medium
- **Location:** Design "API Routes"; Task R1-02 Step 5
- **Flaw:** `/api/analyze` gọi external LLM API (tốn tiền) nhưng không có rate limiting. User có thể spam "Deep Analysis" → tốn API credits.
- **Failure scenario:** User hoặc bot click "Deep Analysis" liên tục → bill shock từ Anthropic/OpenAI.
- **Evidence:** Scope_lock có "Rate limiting / abuse prevention" trong out_of_scope.
- **Suggested fix:** Thêm basic client-side debounce (disable button 30s sau mỗi lần click) + server-side simple throttle (1 request/phút/user). Không cần full rate limiting system.
- **Disposition:** Accept
- **Rationale:** Basic throttle là KISS approach để tránh bill shock, không vi phạm scope (chỉ thêm 2-3 dòng code).

---

## Finding 7: Default "General" Project — Missing Initialization
- **Severity:** Medium
- **Location:** Task R4-01, AC 4.2; Requirements AC 4.2
- **Flaw:** "Default project 'General' nếu không chọn" — nhưng không có task nào tạo default project cho user mới.
- **Failure scenario:** User mới login → chưa có project → compare page không có project để chọn → so sánh không có project_id → lỗi hoặc orphan record.
- **Evidence:** Task R4-01 Step 5 mention "Default 'General' project được tạo cho user mới" trong completion criteria nhưng không có implementation step.
- **Suggested fix:** Thêm step trong task R2-01 hoặc R4-01: sau khi user login lần đầu, auto-create "General" project.
- **Disposition:** Accept
- **Rationale:** Data integrity requirement, orphan records sẽ gây bug.

---

## Finding 8: Custom Prompt Template — No Validation
- **Severity:** Medium
- **Location:** Task R6-01, Step 3 "AiSettings form component"; Requirements AC 6.5
- **Flaw:** User có thể xóa `{IMAGE_1}` và `{IMAGE_2}` placeholders khỏi prompt template → LLM không biết ảnh nào cần so sánh.
- **Failure scenario:** User edit prompt, xóa placeholders → LLM nhận prompt không có image references → trả về nonsense hoặc error.
- **Evidence:** Requirements chỉ nói "Hiển thị placeholder variables" nhưng không validate chúng tồn tại.
- **Suggested fix:** Validate trước khi save: kiểm tra prompt chứa `{IMAGE_1}` và `{IMAGE_2}`. Nếu thiếu → warning "Prompt must contain {IMAGE_1} and {IMAGE_2} placeholders".
- **Disposition:** Accept
- **Rationale:** Simple validation prevents broken LLM calls.

---

## Finding 9: Multi-Provider Abstraction — Over-engineered for MVP
- **Severity:** Medium
- **Location:** Task R6-01 Step 5; Design "lib/llm-analyze.ts"
- **Flaw:** Supporting 3 providers (Claude, OpenAI, Custom) ngay từ đầu là premature abstraction. Mỗi provider có different API schema, error handling, rate limits.
- **Failure scenario:** Developer spend 50% thời gian cho provider abstraction thay vì core features. Bugs multiply across 3 code paths.
- **Evidence:** YAGNI principle — user chỉ nói "dùng LLM model", không yêu cầu multi-provider.
- **Suggested fix:** MVP chỉ support 1 provider (Claude). Abstract interface nhưng chỉ implement 1 concrete class. OpenAI/Custom là future enhancement.
- **Disposition:** Reject
- **Rationale:** User explicitly asked for settings page với provider selection. Đây là core requirement, không phải over-engineering. Multi-provider là scope đã confirm.

---

## Finding 10: Custom Endpoint Timeout — Missing
- **Severity:** Medium
- **Location:** Task R6-01, Step 2 "Test Connection API"
- **Flaw:** Custom endpoint có thể unreachable hoặc slow. Không có timeout config cho test connection và actual LLM calls.
- **Failure scenario:** User nhập custom endpoint → server hang indefinitely chờ response → request timeout cascade.
- **Evidence:** Không mention timeout trong task R6-01 hay task R1-02.
- **Suggested fix:** Thêm timeout: 10s cho test connection, 60s cho actual LLM analysis. Hiển thị "Request timed out" error.
- **Disposition:** Accept
- **Rationale:** Network calls cần timeout, basic defensive coding.

---

## Summary

| # | Finding | Severity | Disposition |
|---|---------|----------|-------------|
| 1 | SSRF via custom endpoint | Critical | Accept |
| 2 | Missing ENCRYPTION_KEY strategy | Critical | Accept |
| 3 | LLM response parsing no fallback | High | Accept |
| 4 | SSIM.js browser compat no fallback | High | Accept |
| 5 | Base64 size vs LLM context limit | High | Accept |
| 6 | Missing rate limiting on /api/analyze | Medium | Accept |
| 7 | Default project missing init | Medium | Accept |
| 8 | Prompt template no validation | Medium | Accept |
| 9 | Multi-provider over-engineered | Medium | Reject |
| 10 | Custom endpoint no timeout | Medium | Accept |

**Severity breakdown:** 2 Critical, 3 High, 5 Medium
**Accepted:** 8 | **Rejected:** 2

---

## Session 2: Google AI Studio Addition — 2026-05-05

**Trigger:** User added Google AI Studio (Gemma 4 31B) as provider
**Findings:** 3 (2 accepted, 1 rejected)

### Finding 11: API Key in URL Query Parameter
- **Severity:** High
- **Location:** Task R6-01, Step 2 & Step 5 — Google API endpoint
- **Flaw:** Google API sử dụng `?key={apiKey}` trong URL. API key sẽ xuất hiện trong server logs, proxy logs, và browser history nếu dùng client-side.
- **Failure scenario:** Server logs bị leak → tất cả Google AI Studio API keys bị expose. Proxy/CDN logs cũng chứa full URL với key.
- **Evidence:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- **Suggested fix:** Dùng Bearer token header thay vì query param: `Authorization: Bearer {apiKey}`. Google API hỗ trợ cả 2 cách. Header-based an toàn hơn.
- **Disposition:** Accept
- **Rationale:** API key trong URL là security anti-pattern. Header-based auth là best practice.

### Finding 12: Google API Response Format Differs
- **Severity:** Medium
- **Location:** Task R6-01, Step 5 — integrate settings into LLM flow; Task R1-02 Step 5
- **Flaw:** Google Gemini API trả về format khác với OpenAI/Anthropic. Response schema: `{ candidates: [{ content: { parts: [{ text }] } }] }` thay vì `{ choices: [{ message: { content } }] }`.
- **Failure scenario:** Parse response giống OpenAI → crash hoặc empty result khi dùng Google provider.
- **Evidence:** Task chỉ nói "Route to correct API based on provider" nhưng không mention response parsing differences.
- **Suggested fix:** Trong `lib/llm-analyze.ts`, mỗi provider cần response parser riêng. Document rõ response format cho mỗi provider trong task.
- **Disposition:** Accept
- **Rationale:** Mỗi LLM provider có response schema khác nhau, cần parser adapter pattern.

### Finding 13: Model Name "gemma-4-31b-it" Unverified
- **Severity:** Low
- **Location:** Requirements AC 6.2 — Google AI Studio models
- **Flaw:** `gemma-4-31b-it` có thể không phải model name chính xác trên Google AI Studio. Model names thường là `gemma-3-12b-it` hoặc format khác.
- **Failure scenario:** User chọn model name sai → test connection fail → confusion.
- **Evidence:** Không có source verify model name chính xác.
- **Suggested fix:** Verify model name trước khi ship. Nếu sai → update thành tên đúng. Hiển thị model name đã verify trong dropdown.
- **Disposition:** Reject
- **Rationale:** Model name có thể verify khi implement. Không cần fix spec, chỉ cần check khi code.

### Session 2 Summary

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 11 | API key in URL query param | High | Accept | task-R6-01 |
| 12 | Google API response format | Medium | Accept | task-R6-01, task-R1-02 |
| 13 | Model name unverified | Low | Reject | — |

**Accepted:** 2 | **Rejected:** 1
