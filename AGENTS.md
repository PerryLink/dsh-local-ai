# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-local-ai`): local-model
(Ollama) integration. Development follows the dsh-plugin-guide skill and the
official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export — the Loader unwraps `exports.default ?? exports`). Injects `llm`, `tools`, `subprocess`, `commands`. `apply` resolves config (fail loud), registers the `OllamaAdapter` under the `ollama` provider, installs the `llm/stream` routing waterfall, registers five tools, and registers the `/ollama` command. Every contribution goes through `register()`/`on()`, each of which is a Cordis effect, so stop/HMR withdraws all of it.
- `src/config.ts` — Schemastery schema plus an explicit `resolveConfig` (no hidden `?? default` in `run()` paths). URL normalization, numeric bounds, duplicate model names, and rule-less routes all fail loud at mount.
- `src/adapter.ts` — `OllamaAdapter extends LlmAdapter`: `providerInfo`/`listModels`/`resolveModel` metadata, and `stream()` over Ollama's native `/api/chat` NDJSON, wrapped by an idle watchdog (`@deepseek-ai/dsh-timeout`).
- `src/serialize.ts` — harness `Message` → Ollama wire messages: text joins, tool calls parse to objects, tool results become `role: 'tool'` messages with a resolved tool name; images are rejected (text-only route).
- `src/translate.ts` — Ollama NDJSON → `StreamChunk`: incremental text/reasoning deltas, cumulative tool-call arguments diffed by longest-common-prefix, usage + finish deferred to `done`.
- `src/ollama.ts` — zero-dependency HTTP client (`fetch`): `/api/tags`, `/api/ps`, `/api/show`, `/api/pull`, `/api/delete`, `/api/version`, and the streaming `/api/chat` POST. `fetch` is injectable for tests.
- `src/health.ts` — API health (HTTP `/api/version`) and process health (the `ollama list` CLI probe through the real `ctx.subprocess`), as two independent signals.
- `src/route.ts` — pure routing decision (`purpose` / keyword / `always`, first match wins) plus the streaming `routeLocal` helper with automatic cloud fallback.
- `src/sanitize.ts` — display/log sanitization (pure functions): endpoint userinfo/secret-query redaction, path home-directory redaction, control-character stripping, length bounds.
- `scripts/` — `prepare.mjs` (build), `verify-self-contained.mjs`, `verify-artifacts.mjs`, `check-readme-sync.mjs` (five-language gate), `release.mjs` (bump + stamp + gates + commit + tag, never pushes), `changelog-section.mjs`.
- `test/` — vitest; REAL `Context`/`LlmRuntime`/`SystemPrompt`+`ToolRuntime`/`CommandRuntime`/local subprocess from the 0.1.2-alpha.3 peers. Only the network edge (global `fetch`) is scripted.

## Hard rules applied here

- **No re-routing by default.** The `route` list is empty unless configured; a request reaches a local model only through an explicit rule or an explicit `ollama` provider selection.
- **Zero dependency, HTTP first.** The plugin talks to Ollama over its HTTP API; the CLI is used only for the process-liveness probe. No model files are bundled.
- **Sanitize before display.** Endpoint addresses and local paths are sanitized before they reach tool output, the `/ollama` command, or error messages.
- **Model-visible ⟺ logged.** Routing changes only which provider serves a request (the assistant message is logged with its `ollama` provenance); tool results and command results are logged by the tool/command seams. This plugin adds no new model-visible input, so it declares no `SessionEventMap` entries.
- **Failure loud, failure contained.** Invalid config fails the mount. A local route that fails before producing content falls back to the cloud (`next()`); once local content has started, it is forwarded (a mid-stream failure cannot be retracted). The `/ollama` overview is best-effort and never throws on a down server.
- **No hardcoded tunables.** Every knob is a validated `Config` field with a default in `src/config.ts`, an inline comment in `cordis.patch.yml`, and a row in the five-language README configuration table.
- **Waterfall listeners call `next()`.** The `llm/stream` listener calls `next()` both for passthrough and for the cloud fallback; it short-circuits only when a local route is actually serving.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run test:coverage && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && node scripts/check-readme-sync.mjs && pnpm pack`

- `typecheck` checks `src` + `test` against the published 0.1.2-alpha.3 types; `typecheck:ci` clears `skipLibCheck` and adds `verbatimModuleSyntax` for the strict published-types pass. Both must stay green — the package ships against alpha.3.
- `test:coverage` gates at 90/80/90/90 (statements/branches/functions/lines), `src/index.ts` excluded.

## Release

`node scripts/release.mjs <x.y.z>` bumps package.json + `src/version.ts`, stamps the CHANGELOG `[Unreleased]` section, re-runs the full gate, and commits + tags (never pushes). `git push origin main --follow-tags` triggers `.github/workflows/release.yml`, which re-runs the gate, publishes to npm with provenance, and creates the GitHub Release from the stamped CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth. `scripts/check-readme-sync.mjs` (CI) enforces section structure and configuration-table keys.
- GitHub topics mirror `package.json` keywords: `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing` (the ecosystem's visibility channel is the `dsh-plugin` topic).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). `THIRD_PARTY_NOTICES.md` documents the build-time dependencies.
