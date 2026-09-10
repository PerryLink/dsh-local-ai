# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for this package too (measured on 15/15 sampled packages of the family). The new names sit outside the glob, so the English source is served again. No content changed apart from the language-switcher link each translation holds to its siblings, and the repo readme gate still passes. Takes effect with the next release; an already-published version cannot gain a corrected readme retroactively.

### Fixed

- The release workflow claimed provenance but never passed the flag: it runs `npm publish --access public`, and npm only attests a token-based publish when `--provenance` is given explicitly. The publish step is now `npm publish --access public --provenance`, matching `dsh-github` and `dsh-plugin-guide`. Takes effect from the next release; an already-published version cannot gain attestations retroactively.
## [0.2.9] - 2026-09-10

### Fixed

- The monthly **Endpoint liveness** workflow never probed anything: `actions/setup-node@v5`
  auto-enables package-manager caching from `package.json#packageManager` (pnpm here), so the
  step failed with `Unable to locate executable file: pnpm` and the probe step was skipped on
  every scheduled run (observed on the 2026-09-01 run). The job only runs `node`, so the
  automatic cache is now disabled with `package-manager-cache: false` instead of installing a
  package manager it does not use.

## [0.2.8] - 2026-09-10

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.2.7] - 2026-09-09

### Changed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` and pin the dev/test dependencies to the published `0.1.5-alpha.1` line: adaptation to DeepSeek Harness `dsh-v0.1.5-alpha.1` (session format V3, `ctx.agent` removal, `Inbox` type-only interface); runtime behavior is unchanged for every supported host line.
- Record `0.1.5-alpha.1` in `dshWorkshop.compatibility.dshVersions`.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-alpha.1` (verified 2026-09-09).

## [0.2.6] - 2026-09-07

### Docs

- Fix the DSH plugin badge URL: shields.io rejects the four-segment static badge form with "404 badge not found"; the label now uses the documented double-dash form (`dsh--plugin`), rendering identically; no behavior change.

## [0.2.5] - 2026-09-07

### Fixed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0`: the older `>=0.1.0-rc.8 <0.2.0` band resolved to only the `0.1.0-rc.8` prerelease under registry-driven resolution and broke fresh tarball installs; no behavior change.

### Docs

- Refresh the five-language README support-version wording: the verified GitHub tag `dsh-v0.1.3-alpha.1` now leads the compatibility claim, while npm `0.1.2-rc.1` stays the published dependency-pin line (peers `>=0.1.2-rc.1 <0.2.0`); no behavior change.


## [0.2.4] - 2026-09-04

### Changed

- Align the devDependency pins to the published dsh `0.1.2-rc.1` line (10 `@deepseek-ai/dsh-*` packages), the `dshWorkshop` compatibility list, and the compat/CI probes; the five-language READMEs record the rc.1 facts. No behavior change (the seam re-check on the 0.1.3-alpha.1 checkout found no consumer-facing break; `llm` stream/type faces are additive only).

## [0.2.3] - 2026-09-02

### Changed

- Align the devDependency pins to the published dsh 0.1.2-alpha.5 line and re-verify the adaptation claims; no behavior change.

## [0.2.2] - 2026-09-01

### Changed

- Upgrade the `@deepseek-ai/dsh-*` dev dependencies from `0.1.2-alpha.2` to `0.1.2-alpha.3` (peer ranges stay `>=0.1.0-rc.8 <0.2.0`), align the `@deepseek-ai/cordis` / `@deepseek-ai/schemastery` carets to `^4.0.2` / `^3.18.2`, and refresh `dshWorkshop.compatibility.dshVersions` and the five-language README adaptation notes to `0.1.2-alpha.3`.

## [0.2.1] - 2026-08-30

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
