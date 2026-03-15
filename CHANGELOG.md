# Changelog

## [Unreleased] — Taak 41: CodeRabbit Audit Fixes

### Fixed (13 bevindingen uit CodeRabbit review)

#### Kritiek
- **answer-mapper.ts**: Template array mutatie gefixt — spread operator op ENTITY_FIELD_TEMPLATES
- **token-counter.ts**: Lazy encoder initialisatie met try/catch + char/4 fallback
- **chat/+server.ts + generate/+server.ts**: request.json() gewrapped in try/catch (400 ipv 500)

#### Security
- **gemini-client.ts**: API key verplaatst van URL query param naar x-goog-api-key header
- **hooks.server.ts**: HSTS header toegevoegd (Strict-Transport-Security)
- **sanitize.ts**: XML-tag escaping uitgebreid (prompt, context, user, input, document, source)
- **analyze-screenshot/+server.ts**: Image grootte limiet (10MB base64) + 30s timeout

#### Type Safety
- **answer-mapper.ts**: detectRevenueModel type hack verwijderd
- **wizard.svelte.ts**: Off-by-one in snapshots gefixt (50 ipv 49)
- **specialist-detection.ts**: Detectie resultaten gecached (geen dubbele berekeningen)

#### Stabiliteit
- **gemini-client.ts**: Timeout toegevoegd aan generateWithGemini (tekst, 30s)
- **rate-limiter.ts**: setInterval handle opgeslagen als export
- **generate/+server.ts**: audit logging ai-gemini fix + safeName cleanup
- **hooks.server.ts**: Redirect behoudt query parameters
