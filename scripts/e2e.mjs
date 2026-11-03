import { build } from 'esbuild'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules', '.playwright-browsers')
const fixtureDir = join(root, 'e2e/fixtures')
const outHarness = join(root, 'e2e/dist/harness.js')

await build({
  entryPoints: [join(root, 'e2e/harness.ts')],
  bundle: true,
  outfile: outHarness,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
})

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (url.pathname === '/harness.js') {
      const body = await readFile(outHarness)
      response.writeHead(200, { 'Content-Type': 'application/javascript' })
      response.end(body)
      return
    }
    const file = url.pathname === '/' ? '/en-profile.html' : url.pathname
    const path = join(fixtureDir, file.replace(/^\//, ''))
    const body = await readFile(path)
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end('not found')
  }
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const base = `http://127.0.0.1:${port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

const pages = [
  { name: 'en', url: `${base}/en-profile.html` },
  { name: 'pt-BR', url: `${base}/pt-profile.html` },
]

let failed = false
for (const item of pages) {
  await page.goto(item.url, { waitUntil: 'networkidle' })
  await page.waitForSelector('#e2e-result', { timeout: 15_000 })
  const raw = await page.locator('#e2e-result').textContent()
  const result = JSON.parse(raw ?? '{}')
  console.log(`\n[${item.name}]`, result.ok ? 'PASS' : 'FAIL')
  console.log('  checks:', result.checks?.join(', '))
  if (result.errors?.length) {
    failed = true
    console.log('  errors:', result.errors.join('; '))
  }
}

await browser.close()
server.close()
process.exit(failed ? 1 : 0)
