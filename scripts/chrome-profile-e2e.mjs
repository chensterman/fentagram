/**
 * E2E on Leon (Personal) / Profile 1 with Fentagram already loaded in that profile.
 * Quits Chrome, refreshes a profile copy, opens @jingjangly, runs Sync from the side panel.
 */
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chromeSource = join(process.env.HOME ?? '', 'Library/Application Support/Google/Chrome')
const e2eUserData = join(process.env.HOME ?? '', '.fentagram-chrome-e2e')
const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profileDirectory = process.env.CHROME_PROFILE ?? 'Profile 1'
const profileLabel = process.env.CHROME_PROFILE_LABEL ?? 'Leon (Personal)'
const instagram = 'https://www.instagram.com/jingjangly/'
const debugPort = Number(process.env.CHROME_DEBUG_PORT ?? 9333)

process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules', '.playwright-browsers')

console.log(`Profile: ${profileLabel} (${profileDirectory})`)

spawnSync('osascript', ['-e', 'tell application "Google Chrome" to quit'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 3000))

console.log('Syncing profile copy (includes your installed Fentagram)…')
rmSync(e2eUserData, { recursive: true, force: true })
mkdirSync(join(e2eUserData, profileDirectory), { recursive: true })
cpSync(join(chromeSource, 'Local State'), join(e2eUserData, 'Local State'))
cpSync(join(chromeSource, profileDirectory), join(e2eUserData, profileDirectory), { recursive: true })

const dist = join(root, 'dist')

function installedExtensionId(profilePath) {
  try {
    const data = JSON.parse(readFileSync(join(profilePath, 'Secure Preferences'), 'utf8'))
    for (const [id, info] of Object.entries(data.extensions?.settings ?? {})) {
      const path = String(info.path ?? '')
      if (path === dist || path.endsWith('/fentagram/dist')) return id
    }
  } catch {
    /* prefs not readable yet */
  }
  return ''
}

function launchChrome(extraArgs) {
  const child = spawn(
    chromeBin,
    [
      `--user-data-dir=${e2eUserData}`,
      `--profile-directory=${profileDirectory}`,
      `--remote-debugging-port=${debugPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      ...extraArgs,
      instagram,
    ],
    { stdio: 'ignore', detached: true },
  )
  child.unref()
  return child
}

async function stopChrome(child) {
  if (child?.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      try { child.kill('SIGTERM') } catch { /* already gone */ }
    }
  }
  spawnSync('osascript', ['-e', 'tell application "Google Chrome" to quit'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2000))
}

async function connectChrome() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`)
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return null
}

const knownId = installedExtensionId(join(e2eUserData, profileDirectory))
console.log('Installed extension ID:', knownId || '(not in copied prefs)')

const launches = [
  [],
  ['--disable-features=DisableLoadExtensionCommandLineSwitch', `--load-extension=${dist}`],
]

let browser
let chrome
let extensionId = knownId
for (const extraArgs of launches) {
  if (extraArgs.length) {
    console.log('Profile copy did not expose the panel. Relaunching with --load-extension…')
    await stopChrome(chrome)
    await new Promise((r) => setTimeout(r, 1500))
  }
  chrome = launchChrome(extraArgs)
  await new Promise((r) => setTimeout(r, 4000))
  browser = await connectChrome()
  if (!browser) continue
  const probeContext = browser.contexts()[0]
  if (!extensionId) extensionId = await findExtensionId(probeContext)
  if (!extensionId) {
    await browser.close().catch(() => {})
    browser = null
    continue
  }
  const probe = await probeContext.newPage()
  let loaded = false
  try {
    await probe.goto(`chrome-extension://${extensionId}/panel.html`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await probe.locator('.sync').waitFor({ timeout: 10000 })
    loaded = true
  } catch (error) {
    console.log('Panel probe failed:', error instanceof Error ? error.message : error)
    console.log('Probe URL:', probe.url())
  }
  await probe.close().catch(() => {})
  if (loaded) {
    console.log('Fentagram extension ID:', extensionId)
    break
  }
  console.log('Panel did not load for', extensionId)
  await browser.close().catch(() => {})
  browser = null
  extensionId = knownId
}

if (!browser) {
  console.error('Could not load Fentagram in the Profile 1 copy.')
  await stopChrome(chrome)
  process.exit(2)
}

const context = browser.contexts()[0]
if (!context) {
  console.error('No browser context')
  process.exit(2)
}

async function findExtensionId(browserContext) {
  for (let i = 0; i < 15; i += 1) {
    const ids = new Set()
    for (const worker of browserContext.serviceWorkers()) {
      const id = new URL(worker.url()).host
      if (/^[a-p]{32}$/.test(id)) ids.add(id)
    }
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
      const targets = await res.json()
      for (const target of targets) {
        const match = (target.url ?? '').match(/^chrome-extension:\/\/([a-p]{32})\//)
        if (match?.[1]) ids.add(match[1])
      }
    } catch {
      /* ignore */
    }
    for (const id of ids) {
      const probe = await browserContext.newPage()
      try {
        await probe.goto(`chrome-extension://${id}/panel.html`, { waitUntil: 'domcontentloaded', timeout: 8000 })
        await probe.locator('.sync').waitFor({ timeout: 4000 })
        await probe.close()
        return id
      } catch {
        /* not fentagram */
      }
      await probe.close().catch(() => {})
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return ''
}

const igPage = context.pages().find((p) => p.url().includes('instagram.com'))
if (igPage) console.log('Instagram:', await igPage.title(), igPage.url())

const panel = await context.newPage()
await panel.goto(`chrome-extension://${extensionId}/panel.html`, { waitUntil: 'domcontentloaded' })
await panel.locator('.sync').waitFor({ timeout: 15000 })
console.log('Panel:', await panel.locator('#status').textContent())

await panel.locator('.sync').click()
if (igPage) await igPage.bringToFront().catch(() => {})
console.log('Sync started (up to 3 min)…')

const deadline = Date.now() + 180_000
let lastStatus = ''
while (Date.now() < deadline) {
  await panel.waitForTimeout(2500)
  const status = (await panel.locator('#status').textContent()) ?? ''
  if (status !== lastStatus) {
    console.log('  →', status)
    lastStatus = status
  }
  const label = (await panel.locator('.sync').textContent()) ?? ''
  if (!label.includes('…') && lastStatus && !lastStatus.startsWith('Starting')) {
    if (/Last synced|saved|followers|Following|Blocked|profile|Refresh|failed|instagram|Paused|of \d/i.test(lastStatus)) break
  }
}

const counts = await panel.locator('.tabs .count').allTextContents()
console.log('Tab counts:', counts.join(', '))

const ok =
  /Last synced/i.test(lastStatus)
  || counts.some((c) => Number(c) > 0)
  || /of \d/i.test(lastStatus)

console.log(ok ? '\nE2E PASS' : '\nE2E INCOMPLETE')

await browser.close()
console.log('Done (Chrome may still be open on your machine).')
process.exit(ok ? 0 : 1)
