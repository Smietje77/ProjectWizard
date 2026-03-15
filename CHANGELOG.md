# Changelog

All notable changes to ProjectWizard will be documented in this file.

## [Unreleased] — Fase 6

### Added
- Product-strategische wizard categorieën (merk, business, lancering)
- Dynamische "3 suggesties" patroon in coordinator
- PRODUCT-VISION.md generatie (conditioneel)
- STITCH-PROMPT.txt voor Google Stitch UI preview
- Gemini API multi-model (design skills via Gemini 2.5 Flash)
- Nano Banana 2 image assets (mockup, OG image, favicon)
- SEO specialist + skill generatie voor publieke websites
- Design presets (VoltFlow, Clean Pro, Warm Craft)
- CodeRabbit config in gegenereerde project output
- `.coderabbit.yaml` voor ProjectWizard zelf

### Changed
- Coordinator prompt: dynamische suggesties i.p.v. hardcoded opties
- Design skill: preset-gebaseerde concrete tokens
- FileSource type uitgebreid met 'ai-gemini'
- GeneratedFile type uitgebreid met binary support

## [1.0.0] — Fase 1-5 (Code Audit)

### Added
- Zod runtime validatie (coordinator + critic responses)
- Rate limiting (20/min chat, 5/min generate, 10/min screenshots)
- Token counting + circuit breaker (js-tiktoken, 150K limiet)
- Input sanitization (prompt injection preventie)
- Base64 image magic bytes validatie
- Soft-delete voor projecten (deleted_at)
- Audit logging (audit_log tabel)
- Structured logging met request IDs
- Project snapshots voor undo
- 223+ unit tests, 4 E2E test specs

### Fixed
- Supabase SSR client i.p.v. service role in API routes
- rebuildCategories() diepte-verlies
- is_complete dual-source inconsistentie
- SSE stream buffer incomplete line handling
- setTimeout memory leaks
