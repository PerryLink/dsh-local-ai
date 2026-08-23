/**
 * Endpoint-liveness probe suite: covers the pure endpoint-resolution, verdict,
 * error-classification, and timeout helpers exported by
 * `scripts/check-endpoints.mjs`, plus a plain-Node syntax check. The probe
 * never hits the network here — the live probe runs in
 * `.github/workflows/check-endpoints.yml` against a real local Ollama.
 * @module dsh-local-ai/test/check-endpoints.spec
 */

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scriptPath = resolve(repositoryRoot, 'scripts', 'check-endpoints.mjs')

type Endpoint = { name: string; url: string }
type ProbeResult = { status: number | null; error?: string }
type Verdict = { alive: boolean; label: string }

const probeModule = await import(pathToFileURL(scriptPath).href) as {
  resolveEndpoints: (env?: Record<string, string | undefined>) => Endpoint[]
  timeoutMsOf: (env?: Record<string, string | undefined>) => number
  classifyError: (message: string, aborted: boolean) => string
  verdictOf: (result: ProbeResult) => Verdict
}

describe('check-endpoints.mjs syntax', () => {
  it('parses under plain Node', () => {
    const result = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
  })
})

describe('resolveEndpoints', () => {
  it('defaults to the local Ollama /api/version endpoint', () => {
    expect(probeModule.resolveEndpoints({})).toEqual([
      { name: 'ollama', url: 'http://127.0.0.1:11434/api/version' },
    ])
  })

  it('normalizes a bare host:port OLLAMA_HOST to http', () => {
    expect(probeModule.resolveEndpoints({ OLLAMA_HOST: '192.168.1.10:11434' })).toEqual([
      { name: 'ollama', url: 'http://192.168.1.10:11434/api/version' },
    ])
  })

  it('keeps an explicit https OLLAMA_HOST and strips the trailing slash', () => {
    expect(probeModule.resolveEndpoints({ OLLAMA_HOST: 'https://ollama.example.com/' })).toEqual([
      { name: 'ollama', url: 'https://ollama.example.com/api/version' },
    ])
  })

  it('treats an empty OLLAMA_HOST as the default', () => {
    expect(probeModule.resolveEndpoints({ OLLAMA_HOST: '   ' })).toEqual([
      { name: 'ollama', url: 'http://127.0.0.1:11434/api/version' },
    ])
  })

  it('splits CHECK_ENDPOINTS into named absolute URLs', () => {
    expect(probeModule.resolveEndpoints({
      CHECK_ENDPOINTS: 'http://one:11434/api/version, https://two:11434/api/version',
    })).toEqual([
      { name: 'endpoint-1', url: 'http://one:11434/api/version' },
      { name: 'endpoint-2', url: 'https://two:11434/api/version' },
    ])
  })

  it('rejects a malformed CHECK_ENDPOINTS entry', () => {
    expect(() => probeModule.resolveEndpoints({ CHECK_ENDPOINTS: 'not a url' })).toThrow(/valid URL/u)
  })

  it('rejects a non-http(s) CHECK_ENDPOINTS entry', () => {
    expect(() => probeModule.resolveEndpoints({ CHECK_ENDPOINTS: 'ftp://example.com/x' })).toThrow(/http\(s\)/u)
  })
})

describe('timeoutMsOf', () => {
  it('defaults to 15000 when unset', () => {
    expect(probeModule.timeoutMsOf({})).toBe(15_000)
  })

  it('parses a positive TIMEOUT_MS', () => {
    expect(probeModule.timeoutMsOf({ TIMEOUT_MS: '2000' })).toBe(2000)
  })

  it('falls back to the default for invalid values', () => {
    expect(probeModule.timeoutMsOf({ TIMEOUT_MS: 'abc' })).toBe(15_000)
    expect(probeModule.timeoutMsOf({ TIMEOUT_MS: '-1' })).toBe(15_000)
  })
})

describe('classifyError', () => {
  it('classifies the timeout signal', () => {
    expect(probeModule.classifyError('The operation was aborted', true)).toBe('timeout')
  })

  it('classifies DNS resolution failures', () => {
    expect(probeModule.classifyError('getaddrinfo ENOTFOUND bad.host', false)).toBe('DNS')
  })

  it('classifies TLS failures', () => {
    expect(probeModule.classifyError('self-signed certificate', false)).toBe('TLS')
  })

  it('classifies connection-refused', () => {
    expect(probeModule.classifyError('connect ECONNREFUSED 127.0.0.1:11434', false)).toBe('connection-refused')
  })

  it('passes through unknown messages', () => {
    expect(probeModule.classifyError('some unexpected error', false)).toBe('some unexpected error')
  })
})

describe('verdictOf', () => {
  it('marks a 2xx status alive', () => {
    expect(probeModule.verdictOf({ status: 200 })).toEqual({ alive: true, label: '200' })
  })

  it('marks a non-2xx status failed', () => {
    expect(probeModule.verdictOf({ status: 404 })).toEqual({ alive: false, label: '404' })
    expect(probeModule.verdictOf({ status: 500 })).toEqual({ alive: false, label: '500' })
  })

  it('marks a transport error failed with its label', () => {
    expect(probeModule.verdictOf({ status: null, error: 'timeout' })).toEqual({ alive: false, label: 'timeout' })
  })
})
