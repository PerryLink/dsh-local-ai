<div align="center">

# 🤖 dsh-local-ai

**DeepSeek Harness 的本地模型（Ollama）接入。**

*发现、拉取、删除、查看本地模型，按任务类型或关键词把请求分流到本地模型并在失败时自动回退云端，通过 `/ollama` 一键查看状态总览。*

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

| 项目 | 状态 |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
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
# 1. 把 bundle 安装进你的 profile
dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"

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

## Install & uninstall

- **git 通道**（最新 `main`）：`dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"` —— `prepare` 脚本只使用生产依赖构建。
- **npm 通道**（正式发布版）：`dsh plugin --profile web add dsh-local-ai`。
- **tarball 通道**：在本仓库 `pnpm pack`，然后 `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-local-ai`（或从 profile patch 移除该 row）。

> 如果 pnpm 对本包报告 `ERR_PNPM_IGNORED_BUILDS`，请在 `pnpm-workspace.yaml` 里加 `allowBuilds: { esbuild: true }` —— `dsh` CLI 会打印精确片段。

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
| `models` | `[]` | Harness 可见名 → Ollama 模型映射 |
| `models[].name` | *(required)* | Harness 可见模型名（`GenerateOptions.model`） |
| `models[].model` | `= name` | Ollama 模型 id |
| `models[].contextWindow` | *(none)* | 该模型的上下文容量 |
| `models[].maxTokens` | *(none)* | 该模型的输出上限 |
| `models[].temperature` | *(none)* | 该模型的采样温度 |
| `route` | `[]` | 本地模型路由规则（首个命中生效） |
| `route[].model` | *(required)* | 目标本地模型名 |
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
- **失败响亮、失败可控** —— 非法配置导致挂载失败；本地路由在产出内容前失败会回退云端（`next()`），因此 Ollama 宕机不会卡死对话。
- **模型可见 ⟺ 已记录** —— 路由只改变由哪个提供方服务请求（assistant 消息会以 `ollama` 来源记录）；不凭空新增模型可见输入。

## Known limitations

- **仅 rc.2** —— 针对 `@deepseek-ai/dsh@0.1.1-rc.2` 开发与测试；更新版本的 harness 基线预期可用，但由每月 compat workflow 验证。
- **模型声明 vision 时启用视觉** — `/api/show` capabilities 含 `vision` 的模型声明 `inputModalities: ["text","image"]`，并在用户消息上携带 base64 图片载荷（可用 `vision: false` 退出）；纯文本模型仍拒绝图片内容（`UNSUPPORTED_CONTENT`）。
- **中途失败不回退** —— 本地路由一旦开始产出内容，之后的失败会透传（无法撤回）；只有首个 token 前的失败才回退云端。

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc：src + 测试，对发布版 0.1.1-rc.2 类型
pnpm run typecheck:ci  # 严格 tsc，对发布版 rc.2 类型（关闭 skipLibCheck）
pnpm test           # vitest：真实 Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess 机制
pnpm run test:coverage  # 覆盖率门禁（90/80/90/90）
pnpm run build      # tsdown 打包 + tsc 声明（lib/）
pnpm run verify:self-contained  # 依赖声明均来自 registry
pnpm run verify:artifacts       # 构建产物 ESM 面 + bundle patch 存在
node scripts/check-readme-sync.mjs  # 五语 README 同步门禁
pnpm pack           # 发布用 tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — 创建者与维护者：适配器、路由、工具、健康检查、脱敏与五语文档。

## PerryLink DSH Plugin Family

本项目是由 [PerryLink](https://github.com/PerryLink) 维护的 [29 个 DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果这个对你有用，其他插件很可能也会：

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | 审批链上的第二模型自动审查，默认失败关闭 |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | 持久化后台子代理，带 Web UI 侧边栏、消息与打断 |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind 等价物：快照、会话分叉、一次性恢复 |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | 将 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web 输入框的终端式输入历史：方向键、Ctrl+R 搜索 |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | 工程纪律门禁：需求质询、测试门禁、对抗式审查 |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness 的统一静态图像生成路由。 |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness 的只读性能诊断。 |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH 的 GitHub PR/issue 集成，每次写入都经审批门 |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness 的本地文档知识库。 |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | DeepSeek Harness 的本地模型（Ollama）接入。 |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | 经语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness 的 PII 脱敏中间件——数据到模型前匿名化，展示层还原。 |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的设置页 |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | 带审批门的跨会话记忆：ctx.memory 接缝 + SQLite + memory 工具 |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles 等价的运行时样式切换 |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | 按需 agent 技能形式的插件开发知识库 |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness 插件的多指标质量评分。 |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | 在 Web 侧边栏置顶会话，顺序持久化 |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | 安全审计技能包：密钥扫描、依赖与供应链审查 |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness 插件的隔离式安装冒烟实测。 |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors
