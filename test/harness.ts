/**
 * Shared test harness: REAL Cordis `Context` and the REAL 0.1.1-rc.2 service
 * seams the plugin consumes — `LlmRuntime`, `SystemPrompt`+`ToolRuntime`,
 * `CommandRuntime`, and the local subprocess provider. Only the network edge
 * (global `fetch`) is scripted, per test.
 * @module dsh-local-ai/test/harness
 */

import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'

/**
 * Mount the real service seams the plugin injects. `SystemPrompt` is mounted
 * before `ToolRuntime` (its hard dependency).
 * @returns the mounting context.
 */
export async function mountServices(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(LocalSubprocessRuntime)
  return ctx
}
