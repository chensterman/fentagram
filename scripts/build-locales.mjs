import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enPath = join(root, '_locales/en/messages.json')
const en = JSON.parse(await readFile(enPath, 'utf8'))
const dataDir = join(root, 'scripts/locale-data')

let count = 0
for (const file of (await readdir(dataDir)).sort()) {
  if (!file.endsWith('.json')) continue
  const code = file.replace(/\.json$/, '')
  const partial = JSON.parse(await readFile(join(dataDir, file), 'utf8'))
  const merged = {}
  for (const [key, entry] of Object.entries(en)) {
    const message = typeof partial[key] === 'string' ? partial[key] : partial[key]?.message ?? entry.message
    merged[key] = { message }
  }
  const dir = join(root, '_locales', code)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'messages.json'), `${JSON.stringify(merged, null, 2)}\n`)
  count += 1
}

console.log(`Wrote ${count} _locales/*/messages.json files (en unchanged).`)
