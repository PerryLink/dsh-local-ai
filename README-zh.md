<div align="center">

# 🤖 dsh-local-ai
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-local-ai`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**DeepSeek Harness 的本地模型（Ollama）接入。**

*发现、拉取、删除、查看本地模型，按任务类型或关键词把请求分流到本地模型并在失败时自动回退云端，通过 `/ollama` 一键查看状态总览。*

> **官方仓库。** 本仓库是 dsh-local-ai 的唯一官方仓库，由 PerryLink 维护。其他账号下的同名仓库与本项目无关。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-local-ai)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-local-ai.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-local-ai/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-local-ai/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-local-ai?label=version)](https://github.com/PerryLink/dsh-local-ai/releases)
[![npm version](https://img.shields.io/npm/v/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![npm downloads](https://img.shields.io/npm/dm/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-local-ai?metric=downloads&lang=zh)](https://dshfind.com/zh/plugins/PerryLink/dsh-local-ai?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-local-ai
```


</div>

---

**📖 生态实测知识库**（实测数据，不是营销）：[插件开发指南 · 选型实测数据 · 维护取舍判据](https://perrylink.github.io/dsh-plugin-guide/)。

<!-- star-cta -->
## Install & uninstall

- **git 通道**（最新 `main`）：`dsh plugin --profile web add github:PerryLink/dsh-local-ai` —— `prepare` 脚本只使用生产依赖构建。
- **npm 通道**（正式发布版）：`dsh plugin --profile web add dsh-local-ai`。
- **tarball 通道**：在本仓库 `pnpm pack`，然后 `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-local-ai`（或从 profile patch 移除该 row）。

> 如果 pnpm 对本包报告 `ERR_PNPM_IGNORED_BUILDS`，请在 `pnpm-workspace.yaml` 里加 `allowBuilds: { esbuild: true }` —— `dsh` CLI 会打印精确片段。

## ⭐ 如果它帮到了你

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（40+ 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-local-ai?

DeepSeek Harness 的本地模型（Ollama）接入。

发现、拉取、删除、查看本地模型，按任务类型或关键词把请求分流到本地模型并在失败时自动回退云端，通过 `/ollama` 一键查看状态总览。

![dsh-local-ai 终端演示：dsh-local-ai — install, then route by keyword to Ollama](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-hero.png)

![Animated terminal demo of dsh-local-ai](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-demo.gif)

*同一次运行，动图版。*

## Compatibility

| 项目 | 状态 |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1`（2026-10-04 核验：三把 typecheck 尺子（已装包、CI、checkout）+ 142 项测试 + self-contained/artifacts 门；已适配 `0.1.7` 的内容块联合 —— 工具结果现为一等 `tool` 角色消息，旧日志里的 `tool-result` 包裹块仍可读取）。peer 范围接纳全部受支持线：`>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0 \|\| >=0.2.0-0 <0.3.0 \|\| >=0.2.1-0 <0.3.0`；dev/test 钉号 `0.2.0-rc.2`。 |
| Node | `^22.19.0 \|\| >=24.0.0` |
| 后端 | [Ollama](https://ollama.com)（本地 HTTP API + CLI 探测） |
| 模型 | 纯文本路由（`inputModalities: ['text']`）；支持工具调用与工具结果 |

## What you get

`dsh-local-ai` 让 Ollama 成为 DeepSeek Harness 的一等本地模型提供方：

- **发现与管理** — `ollama_list`（已安装模型 / 运行中 / 磁盘占用）、`ollama_show`（参数尺寸、量化、上下文长度）、`ollama_pull`、`ollama_remove`。
- **健康检查** — 进程存活（经 `ollama` CLI）与 API 响应（经 `/api/version`），作为两个独立信号报告。
- **官方适配器** — 通过 `ctx.llm.registerAdapter`（`LlmAdapter`）注册 `ollama` 提供方路由，支持配置模型映射与 temperature / max-tokens / stop 参数翻译。
- **本地路由** — `model_route` 规则按任务类型（`purpose`）、不区分大小写的关键词或 `always` 分流到本地模型，本地路由在产出内容前失败时自动回退云端。
- **`/ollama` 命令** — 一键状态总览：模型、磁盘占用、健康、建议。
- **零依赖、HTTP 优先** — 一切走 Ollama HTTP API（CLI 仅用于进程探测）；不捆绑模型文件。

```text
request (loop)
   │ llm/stream 瀑布
   ├─ 命中规则? ──▶ 路由到 ollama ──▶ Ollama /api/chat（NDJSON 流）
   │                        └─ 先失败 ─▶ 回退云端（next()）
   └─ 未命中 ──▶ 云端提供方
tools ──▶ /api/tags · /api/ps · /api/show · /api/pull · /api/delete
health ──▶ /api/version（API）+ ollama list（进程）
```

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-local-ai
```

```sh
# 1. 把 bundle 安装进你的 profile
dsh plugin --profile web add github:PerryLink/dsh-local-ai

# 或从 npm（正式发布版）
dsh plugin --profile web add dsh-local-ai

# 2. 在 profile patch（cordis.yml）里配置路由并重启
dsh --profile web
```

最小路由配置（该规则在 `cordis.patch.yml` 里以注释形式给出）：

```yaml
- insert:
    - id: dsh-local-ai
      name: dsh-local-ai
      config:
        route:
          - model: llama3.2
            keywords: ["confidential", "offline"]
```

验证 row 是否挂载：

```sh
dsh --profile web --dump-config | grep -A2 'id: dsh-local-ai'
```

## Configuration

所有可调参数都是 Schemastery `Config` 字段（可在 cordis.yml 中修改）。按 id 覆盖会替换整个 row —— 重述你需要的每个键。`cordis.patch.yml` 对每个键都有行内注释。

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:11434` | Ollama HTTP API 基础 URL；会追加 `/api/*` 路径 |
| `requestTimeoutMs` | `30000` | 单次请求 HTTP 超时（毫秒） |
| `graceMs` | `15000` | 健康检查 CLI 探测的子进程终止宽限 |
| `defaultContextWindow` | `8192` | 模型无精确值时的上下文容量 |
| `maxTokens` | `4096` | 模型无精确值时的单请求输出上限 |
| `temperature` | *(none)* | 默认采样温度（0..2）；省略则用提供方默认值 |
| `vision` | `true` | 模型报告 vision 能力时声明并序列化图片支持；`false` 保持纯文本路由 |
| `visionCacheTtlMs` | `30000` | `/api/show` 能力探测的缓存毫秒数（`0` 关闭缓存；pull/remove 会使该模型失效） |
| `models` | `[]` | Harness 可见名 → Ollama 模型映射 |
| `models[].name` | *(required)* | Harness 可见模型名（`GenerateOptions.model`） |
| `models[].model` | `= name` | Ollama 模型 id |
| `models[].contextWindow` | *(none)* | 该模型的上下文容量 |
| `models[].maxTokens` | *(none)* | 该模型的输出上限 |
| `models[].temperature` | *(none)* | 该模型的采样温度 |
| `backends` | `[]` | OpenAI 兼容的本地后端（LM Studio / vLLM / llama.cpp） |
| `backends[].name` | *(required)* | 后端名；注册为 provider id `openai:<name>` |
| `backends[].baseURL` | *(required)* | 后端 base URL（含 `/v1`），如 `http://127.0.0.1:1234/v1` |
| `backends[].apiKey` | *(none)* | 可选 bearer API key（多数本地服务器留空） |
| `backends[].models` | `[]` | 界面可见名 → 后端模型映射 |
| `backends[].maxTokens` | `4096` | 该后端无精确值时的输出上限 |
| `backends[].temperature` | *(none)* | 该后端的采样温度 |
| `route` | `[]` | 本地模型路由规则（首个命中生效） |
| `route[].model` | *(required)* | 目标本地模型名 |
| `route[].provider` | `ollama` | 目标 provider id：`ollama` 或 `openai:<name>` |
| `route[].purpose` | *(none)* | 任务类型匹配：`compaction` / `session-title` |
| `route[].keywords` | `[]` | 不区分大小写的请求关键词 |
| `route[].always` | `false` | 把所有符合条件的请求路由到此模型 |

## Tools & surfaces

| 界面 | 类型 | 作用 |
|---|---|---|
| `ollama_list` | 工具 | 列出已安装模型、运行中模型与磁盘占用 |
| `ollama_show` | 工具 | 显示参数尺寸、量化、上下文长度、family、format |
| `ollama_pull` | 工具 | 拉取（下载）模型 |
| `ollama_remove` | 工具 | 删除模型 |
| `ollama_health` | 工具 | 进程存活 + API 响应 |
| `/ollama` | 命令 | 一键状态总览（模型 + 健康 + 建议） |

**消费** 公开 host 服务 `ctx.llm`（`registerAdapter`）、`ctx.tools`、`ctx.subprocess`（CLI 探测）、`ctx.commands`。默认不短路 `llm/stream` —— 路由监听器在无规则命中时透传（`next()`）。

## Permissions & data

- **权限**：对您配置的 Ollama 端点的 `network:outbound`；无原生代码、无文件系统访问、无存储。
- **数据**：展示给模型或用户的每个模型列表/详情、健康事实与错误消息在展示前都经过脱敏（去除端点 userinfo 与密钥查询参数、剥离控制字符、限制长度）。工具与命令结果由 harness 自身的 tool/command 机制记录。
- **凭据**：插件不存储也不读取任何凭据。它只向您配置的端点发起 HTTP 请求，外加本地 `ollama list` 进程探测。

## Security boundaries

- **默认不重路由** —— `route` 列表默认为空；请求只有通过显式规则或显式选择 `ollama` 提供方才会到达本地模型。
- **展示前脱敏** —— 端点地址与本地路径在进入工具输出、`/ollama` 命令或错误消息前都会被脱敏。
- **零捆绑模型** —— 下载与存储是 Ollama 自己的事；包内不含任何模型。
- **失败响亮、失败可控** —— 非法配置导致挂载失败；本地路由在产出内容前失败会回退云端（`next()`），因此 Ollama 宕机不会卡死对话。**唯一例外**：带 `IMAGE_OFFLOAD_REQUIRED` 的失败会被重新抛出而不回退云端——该码是官方图像卸载回路在要求这条本地路由卸下保留图片，回退会跳过回路并把本应只在本地的请求静默发往远端提供方。
- **模型可见 ⟺ 已记录** —— 路由只改变由哪个提供方服务请求（assistant 消息会以 `ollama` 来源记录）；不凭空新增模型可见输入。

## Known limitations

- **npm 0.2.0-rc.2** —— 针对 `@deepseek-ai/dsh@0.2.0-rc.2` 开发与测试；更新版本的 harness 基线预期可用，但由每月 compat workflow 验证。
- **模型声明 vision 时启用视觉** — `/api/show` capabilities 含 `vision` 的模型声明 `inputModalities: ["text","image"]`，并在用户消息上携带 base64 图片载荷（可用 `vision: false` 退出）；纯文本模型仍拒绝图片内容（`UNSUPPORTED_CONTENT`）。
- **中途失败不回退** —— 本地路由一旦开始产出内容，之后的失败会透传（无法撤回）；只有首个 token 前的失败才回退云端。

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc：src + 测试，对发布版 0.2.0-rc.2 类型
pnpm run typecheck:ci  # 严格 tsc，对发布版 rc.2 类型（关闭 skipLibCheck）
pnpm test           # vitest：真实 Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess 机制
pnpm run test:coverage  # 覆盖率门禁（90/80/90/90）
pnpm run build      # tsdown 打包 + tsc 声明（lib/）
pnpm run verify:self-contained  # 依赖声明均来自 registry
pnpm run verify:artifacts       # 构建产物 ESM 面 + bundle patch 存在
node scripts/check-readme-sync.mjs  # 五语 README 同步门禁
node scripts/check-endpoints.mjs  # M3 端点存活探测（Ollama /api/version）
pnpm pack           # 发布用 tarball
```

## Interoperability with other DSH plugins

已对照 **DSH `0.2.0-rc.2`**（本 README 面向的运行时）与 2026-10-05 实测的高星插件集验证。

本插件**不干扰**其他插件，包括广泛安装的高星插件：

- **无工具名冲突。** 所有工具都带命名空间，不占用任何已被内置工具或其他插件持有的裸名。
- **无服务键冲突。** 不提供任何服务键，因此不存在服务键冲突。
- **无 slot 冲突。** 不注册客户端 slot key，因此不参与 `shadows-shipped-ui` 座位争抢。
- **无 HTTP 路由冲突。** 不注册任何 `webServer` 前缀。
- **无 patch 层冲突。** 组合包 patch 只 `insert` 自己那一行，从不覆写内置行的 `config`。
- **无全局改写。** 不改原型、不改写 `process.env`、不替换全局 fetch dispatcher。

**共享事件监听器在构造上就不互相干扰。** 它用 `ctx.on()` 监听顺序敏感事件 `llm/stream` —— Cordis 的**广播**语义：每个监听器都会运行，任何一个都无法饿死其他监听器。**此处每个监听器都通过 `next()` 委托**，因此链条绝不会被短路；改写作用在 `next()` 产出的值上，而不是用它顶替返回：
  - `llm/stream` — also used by `dsh-routing-suite` (7000★).

静态证据：`dsh-plugin-doctor` 的 K10–K13 在本仓全部为 `pass`。

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — 创建者与维护者：适配器、路由、工具、健康检查、脱敏与五语文档。
- [@LABEST-IA](https://github.com/LABEST-IA) — 工具调用 CallId 修复（PR #2），以及工具调用槽位与视觉支持的报告（issue #1、#3、#5）。

## PerryLink DSH Plugin Family

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 DeepSeek Harness 插件家族成员：**87 个活跃维护**，名册共 **95** 个，其中 **5 个已冻结**、**3 个已退役**。完整名单默认折叠，避免每个 README 的首屏被长表淹没；点击展开可查看每一行，原因见「状态」列。

<details>
<summary>展开全部 95 个插件</summary>

| 插件 | 一句话 | 状态 |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 已退役 — 见仓库 README |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 已冻结 — 见仓库 README |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 已冻结 — 见仓库 README |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 已冻结 — 见仓库 README |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 已退役 — 见仓库 README |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 已退役 — 见仓库 README |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
