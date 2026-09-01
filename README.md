<div align="center">

# 🤖 dsh-local-ai
- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-local-ai` (counts toward the [deepseek1024.com](https://deepseek1024.com) install ranking).
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-local-ai)

**Local-model (Ollama) integration for DeepSeek Harness.**

*Discover, pull, remove, and inspect local models, route requests to them by task type or keyword with automatic fallback to the cloud, and get a one-shot status overview via `/ollama`.*

> **Official repository.** This is the only official repository of dsh-local-ai, maintained by PerryLink. Same-name repositories under other accounts are not affiliated.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-local-ai/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-local-ai/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-local-ai?label=version)](https://github.com/PerryLink/dsh-local-ai/releases)
[![npm version](https://img.shields.io/npm/v/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![npm downloads](https://img.shields.io/npm/dm/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Surface | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.2-alpha.3` (adapted 2026-09-01): the session envelope keeps its ignorable field for stored-log read compatibility only - Session.append still cannot stamp it, so audit-gate behavior is unchanged. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Backend | [Ollama](https://ollama.com) (local HTTP API + CLI probe) |
| Model | Text-only route (`inputModalities: ['text']`); tool calls and tool results are supported |

## What you get

`dsh-local-ai` makes Ollama a first-class local provider in DeepSeek Harness:

- **Discovery & management** — `ollama_list` (installed models, running models, disk usage), `ollama_show` (parameter size, quantization, context length), `ollama_pull`, and `ollama_remove`.
- **Health check** — process liveness (via the `ollama` CLI) and API responsiveness (via `/api/version`), reported as two independent signals.
- **Official adapter** — the `ollama` provider route is registered through `ctx.llm.registerAdapter` (`LlmAdapter`), with configurable model mapping and temperature / max-tokens / stop translation.
- **OpenAI-compatible backends** — LM Studio, vLLM, and llama.cpp `--server` each register as their own `openai:<name>` provider through the same `LlmAdapter` seam, reusing one OpenAI `/v1/chat/completions` adapter (text-only route).
- **Local routing** — `model_route` rules route requests to a local model by task type (`purpose`), case-insensitive keyword, or `always`, with automatic fallback to the cloud when the local route fails before producing content.
- **`/ollama` command** — a one-shot status overview: models, disk usage, health, and suggestions.
- **Zero dependencies, HTTP first** — everything talks to Ollama's HTTP API (the CLI is used only for the process probe); no model files are bundled.

```text
request (loop)
   │ llm/stream waterfall
   ├─ rule matches? ──▶ route to ollama ──▶ Ollama /api/chat (NDJSON stream)
   │              └─▶ route to openai:<name> ─▶ /v1/chat/completions (SSE)
   │                        └─ fails first ─▶ fall back to cloud (next())
   └─ no match ──▶ cloud provider
tools ──▶ /api/tags · /api/ps · /api/show · /api/pull · /api/delete
health ──▶ /api/version (API) + ollama list (process)
```

## Quick start

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-local-ai

# 2. configure routing in your profile patch (cordis.yml) and restart
dsh --profile web
```

Minimal routing configuration (the rule ships commented out in `cordis.patch.yml`):

```yaml
- insert:
    - id: dsh-local-ai
      name: dsh-local-ai
      config:
        route:
          - model: llama3.2
            keywords: ["confidential", "offline"]
```

Then verify the row mounts:

```sh
dsh --profile web --dump-config | grep -A2 'id: dsh-local-ai'
```

## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"` — the `prepare` script builds with production dependencies only.
- **npm channel** (published releases): `dsh plugin --profile web add dsh-local-ai`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-local-ai` (or remove the row from the profile patch).

> If pnpm reports `ERR_PNPM_IGNORED_BUILDS` for this package, add `allowBuilds: { esbuild: true }` to your `pnpm-workspace.yaml` — the `dsh` CLI prints the exact snippet.

## Configuration

All tunables are Schemastery `Config` fields (changeable from cordis.yml). An id-targeted override replaces the whole row — restate every key you need. `cordis.patch.yml` documents each key inline.

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:11434` | Ollama HTTP API base URL; `/api/*` paths are appended |
| `requestTimeoutMs` | `30000` | Per-request HTTP timeout (milliseconds) |
| `graceMs` | `15000` | Subprocess terminate grace for the health-check CLI probe |
| `defaultContextWindow` | `8192` | Context capacity used when a model has no exact value |
| `maxTokens` | `4096` | Per-request output cap used when a model has no exact value |
| `temperature` | *(none)* | Default sampling temperature (0..2); omitted leaves the provider default |
| `vision` | `true` | Declare and serialize image support when the model reports vision; `false` keeps the route text-only |
| `models` | `[]` | Harness-visible → Ollama model mappings |
| `models[].name` | *(required)* | Harness-visible model name (`GenerateOptions.model`) |
| `models[].model` | `= name` | Ollama model id |
| `models[].contextWindow` | *(none)* | Per-model context capacity |
| `models[].maxTokens` | *(none)* | Per-model output cap |
| `models[].temperature` | *(none)* | Per-model sampling temperature |
| `backends` | `[]` | OpenAI-compatible local backends (LM Studio / vLLM / llama.cpp) |
| `backends[].name` | *(required)* | Backend name; registers provider id `openai:<name>` |
| `backends[].baseURL` | *(required)* | Backend base URL including `/v1`, e.g. `http://127.0.0.1:1234/v1` |
| `backends[].apiKey` | *(none)* | Optional bearer API key (most local servers leave it empty) |
| `backends[].models` | `[]` | Harness-visible → backend model mappings |
| `backends[].maxTokens` | `4096` | Per-backend output cap used when a model has no exact value |
| `backends[].temperature` | *(none)* | Per-backend sampling temperature |
| `route` | `[]` | Local-model routing rules (first match wins) |
| `route[].model` | *(required)* | Target local model name |
| `route[].provider` | `ollama` | Target provider id: `ollama` or `openai:<name>` |
| `route[].purpose` | *(none)* | Task type match: `compaction` / `session-title` |
| `route[].keywords` | `[]` | Case-insensitive request keywords |
| `route[].always` | `false` | Route every eligible request to this model |

## Tools & surfaces

| Surface | Kind | What it does |
|---|---|---|
| `ollama_list` | tool | List installed models, running models, and disk usage |
| `ollama_show` | tool | Show parameter size, quantization, context length, family, format |
| `ollama_pull` | tool | Pull (download) a model |
| `ollama_remove` | tool | Remove a model |
| `ollama_health` | tool | Process liveness + API responsiveness |
| `/ollama` | command | One-shot status overview (models + health + suggestions) |

**Consumes** the public host services `ctx.llm` (`registerAdapter`), `ctx.tools`, `ctx.subprocess` (CLI probe), and `ctx.commands`. It registers no `llm/stream` short-circuit by default — the routing listener passes through (`next()`) unless a rule matches.

## Permissions & data

- **Permissions**: `network:outbound` to the Ollama endpoint you configure; no native code, no filesystem access, no storage.
- **Data**: every model list/detail, health fact, and error message shown to the model or the user is sanitized (endpoint userinfo and secret query params dropped, control characters stripped, lengths bounded) before display. Tool and command results are logged by the harness's own tool/command seams.
- **Credentials**: the plugin stores and reads no credentials. It only issues HTTP requests to the endpoint you configure, plus the local `ollama list` process probe.

## Security boundaries

- **No re-routing by default** — the `route` list is empty unless you opt in; a request reaches a local model only through an explicit rule or an explicit `ollama` provider selection.
- **Sanitize before display** — endpoint addresses and local paths are sanitized before they reach tool output, the `/ollama` command, or error messages.
- **Zero bundled models** — downloads and storage are Ollama's own responsibility; nothing is shipped in the package.
- **Failure loud, failure contained** — invalid config fails the mount; a local route that fails before producing content falls back to the cloud (`next()`), so a down Ollama never bricks a conversation.
- **Model-visible ⟺ logged** — routing only changes which provider serves a request (the assistant message is logged with its `ollama` provenance); no new model-visible input is invented.

## Known limitations

- **alpha.3** — developed and tested against `@deepseek-ai/dsh@0.1.2-alpha.3`; newer harness baselines are expected to work but are verified by the monthly compat workflow.
- **Vision when the model reports it** — models whose `/api/show` capabilities include `vision` declare `inputModalities: ["text","image"]` and carry base64 image payloads on user messages (opt out with `vision: false`); text-only models still reject image content (`UNSUPPORTED_CONTENT`).
- **Mid-stream fallback** — once a local route has started producing content, a later failure is forwarded (not retracted); only a failure before the first token falls back to the cloud.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests against the published 0.1.2-alpha.3 types
pnpm run typecheck:ci  # strict tsc against published rc.2 types (skipLibCheck off)
pnpm test           # vitest: real Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess seams
pnpm run test:coverage  # coverage gate (90/80/90/90)
pnpm run build      # tsdown bundle + tsc declarations (lib/)
pnpm run verify:self-contained  # dependency specs resolve from the registry
pnpm run verify:artifacts       # built ESM face + bundle patch present
node scripts/check-readme-sync.mjs  # five-language README sync gate
node scripts/check-endpoints.mjs  # M3 endpoint-liveness probe (Ollama /api/version)
pnpm pack           # the published tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: adapter, routing, tools, health check, sanitization, and the five-language docs.
- [@LABEST-IA](https://github.com/LABEST-IA) — tool-call CallId fix (PR #2), and the tool-call slot and vision-support reports (issues #1, #3, #5).

## PerryLink DSH Plugin Family

This project is one of the [33 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors
