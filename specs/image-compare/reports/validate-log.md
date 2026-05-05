# Validation Log — Session 1 — 2026-05-05

**Trigger:** User ran `/specs --validate`
**Questions asked:** 1 (apply all findings)

## Red Team Summary

- **Mode:** Red Team → Validate (8 task files + auth/security keywords)
- **Findings:** 10 (8 accepted, 2 rejected)
- **Severity:** 2 Critical, 3 High, 5 Medium

## Accepted Findings Applied

| # | Finding | Severity | Applied To |
|---|---------|----------|------------|
| 1 | SSRF via custom endpoint | Critical | task-R6-01 (endpoint validation) |
| 2 | Missing ENCRYPTION_KEY strategy | Critical | task-R6-01 (key management docs) |
| 3 | LLM response parsing no fallback | High | task-R1-02 (3-tier fallback) |
| 4 | SSIM.js browser compat no fallback | High | task-R1-02 (try-catch fallback) |
| 5 | Base64 size vs LLM context limit | High | task-R1-02 (resize to 1024px) |
| 6 | Missing rate limiting on /api/analyze | Medium | task-R1-02 (30s debounce) |
| 7 | Default project missing init | Medium | task-R2-01 (auto-create General) |
| 8 | Prompt template no validation | Medium | task-R6-01 (placeholder check) |
| 10 | Custom endpoint no timeout | Medium | task-R6-01 (10s/60s timeout) |

## Rejected Findings

| # | Finding | Rationale |
|---|---------|-----------|
| 9 | Multi-provider over-engineered | User explicitly requested provider selection. Core requirement, not over-engineering. |

## Confirmed Decisions
- SSRF protection: HTTPS-only + no private IPs for custom endpoints
- Encryption: AES-256-GCM, graceful decrypt failure handling
- LLM parsing: 3-tier fallback (JSON → markdown extract → raw text)
- SSIM fallback: simple pixel-diff if ssim.js fails
- Image resize: max 1024px before base64 for LLM
- Rate limiting: client-side 30s debounce (KISS, no full rate limiter)
- Default project: auto-create "General" on first login
- Prompt validation: require {IMAGE_1} and {IMAGE_2} placeholders
- Timeout: 10s test connection, 60s LLM analysis

## Impact on Tasks
- task-R6-01: 5 changes (SSRF, encryption, timeout, prompt validation, key management)
- task-R1-02: 4 changes (SSIM fallback, LLM fallback, resize, debounce)
- task-R2-01: 1 change (default project init)
- design.md: 3 changes (endpoint validation, resize, parse fallback)
- requirements.md: 1 change (NFR-2 security additions)

---

# Validation Log — Session 2 — 2026-05-05

**Trigger:** User added Google AI Studio (Gemma 4 31B) as provider, then ran `/specs --validate`
**Questions asked:** 1 (review each finding → accept 11+12, reject 13)

## Red Team Summary

- **Mode:** Red Team (Session 2 — incremental review for Google AI Studio addition)
- **Findings:** 3 (2 accepted, 1 rejected)
- **Severity:** 1 High, 1 Medium, 1 Low

## Accepted Findings Applied

| # | Finding | Severity | Applied To |
|---|---------|----------|------------|
| 11 | API key in URL query param | High | task-R6-01 (Bearer header for Google API) |
| 12 | Google API response format differs | Medium | task-R6-01 + task-R1-02 (provider-specific parser) |

## Rejected Findings

| # | Finding | Rationale |
|---|---------|-----------|
| 13 | Model name "gemma-4-31b-it" unverified | Verify when implementing, not a spec blocker |

## Confirmed Decisions
- Google API auth: `Authorization: Bearer {apiKey}` header (not `?key=` query param)
- Google response parsing: extract `candidates[0].content.parts[0].text` (different from OpenAI/Anthropic)
- Provider-specific response parser adapter in `lib/llm-analyze.ts`

## Impact on Tasks
- task-R6-01: 2 changes (Bearer header for test + integrate, Google response parser note)
- task-R1-02: 1 change (provider-specific response parsing in LLM endpoint)
