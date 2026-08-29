<div align="center">

# 🤖 dsh-local-ai
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-local-ai` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Integração de modelos locais (Ollama) para o DeepSeek Harness.**

*Descubra, baixe, remova e inspecione modelos locais, roteie solicitações para eles por tipo de tarefa ou palavra-chave com fallback automático para a nuvem e obtenha um resumo de status de relance com `/ollama`.*

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

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
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
- **Falha alta, falha contida** — configuração inválida faz o montagem falhar; uma rota local que falha antes de produzir conteúdo faz fallback para a nuvem (`next()`), de modo que um Ollama caído nunca trava uma conversa.
- **Visível ao modelo ⟺ registrado** — o roteamento só muda qual provedor atende uma solicitação (a mensagem do assistente é registrada com sua proveniência `ollama`); nenhuma entrada visível nova é inventada.

## Known limitations

- **Somente rc.2** — desenvolvido e testado contra `@deepseek-ai/dsh@0.1.1-rc.2`; espera-se que baselines mais novos funcionem, mas são verificados pelo workflow mensal de compat.
- **Vision quando o modelo a informa** — modelos cujas capacidades de `/api/show` incluem `vision` declaram `inputModalities: ["text","image"]` e carregam payloads de imagem base64 nas mensagens do usuário (desative com `vision: false`); modelos somente texto continuam rejeitando conteúdo de imagem (`UNSUPPORTED_CONTENT`).
- **Fallback no meio do fluxo** — uma vez que uma rota local começou a produzir conteúdo, uma falha posterior é reencaminhada (não retirada); apenas uma falha antes do primeiro token faz fallback para a nuvem.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + testes contra os tipos publicados 0.1.1-rc.2
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

Este projeto é um dos [29 complementos do DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também ajudarão:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Auto-revisão com segundo modelo na cadeia de aprovação, falha fechada por padrão |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes filhos em segundo plano e duráveis com barra lateral Web, mensagens e interrupção |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações e restauração de uma vez |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sessões, memória, skills e CLAUDE.md do Claude Code para o DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guarda de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de desempenho somente leitura para DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integração de PR/issues do GitHub para DSH, toda escrita com aprovação |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Base de conhecimento documental local para DeepSeek Harness. |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formatação, completação, ações e renomeação LSP via servidores de linguagem |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de mascaramento de PII para DeepSeek Harness — anonimiza antes do modelo e restaura na camada de exibição. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Painel MCP somente leitura: comando /mcp + aba de configurações com status, ferramentas e erros |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memória entre sessões com porta de aprovação: seam ctx.memory + SQLite + ferramenta memory |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Troca de estilos em tempo de execução equivalente ao outputStyles do Claude Code |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Regras declarativas allow/deny/ask estilo Claude Code com auditoria |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conhecimento de desenvolvimento de plugins como skill de agente sob demanda |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Pontuação de qualidade multidimensional para plugins do DeepSeek Harness. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Fixa sessões na barra lateral Web com ordenação durável |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Pacote de skills de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Testes isolados de instalação e inicialização para plugins do DeepSeek Harness. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors
