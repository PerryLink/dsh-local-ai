/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-query the authoritative registries) and the
 * default-export guard (module namespace + Loader unwrap round-trip).
 * @module dsh-local-ai/test/lifecycle.spec
 */

import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { describe, expect, it } from 'vitest'
import { mountServices } from './harness.ts'

async function loadPlugin() {
  const module = await import('../src/index.ts')
  return module as unknown as { name: string; inject: string[]; apply: (ctx: never, config?: never) => void }
}

/** A structurally minimal agent; `commands.list` keys global commands off any receiver. */
const agent = { id: 'dsh-local-ai-lifecycle', options: { provider: 'deepseek', model: 'demo' }, session: {} }

// ---------------------------------------------------------------------------
// C2: the function-plugin namespace must survive Loader unwrapping
// ---------------------------------------------------------------------------

describe('export contract', () => {
  it('carries no default export and Loader unwrap round-trips the namespace', async () => {
    const plugin = await import('../src/index.ts')
    expect('default' in plugin).toBe(false)
    const loader = Object.create(Loader.prototype) as { unwrapExports: (mod: unknown) => unknown }
    const unwrapped = loader.unwrapExports(plugin)
    expect(unwrapped).toBe(plugin)
    expect((unwrapped as { name: string }).name).toBe('local-ai')
    expect((unwrapped as { inject: string[] }).inject).toEqual(['llm', 'tools', 'subprocess', 'commands'])
    expect(typeof (unwrapped as { apply: unknown }).apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber removes every registry contribution
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('removes the tools, the ollama adapter, and the /ollama command on dispose', async () => {
    const ctx: Context = await mountServices()
    const plugin = await loadPlugin()
    const fiber = await ctx.plugin(plugin as never, {} as never)
    try {
      expect(ctx.tools.get('ollama_list')).toBeDefined()
      expect(ctx.tools.get('ollama_health')).toBeDefined()
      expect(ctx.llm.listProviders().some(provider => provider.id === 'ollama')).toBe(true)
      expect(ctx.commands.list(agent as never).find(entry => entry.name === 'ollama')).toBeDefined()

      await fiber.dispose()

      expect(ctx.tools.get('ollama_list')).toBeUndefined()
      expect(ctx.tools.get('ollama_health')).toBeUndefined()
      expect(ctx.llm.listProviders().some(provider => provider.id === 'ollama')).toBe(false)
      expect(ctx.commands.list(agent as never).find(entry => entry.name === 'ollama')).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
