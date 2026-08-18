/**
 * Real Loader composition suite (community five-layer model, layer 4): an
 * independent process mounts the Loader over a cordis.yml with real service
 * rows + the built plugin row + config, proving module unwrapping, inject
 * resolution, config application, the registry contributions, and the route
 * re-routing — paths a hand-built `ctx.plugin` assembly never exercises. Also
 * carries the two negative regressions: invalid config must fail loud for the
 * expected reason (both the Schemastery type error and the `resolveConfig`
 * rule-less-route error), and a default export must fail with the
 * missing-inject reason.
 * @module dsh-local-ai/test/composition.spec
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runner = join(repositoryRoot, 'scripts', 'loader-runner.mjs')
const builtEntry = join(repositoryRoot, 'lib', 'index.js')

/** One cordis.yml: real service rows, then the built plugin row with config. */
function configFor(pluginRow: string, configLines: string[] = []): string {
  return [
    "- name: '@deepseek-ai/dsh-llm'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-commands'",
    "- name: '@deepseek-ai/dsh-subprocess-local'",
    `- name: ${JSON.stringify(pluginRow)}`,
    ...(configLines.length > 0 ? ['  config: ', ...configLines.map(line => `    ${line}`)] : []),
    '',
  ].join('\n')
}

function runRunner(configPath: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [runner, configPath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-local-ai-loader-'))

beforeAll(() => {
  // Build first so the composition exercises the shipped artifact (and A1:
  // the plain-Node built entry must load under the real Loader).
  const build = spawnSync('pnpm', ['run', 'build'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120_000,
  })
  expect(build.status, `build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
}, 120_000)

describe('Loader composition', () => {
  it('mounts the built plugin, registers its contributions, and re-routes a keyword-matched request', () => {
    const configPath = join(temporaryRoot, 'valid.yml')
    writeFileSync(configPath, configFor(pathToFileURL(builtEntry).href, [
      'route:',
      '  - model: local',
      '    keywords:',
      '      - confidential',
    ]))
    const evidence = runRunner(configPath)
    expect(evidence.status, `stdout:\n${evidence.stdout}\nstderr:\n${evidence.stderr}`).toBe(0)
    const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
    expect(marker).not.toBeNull()
    const summary = JSON.parse(marker![1]!) as { tools: string[]; provider: string; routedModel: string }
    for (const tool of ['ollama_list', 'ollama_show', 'ollama_pull', 'ollama_remove', 'ollama_health']) {
      expect(summary.tools).toContain(tool)
    }
    expect(summary.provider).toBe('ollama')
    expect(summary.routedModel).toBe('local')
  })

  it('rejects a Schemastery type error through the Loader for the expected reason', () => {
    const configPath = join(temporaryRoot, 'invalid-type.yml')
    writeFileSync(configPath, configFor(pathToFileURL(builtEntry).href, ['baseURL: 42']))
    const evidence = runRunner(configPath)
    expect(evidence.status).not.toBe(0)
    expect(evidence.stderr).toMatch(/expected string/u)
  })

  it('rejects a rule-less route through the Loader for the expected reason', () => {
    const configPath = join(temporaryRoot, 'invalid-route.yml')
    writeFileSync(configPath, configFor(pathToFileURL(builtEntry).href, [
      'route:',
      '  - model: local',
    ]))
    const evidence = runRunner(configPath)
    expect(evidence.status).not.toBe(0)
    expect(evidence.stderr).toMatch(/purpose/u)
  })

  it('a default export fails through the Loader with the missing-inject reason', () => {
    const wrapper = join(temporaryRoot, 'default-export.mjs')
    const builtUrl = pathToFileURL(builtEntry).href
    writeFileSync(wrapper, [
      `export { name, inject, Config, apply } from ${JSON.stringify(builtUrl)}`,
      `export { apply as default } from ${JSON.stringify(builtUrl)}`,
      '',
    ].join('\n'))
    const configPath = join(temporaryRoot, 'invalid-default.yml')
    writeFileSync(configPath, configFor(pathToFileURL(wrapper).href))
    const evidence = runRunner(configPath)
    expect(evidence.status).not.toBe(0)
    expect(evidence.stderr).toMatch(/without inject/u)
  })
})

describe('teardown', () => {
  it('removes the temporary composition directory', () => {
    rmSync(temporaryRoot, { recursive: true, force: true })
  })
})
