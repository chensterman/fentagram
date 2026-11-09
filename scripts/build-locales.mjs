import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enPath = join(root, '_locales/en/messages.json')
const en = JSON.parse(await readFile(enPath, 'utf8'))
const dataDir = join(root, 'scripts/locale-data')

/** Chrome requires a placeholders block for every $1$ … $9$ in messages.json. */
function withPlaceholders(message) {
  const entry = { message }
  const seen = new Set()
  for (const match of message.matchAll(/\$(\d)\$/g)) {
    const index = match[1]
    if (seen.has(index)) continue
    seen.add(index)
    entry.placeholders ??= {}
    entry.placeholders[index] = { content: `$${index}`, example: '…' }
  }
  return entry
}

function writeMessages(path, catalog) {
  const out = {}
  for (const [key, value] of Object.entries(catalog)) {
    const message = typeof value === 'string' ? value : value.message
    out[key] = withPlaceholders(message)
  }
  return writeFile(path, `${JSON.stringify(out, null, 2)}\n`)
}

let count = 0
for (const file of (await readdir(dataDir)).sort()) {
  if (!file.endsWith('.json')) continue
  const code = file.replace(/\.json$/, '')
  const partial = JSON.parse(await readFile(join(dataDir, file), 'utf8'))
  const merged = {}
  for (const [key, entry] of Object.entries(en)) {
    const message = typeof partial[key] === 'string' ? partial[key] : partial[key]?.message ?? entry.message
    merged[key] = withPlaceholders(message)
  }
  const dir = join(root, '_locales', code)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'messages.json'), `${JSON.stringify(merged, null, 2)}\n`)
  count += 1
}

await writeMessages(enPath, en)
console.log(`Wrote ${count} locale files plus en/messages.json (with i18n placeholders).`)
