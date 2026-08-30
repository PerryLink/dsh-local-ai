# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Stop importing the `CallId` runtime value from `@deepseek-ai/dsh-llm` (removed in DeepSeek Harness `0.1.2-alpha.1`; renamed `ToolCallId`): tool-call ids are now minted through a local identity helper typed from the `@deepseek-ai/dsh-tools` execution contract, so the published bundle stays compatible with both release lines.

## [0.2.0] - 2026-08-26

### Added

- OpenAI-compatible multi-backend provider (LM Studio / vLLM / llama.cpp) with route-provider routing.

## [0.1.5] - 2026-08-23

### Added

- Endpoint liveness (M3): `scripts/check-endpoints.mjs` probes the configured Ollama HTTP endpoint (`/api/version`; 2xx = alive, any transport error or non-2xx = fail) with `OLLAMA_HOST` / `CHECK_ENDPOINTS` / `TIMEOUT_MS` overrides, and `.github/workflows/check-endpoints.yml` runs it monthly and on demand against a throwaway local Ollama; `test/check-endpoints.spec.ts` covers the endpoint-resolution, verdict, error-classification, and timeout helpers plus a plain-Node syntax check.

## [0.1.4] - 2026-08-22

### Added

- **Vision support (issue #5)** — models whose `/api/show` capabilities include `vision` now declare `inputModalities: ['text', 'image']` and carry base64 image payloads on user messages (resolved through the optional `attachments` service); the `vision` config knob (default `true`) keeps the route text-only on opt-out, and text-only models still reject image content loudly (`UNSUPPORTED_CONTENT`).


### Changed

- Upgraded every `@deepseek-ai/dsh-*` dev dependency from `0.1.0-rc.8` to `0.1.1-rc.2` for DeepSeek Harness `0.1.1-rc.2` compatibility. Peer ranges stay `>=0.1.0-rc.8 <0.2.0`: no adapter, routing, tool, or command code uses an rc2-only API.
- Repinned `minimumReleaseAgeExclude` to the whole `@deepseek-ai/*` scope and synchronized the `0.1.1-rc.2` baseline across the five-language READMEs, AGENTS.md, THIRD_PARTY_NOTICES.md, the CI workflow name, and the compat workflow.

## [0.1.3] - 2026-08-21

### Changed

- Upgraded every `@deepseek-ai/dsh-*` peer and dev dependency from `0.1.0-rc.6` to `0.1.0-rc.8` (peer ranges now `>=0.1.0-rc.8 <0.2.0`) for DeepSeek Harness rc8 compatibility; no adapter, routing, or tool API changes were required.
- Workspace build policy: allowed the `koffi` native build (introduced by the rc8 `dsh-subprocess-local` dependency chain) and repinned `minimumReleaseAgeExclude` to the rc.8 peer family.
- Synchronized rc.8 baseline references across the five-language READMEs, AGENTS.md, THIRD_PARTY_NOTICES.md, the CI workflow name, and the compat workflow baseline.
- Merged the 0.1.2 bug-fix line (tool-call id minting and slot-reuse block handling) so this release carries both fixes.

## [0.1.2] - 2026-08-20

### Fixed

- Tool calls are emitted with a minted `CallId` instead of an empty one. Ollama's `/api/chat` wire format carries no tool-call id, so `OpenBlock.callId` was never assigned and both the `tool-call-delta` chunks and the closed block ended up as `CallId('')`. Live turns still paired the call with its result positionally, but the persisted `tool/result` carried an empty `source.callId` and the session failed validation on resume (`message must have tool source`).
- A tool-call array slot reused for a second, unrelated call now opens its own block instead of being diffed as a continuation. Ollama can reuse the same slot across chunks, and the longest-common-prefix diff previously emitted a fragment that reconstructed into invalid JSON while collapsing the two calls into one block.

## [0.1.1] - 2026-08-19

### Fixed

- The adapter's streaming `request()` catch re-threw normalized `LlmError`s (HTTP_401/NOT_FOUND) instead of rewrapping them as `TRANSPORT`, so authentication and missing-model failures keep their status code instead of degrading to a generic transport error.

### Added

- Loader-composition, lifecycle (fiber-dispose), and sealed fake-server suites; lint gate in CI; declaration specifier rewrite for NodeNext consumers.

## [0.1.0] - 2026-08-17

### Added

- `ollama_list` / `ollama_show` / `ollama_pull` / `ollama_remove` tools plus a health check (process liveness and API responsiveness) over the Ollama HTTP API and the real subprocess seam.
- `OllamaAdapter` registered under the `ollama` provider route, with configurable model mapping and temperature / max-tokens / stop translation.
- `model_route` rules (task type via `purpose`, case-insensitive keywords, or `always`) that route requests to local models with automatic fallback to the cloud when the local route fails before producing content.
- `/ollama` one-shot status command (models, disk usage, health, suggestions).
- Display/log sanitization for endpoint addresses and local paths.
- Five-language README, CI / compat / release workflows, and the full gate (typecheck, test, build, verify, pack).
