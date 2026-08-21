# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-08-21

### Changed

- Upgraded every `@deepseek-ai/dsh-*` peer and dev dependency from `0.1.0-rc.6` to `0.1.0-rc.8` (peer ranges now `>=0.1.0-rc.8 <0.2.0`) for DeepSeek Harness rc8 compatibility; no adapter, routing, or tool API changes were required.
- Workspace build policy: allowed the `koffi` native build (introduced by the rc8 `dsh-subprocess-local` dependency chain) and repinned `minimumReleaseAgeExclude` to the rc.8 peer family.
- Synchronized rc.8 baseline references across the five-language READMEs, AGENTS.md, THIRD_PARTY_NOTICES.md, the CI workflow name, and the compat workflow baseline.

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
