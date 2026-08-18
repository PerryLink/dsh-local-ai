// scripts/loader-runner.mjs — real Loader composition runner (community
// five-layer model, layer 4). An independent process boots a real Context,
// mounts the vendored Loader with the Include builtin, reads the given
// cordis.yml (service rows + plugin row + config), then asserts the plugin's
// contributions through the authoritative registries and proves one real
// behavior: a keyword-matched request is re-routed to the local model, so the
// config in the file was honored by the Loader.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml>
// Exit 0 prints DSH_LOADER_RESULT <json>; any assertion or load failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const configArgument = process.argv[2]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml>')
  process.exit(2)
}

const configPath = resolve(configArgument)
// Resolve bare package rows from this repository's dependency tree so the
// composition works with config files written anywhere (e.g. a temp dir).
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

const ctx = new Context()
try {
  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()

  // Authoritative registries carry the plugin's contributions.
  const toolNames = ctx.tools.schemas().map(schema => schema.name)
  for (const name of ['ollama_list', 'ollama_show', 'ollama_pull', 'ollama_remove', 'ollama_health']) {
    if (!toolNames.includes(name)) {
      throw new Error(`Loader composition: ${name} tool is missing from the tools registry`)
    }
  }
  const providers = ctx.llm.listProviders()
  if (!providers.some(provider => provider.id === 'ollama')) {
    throw new Error('Loader composition: ollama adapter is missing from the llm provider registry')
  }
  const agent = { id: 'dsh-local-ai-loader-runner', options: { provider: 'deepseek', model: 'demo' }, session: {} }
  if (ctx.commands.list(agent).find(entry => entry.name === 'ollama') === undefined) {
    throw new Error('Loader composition: /ollama command is missing from the commands registry')
  }

  // Real behavior: the configured keyword rule re-routes the request to the
  // local model. The scripted /api/chat response captures the wire model id,
  // proving the Loader-applied `route` config was honored.
  const chatCalls = []
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    chatCalls.push({ url, init })
    if (url.endsWith('/api/chat')) {
      return new Response(
        '{"message":{"role":"assistant","content":"local reply"},"done":false}\n'
        + '{"message":{},"done":true,"done_reason":"stop"}\n',
        { status: 200 },
      )
    }
    return new Response('{}', { status: 200 })
  }
  const chunks = []
  for await (const chunk of ctx.llm.stream({
    provider: 'deepseek',
    model: 'deepseek-v4',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'handle this confidential note' }], source: { kind: 'user' } })],
  })) chunks.push(chunk)
  const chatCall = chatCalls.find(call => call.url.endsWith('/api/chat'))
  if (chatCall === undefined) throw new Error('Loader composition: no /api/chat request was issued')
  const body = JSON.parse(String(chatCall.init?.body))
  if (body.model !== 'local') {
    throw new Error(`Loader composition: expected re-route to model "local", got ${JSON.stringify(body.model)}`)
  }
  if (!chunks.some(chunk => chunk.type === 'text-delta')) {
    throw new Error('Loader composition: no text delta was streamed from the local route')
  }

  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify({ tools: toolNames, provider: 'ollama', routedModel: body.model })}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}
