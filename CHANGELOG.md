# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Tool calls are emitted with a minted `CallId` instead of an empty one. Ollama's `/api/chat` wire format carries no tool-call id, so `OpenBlock.callId` was never assigned and both the `tool-call-delta` chunks and the closed block ended up as `CallId('')`. Live turns still paired the call with its result positionally, but the persisted `tool/result` carried an empty `source.callId` and the session failed validation on resume (`message must have tool source`).

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
