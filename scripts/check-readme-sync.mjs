#!/usr/bin/env node
// Five-language README sync gate: the Chinese file is the source of truth.
// Every translation must carry the same `## ` section headings in the same
// order and the same configuration-table keys, so a config change cannot
// ship without its translations.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const LANGUAGES = [
  ['README.md', 'zh'],
  ['README.en.md', 'en'],
  ['README.es.md', 'es'],
  ['README.pt.md', 'pt'],
  ['README.hi.md', 'hi'],
]

const headingsOf = (text) => text.split(/\r?\n/u)
  .map(line => /^##\s+(.+)$/u.exec(line)?.[1]?.trim())
  .filter((heading) => heading !== undefined)

// The Configuration section is localized in every file, so match its heading
// in each of the five languages rather than the English word only.
const CONFIG_HEADING =
  /^##\s+(?:Configuration|配置|Configuración|Configuração|कॉन्फ़िगरेशन)\s*$/u

// Table header cells are localized too (Key / 键 / Clave / Chave / कुंजी);
// every other first cell is a config key and must be identical across files.
const CONFIG_HEADERS = new Set(['Key', '键', 'Clave', 'Chave', 'कुंजी'])

// Configuration-table keys: the first cell of every row under the
// "Configuration" section (until the next `## ` heading).
const configKeysOf = (text) => {
  const lines = text.split(/\r?\n/u)
  const start = lines.findIndex(line => CONFIG_HEADING.test(line))
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  const section = lines.slice(start, end === -1 ? undefined : end)
  const keys = []
  for (const line of section) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map(cell => cell.trim())
    if (cells.length < 2) continue
    const key = cells[1]
    if (key === '' || CONFIG_HEADERS.has(key)) continue
    if (/^-+$/u.test(key)) continue
    keys.push(key)
  }
  return keys
}

const failures = []
const reference = LANGUAGES[0]
if (reference === undefined) process.exit(1)
const refPath = path.join(root, reference[0])
if (!existsSync(refPath)) {
  console.error(`${reference[0]} is missing`)
  process.exit(1)
}
const refText = readFileSync(refPath, 'utf8')
const refHeadings = headingsOf(refText)
const refKeys = configKeysOf(refText)

for (const [file, label] of LANGUAGES.slice(1)) {
  const filePath = path.join(root, file)
  if (!existsSync(filePath)) {
    failures.push(`${file}: missing (${label})`)
    continue
  }
  const text = readFileSync(filePath, 'utf8')
  // Section headings are translated, so the invariant is their count and
  // position (same section structure), not their text.
  const headings = headingsOf(text)
  if (headings.length !== refHeadings.length) {
    failures.push(`${file}: ${headings.length} headings, expected ${refHeadings.length}`)
    continue
  }
  const keys = configKeysOf(text)
  if (keys.length !== refKeys.length) {
    failures.push(`${file}: ${keys.length} config keys, expected ${refKeys.length}`)
    continue
  }
  for (let index = 0; index < refKeys.length; index++) {
    if (keys[index] !== refKeys[index]) {
      failures.push(`${file}: config key ${index + 1} is ${JSON.stringify(keys[index])}, expected ${JSON.stringify(refKeys[index])}`)
    }
  }
}

if (failures.length > 0) {
  console.error('readme-sync failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`readme-sync: all ${LANGUAGES.length} READMEs share section structure and config keys`)
