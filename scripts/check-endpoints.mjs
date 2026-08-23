// scripts/check-endpoints.mjs — M3 endpoint-liveness probe for dsh-local-ai.
// The runtime endpoint is the user's own Ollama server (there is no public
// host), so this probes the configured base URL's `/api/version`: a 2xx
// response means the endpoint is alive and serving Ollama, while a transport
// error (timeout / DNS / TLS / connection-refused) or any non-2xx status means
// it is not. Run locally with `node scripts/check-endpoints.mjs` or on the
// monthly `.github/workflows/check-endpoints.yml` schedule.
//
// Endpoint selection (first match wins):
//   CHECK_ENDPOINTS — whitespace/comma-separated list of full URLs to probe.
//   OLLAMA_HOST      — Ollama base URL (`host:port` or a full http(s) URL);
//                      `/api/version` is appended. Default http://127.0.0.1:11434.
//   TIMEOUT_MS       — per-probe deadline in milliseconds. Default 15000.
import http from 'node:http'
import https from 'node:https'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The default Ollama base URL when no endpoint is configured. */
export const DEFAULT_BASE_URL = 'http://127.0.0.1:11434'

/** The default per-probe deadline in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Normalize an Ollama base URL (`host:port` or a full http(s) URL) to the
 * absolute `/api/version` probe URL.
 * @param {string} host - the raw OLLAMA_HOST value.
 * @returns the absolute probe URL.
 */
export function versionUrlOf(host) {
  const trimmed = host.trim()
  const base = /^https?:\/\//u.test(trimmed) ? trimmed : `http://${trimmed}`
  return `${base.replace(/\/+$/u, '')}/api/version`
}

/** Throw unless `value` parses as an absolute http(s) URL. */
function validateUrl(value, name) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new TypeError(`${name} must be a valid URL, got ${JSON.stringify(value)}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(`${name} must use http(s), got ${JSON.stringify(parsed.protocol)}`)
  }
}

/**
 * Resolve the endpoint list from environment variables. `CHECK_ENDPOINTS` wins
 * as an explicit list of full URLs; otherwise `OLLAMA_HOST` (or the default
 * localhost) is normalized to its `/api/version` URL.
 * @param {Record<string, string | undefined>} [env] - environment (defaults to process.env).
 * @returns an array of `{ name, url }` entries.
 */
export function resolveEndpoints(env = process.env) {
  const explicit = env.CHECK_ENDPOINTS
  if (explicit !== undefined && explicit.trim() !== '') {
    const urls = explicit.split(/[\s,]+/u).map(token => token.trim()).filter(token => token !== '')
    return urls.map((url, index) => {
      validateUrl(url, `CHECK_ENDPOINTS entry ${index + 1}`)
      return { name: `endpoint-${index + 1}`, url }
    })
  }
  const host = (env.OLLAMA_HOST ?? '').trim()
  const url = versionUrlOf(host === '' ? DEFAULT_BASE_URL : host)
  validateUrl(url, 'OLLAMA_HOST')
  return [{ name: 'ollama', url }]
}

/**
 * Resolve the per-probe deadline from `TIMEOUT_MS`; a missing, non-finite, or
 * non-positive value falls back to {@link DEFAULT_TIMEOUT_MS}.
 * @param {Record<string, string | undefined>} [env] - environment (defaults to process.env).
 * @returns the timeout in milliseconds.
 */
export function timeoutMsOf(env = process.env) {
  const raw = env.TIMEOUT_MS
  if (raw === undefined || raw.trim() === '') return DEFAULT_TIMEOUT_MS
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS
}

/**
 * Classify a transport error message into a stable label.
 * @param {string} message - the error message.
 * @param {boolean} aborted - whether the request was aborted by the deadline.
 * @returns the stable label (or the raw message when unknown).
 */
export function classifyError(message, aborted) {
  if (aborted) return 'timeout'
  if (/ENOTFOUND|EAI_AGAIN/u.test(message)) return 'DNS'
  if (/certificate|TLS|SSL|EPROTO/u.test(message)) return 'TLS'
  if (/ECONNREFUSED/u.test(message)) return 'connection-refused'
  return message
}

/**
 * Decide whether a probe result is alive and give it a display label.
 * @param {{ status: number | null, error?: string }} result - the probe result.
 * @returns `{ alive, label }`.
 */
export function verdictOf(result) {
  if (result.status === null) return { alive: false, label: String(result.error) }
  const alive = result.status >= 200 && result.status < 300
  return { alive, label: String(result.status) }
}

/**
 * Probe one endpoint and resolve to `{ status }` or `{ status: null, error }`.
 * @param {string} url - the absolute URL to GET.
 * @param {number} timeoutMs - per-probe deadline in milliseconds.
 * @returns a promise for the probe result.
 */
export function probe(url, timeoutMs) {
  return new Promise((resolvePromise) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const parsed = new URL(url)
    const transport = parsed.protocol === 'https:' ? https : http
    const req = transport.request(parsed, {
      method: 'GET',
      headers: { 'user-agent': 'dsh-local-ai-endpoint-liveness/1.0' },
      signal: controller.signal,
    }, (res) => {
      res.resume()
      clearTimeout(timer)
      resolvePromise({ status: res.statusCode ?? null })
    })
    req.on('error', (error) => {
      clearTimeout(timer)
      const message = String(error?.message ?? error)
      resolvePromise({ status: null, error: classifyError(message, controller.signal.aborted) })
    })
    req.end()
  })
}

/**
 * Probe every resolved endpoint and print structured ok/fail output.
 * @param {Record<string, string | undefined>} [env] - environment (defaults to process.env).
 * @returns the process exit code (0 = all alive, 1 = any failure).
 */
export async function main(env = process.env) {
  const endpoints = resolveEndpoints(env)
  const timeoutMs = timeoutMsOf(env)
  const failures = []
  for (const endpoint of endpoints) {
    const result = await probe(endpoint.url, timeoutMs)
    const verdict = verdictOf(result)
    console.log(`${verdict.alive ? 'OK' : 'FAIL'} ${verdict.label} ${endpoint.name} ${endpoint.url}`)
    if (!verdict.alive) failures.push(`${endpoint.name}: ${verdict.label}`)
  }
  if (failures.length > 0) {
    console.error(`\nendpoint liveness failed:\n- ${failures.join('\n- ')}`)
    return 1
  }
  console.log(`\nendpoint liveness passed: ${endpoints.length} endpoint(s) alive`)
  return 0
}

/** True when this file is the process entry point (not an imported module). */
function isMainModule() {
  if (process.argv[1] === undefined) return false
  const entry = resolve(process.argv[1])
  const self = fileURLToPath(import.meta.url)
  return process.platform === 'win32'
    ? entry.toLowerCase() === self.toLowerCase()
    : entry === self
}

if (isMainModule()) {
  process.exitCode = await main()
}
