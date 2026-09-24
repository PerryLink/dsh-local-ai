<div align="center">

# 🤖 dsh-local-ai
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-local-ai` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Integração de modelos locais (Ollama) para o DeepSeek Harness.**

*Descubra, baixe, remova e inspecione modelos locais, roteie solicitações para eles por tipo de tarefa ou palavra-chave com fallback automático para a nuvem e obtenha um resumo de status de relance com `/ollama`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-local-ai)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-local-ai.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-local-ai/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-local-ai/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-local-ai?label=version)](https://github.com/PerryLink/dsh-local-ai/releases)
[![npm version](https://img.shields.io/npm/v/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![npm downloads](https://img.shields.io/npm/dm/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-local-ai?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-local-ai?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

<!-- star-cta -->
## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se ele for útil, **deixe uma estrela**: ela não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## Compatibility

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-rc.1` (verificado em 2026-09-24: typecheck triplo (instalado, CI, checkout) + 142 testes + portas self-contained/artifacts; a união de blocos de conteúdo de `0.1.7` está adaptada — um resultado de ferramenta agora é uma mensagem de papel `tool` de primeira classe, e um envelope `tool-result` anterior a `0.1.7` ainda é lido para registros antigos). O intervalo de peers admite todas as linhas suportadas: `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`; os pins dev/test são `0.1.7-rc.1`. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Backend | [Ollama](https://ollama.com) (API HTTP local + sonda CLI) |
| Modelo | Rota somente texto (`inputModalities: ['text']`); chamadas e resultados de ferramentas são suportados |

## What you get

O `dsh-local-ai` torna o Ollama um provedor local de primeira classe no DeepSeek Harness:

- **Descoberta e gestão** — `ollama_list` (modelos instalados, em execução, uso de disco), `ollama_show` (tamanho de parâmetros, quantização, comprimento de contexto), `ollama_pull` e `ollama_remove`.
- **Verificação de saúde** — vitalidade do processo (via CLI `ollama`) e resposta da API (via `/api/version`), como dois sinais independentes.
- **Adaptador oficial** — a rota do provedor `ollama` é registrada por `ctx.llm.registerAdapter` (`LlmAdapter`), com mapeamento de modelos configurável e tradução de temperature / max-tokens / stop.
- **Roteamento local** — regras `model_route` roteiam solicitações para um modelo local por tipo de tarefa (`purpose`), palavra-chave (sem diferenciar maiúsculas) ou `always`, com fallback automático para a nuvem quando a rota local falha antes de produzir conteúdo.
- **Comando `/ollama`** — resumo de status de relance: modelos, uso de disco, saúde e sugestões.
- **Zero dependências, HTTP primeiro** — tudo fala com a API HTTP do Ollama (a CLI só é usada para a sonda de processo); nenhum arquivo de modelo é empacotado.

```text
request (loop)
   │ cascata llm/stream
   ├─ regra corresponde? ──▶ rotear para ollama ──▶ Ollama /api/chat (fluxo NDJSON)
   │                        └─ falha primeiro ─▶ fallback para nuvem (next())
   └─ sem correspondência ──▶ provedor na nuvem
tools ──▶ /api/tags · /api/ps · /api/show · /api/pull · /api/delete
health ──▶ /api/version (API) + ollama list (processo)
```

## Quick start

```sh
# 1. instale o bundle no seu perfil
dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"

# ou do npm (versões publicadas)
dsh plugin --profile web add dsh-local-ai

# 2. configure o roteamento no seu patch de perfil (cordis.yml) e reinicie
dsh --profile web
```

Configuração mínima de roteamento (a regra vem comentada em `cordis.patch.yml`):

```yaml
- insert:
    - id: dsh-local-ai
      name: dsh-local-ai
      config:
        route:
          - model: llama3.2
            keywords: ["confidential", "offline"]
```

Depois verifique se a linha monta:

```sh
dsh --profile web --dump-config | grep -A2 'id: dsh-local-ai'
```

## Install & uninstall

- **canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"` — o script `prepare` compila apenas com dependências de produção.
- **canal npm** (versões publicadas): `dsh plugin --profile web add dsh-local-ai`.
- **canal tarball**: `pnpm pack` neste repo e depois `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-local-ai` (ou remova a linha do patch do perfil).

> Se o pnpm relatar `ERR_PNPM_IGNORED_BUILDS` para este pacote, adicione `allowBuilds: { esbuild: true }` ao seu `pnpm-workspace.yaml` — a CLI `dsh` imprime o trecho exato.

## Configuration

Todos os ajustes são campos `Config` de Schemastery (modificáveis pelo cordis.yml). Uma sobrescrita por id substitui a linha inteira — repita cada chave de que precisa. O `cordis.patch.yml` documenta cada chave em linha.

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:11434` | URL base da API HTTP do Ollama; caminhos `/api/*` são anexados |
| `requestTimeoutMs` | `30000` | Tempo limite HTTP por solicitação (milissegundos) |
| `graceMs` | `15000` | Graça de término do subprocesso para a sonda CLI de saúde |
| `defaultContextWindow` | `8192` | Capacidade de contexto quando um modelo não tem valor exato |
| `maxTokens` | `4096` | Limite de saída por solicitação quando um modelo não tem valor exato |
| `temperature` | *(none)* | Temperatura de amostragem padrão (0..2); omitir mantém o padrão do provedor |
| `vision` | `true` | Declara e serializa o suporte a imagens quando o modelo informa vision; `false` mantém a rota somente texto |
| `visionCacheTtlMs` | `30000` | Milissegundos em que a sondagem `/api/show` fica em cache (`0` desativa; pull/remove invalida esse modelo) |
| `models` | `[]` | Mapeamentos nome visível → modelo Ollama |
| `models[].name` | *(required)* | Nome de modelo visível no harness (`GenerateOptions.model`) |
| `models[].model` | `= name` | Id do modelo Ollama |
| `models[].contextWindow` | *(none)* | Capacidade de contexto por modelo |
| `models[].maxTokens` | *(none)* | Limite de saída por modelo |
| `models[].temperature` | *(none)* | Temperatura de amostragem por modelo |
| `backends` | `[]` | Backends locais compatíveis com OpenAI (LM Studio / vLLM / llama.cpp) |
| `backends[].name` | *(required)* | Nome do backend; registra o id de provedor `openai:<name>` |
| `backends[].baseURL` | *(required)* | URL base do backend (inclui `/v1`), ex. `http://127.0.0.1:1234/v1` |
| `backends[].apiKey` | *(none)* | Chave bearer opcional (a maioria dos servidores locais deixa vazia) |
| `backends[].models` | `[]` | Mapeamentos de nome visível → modelo do backend |
| `backends[].maxTokens` | `4096` | Limite de saída por backend quando um modelo não tem valor exato |
| `backends[].temperature` | *(none)* | Temperatura de amostragem por backend |
| `route` | `[]` | Regras de roteamento para modelos locais (primeira correspondência vence) |
| `route[].model` | *(required)* | Nome do modelo local de destino |
| `route[].provider` | `ollama` | Id do provedor de destino: `ollama` ou `openai:<name>` |
| `route[].purpose` | *(none)* | Correspondência de tipo de tarefa: `compaction` / `session-title` |
| `route[].keywords` | `[]` | Palavras-chave da solicitação (sem diferenciar maiúsculas) |
| `route[].always` | `false` | Roteia toda solicitação elegível para este modelo |

## Tools & surfaces

| Superfície | Tipo | O que faz |
|---|---|---|
| `ollama_list` | ferramenta | Lista modelos instalados, em execução e uso de disco |
| `ollama_show` | ferramenta | Mostra tamanho de parâmetros, quantização, comprimento de contexto, família, formato |
| `ollama_pull` | ferramenta | Baixa um modelo |
| `ollama_remove` | ferramenta | Remove um modelo |
| `ollama_health` | ferramenta | Vitalidade do processo + resposta da API |
| `/ollama` | comando | Resumo de status de relance (modelos + saúde + sugestões) |

**Consome** os serviços host públicos `ctx.llm` (`registerAdapter`), `ctx.tools`, `ctx.subprocess` (sonda CLI) e `ctx.commands`. Não curto-circuita `llm/stream` por padrão — o ouvinte de roteamento repassa (`next()`) salvo quando uma regra corresponde.

## Permissions & data

- **Permissões**: `network:outbound` para o endpoint Ollama que você configurar; sem código nativo, sem acesso ao sistema de arquivos, sem armazenamento.
- **Dados**: toda lista/detalhe de modelo, fato de saúde e mensagem de erro exibidos ao modelo ou ao usuário são sanitizados (userinfo e parâmetros de consulta secretos do endpoint removidos, caracteres de controle removidos, comprimentos limitados) antes da exibição. Resultados de ferramentas e comandos são registrados pelos mecanismos próprios do harness.
- **Credenciais**: o plugin não armazena nem lê credenciais. Ele apenas emite solicitações HTTP ao endpoint que você configurar, além da sonda de processo local `ollama list`.

## Security boundaries

- **Sem re-roteamento por padrão** — a lista `route` fica vazia salvo se você optar; uma solicitação chega a um modelo local apenas por uma regra explícita ou seleção explícita do provedor `ollama`.
- **Sanitização antes de exibir** — endereços de endpoint e caminhos locais são sanitizados antes de chegar à saída de ferramentas, ao comando `/ollama` ou a mensagens de erro.
- **Zero modelos empacotados** — downloads e armazenamento são responsabilidade do Ollama; nada é enviado no pacote.
- **Falha alta, falha contida** — configuração inválida faz o montagem falhar; uma rota local que falha antes de produzir conteúdo faz fallback para a nuvem (`next()`), de modo que um Ollama caído nunca trava uma conversa. **Única exceção:** uma falha com `IMAGE_OFFLOAD_REQUIRED` é relançada em vez de repetida na nuvem — esse código é o circuito oficial de descarga de imagens pedindo a esta mesma rota local que libere imagens retidas, e o fallback pularia o circuito enviando em silêncio uma solicitação somente-local a um provedor remoto.
- **Visível ao modelo ⟺ registrado** — o roteamento só muda qual provedor atende uma solicitação (a mensagem do assistente é registrada com sua proveniência `ollama`); nenhuma entrada visível nova é inventada.

## Known limitations

- **npm 0.1.5-rc.2** — desenvolvido e testado contra `@deepseek-ai/dsh@0.1.5-rc.2`; espera-se que baselines mais novos funcionem, mas são verificados pelo workflow mensal de compat.
- **Vision quando o modelo a informa** — modelos cujas capacidades de `/api/show` incluem `vision` declaram `inputModalities: ["text","image"]` e carregam payloads de imagem base64 nas mensagens do usuário (desative com `vision: false`); modelos somente texto continuam rejeitando conteúdo de imagem (`UNSUPPORTED_CONTENT`).
- **Fallback no meio do fluxo** — uma vez que uma rota local começou a produzir conteúdo, uma falha posterior é reencaminhada (não retirada); apenas uma falha antes do primeiro token faz fallback para a nuvem.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + testes contra os tipos publicados 0.1.5-rc.2
pnpm run typecheck:ci  # tsc estrito contra os tipos publicados rc.2 (skipLibCheck off)
pnpm test           # vitest: costuras reais Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess
pnpm run test:coverage  # porta de cobertura (90/80/90/90)
pnpm run build      # bundle tsdown + declarações tsc (lib/)
pnpm run verify:self-contained  # especificações de dependências resolvem do registry
pnpm run verify:artifacts       # face ESM construída + bundle patch presentes
node scripts/check-readme-sync.mjs  # porta de sincronização de README em cinco idiomas
node scripts/check-endpoints.mjs  # sonda de atividade M3 (Ollama /api/version)
pnpm pack           # o tarball publicado
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: adaptador, roteamento, ferramentas, verificação de saúde, sanitização e documentação em cinco idiomas.
- [@LABEST-IA](https://github.com/LABEST-IA) — correção do CallId de chamadas de ferramenta (PR #2), e os relatórios sobre o slot de chamadas de ferramenta e o suporte a visão (issues #1, #3, #5).

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
