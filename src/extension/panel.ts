import { accountKey, type Account } from '../domain/account.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { chromeAvatarStore } from '../storage/avatarStore.ts'
import { chromeSnapshotStore } from '../storage/chromeStore.ts'
import { panelModel, type PanelModel, type PanelTabId } from './model.ts'

const app = document.querySelector('#app')
if (!app) throw new Error('Missing #app')

let liveStatus: string | null = null
let busy = false
let selected: PanelTabId = 'not-following-back'
let renderedTab: PanelTabId | null = null
let redraw = () => {}
let pictureBook: Record<string, string> = {}
const scrollTops = new Map<string, number>()

void boot(app)

async function boot(root: Element): Promise<void> {
  const preview = new URLSearchParams(location.search).get('preview')
  if (preview) {
    redraw = () => {
      const model = panelModel(previewSnapshots(preview))
      render(root, model, model.status, false, () => {})
    }
    redraw()
    return
  }

  const store = chromeSnapshotStore()
  const avatars = chromeAvatarStore()
  const draw = async () => {
    const [snapshots, pictures] = await Promise.all([store.list(), avatars.list()])
    pictureBook = pictures
    const model = panelModel(snapshots)
    render(root, model, liveStatus ?? model.status, busy, () => void startSync(draw))
  }
  redraw = () => {
    void draw()
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'fentagram-progress') return
    if (typeof message.status === 'string') liveStatus = message.status
    void draw()
  })
  chrome.storage.onChanged.addListener(() => {
    void draw()
  })
  await draw()
}

async function startSync(draw: () => Promise<void>): Promise<void> {
  busy = true
  liveStatus = 'Starting the sync. Leave the Instagram tab in front.'
  await draw()
  const tab = await instagramTab()
  if (!tab?.id) {
    busy = false
    liveStatus = 'Open instagram.com in a tab, then press Sync.'
    await draw()
    return
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'fentagram-sync' }) as { ok?: boolean; error?: string } | undefined
    if (!response?.ok) liveStatus = response?.error ?? 'Refresh the Instagram tab, then press Sync again.'
  } catch {
    liveStatus = 'Refresh the Instagram tab, then press Sync again.'
  } finally {
    busy = false
    await draw()
  }
}

async function instagramTab(): Promise<chrome.tabs.Tab | undefined> {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (active?.url?.includes('instagram.com')) return active
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' })
  return tabs[0]
}

function render(root: Element, model: PanelModel, status: string, disabled: boolean, onSync: () => void): void {
  rememberScroll(root)
  const previous = renderedTab
  const entering = previous !== selected
  renderedTab = selected
  root.innerHTML = ''
  const panel = pane(model, entering)
  root.append(header(model, status, disabled, onSync), tablist(model), panel)
  panel.scrollTop = scrollTops.get(selected) ?? 0
  if (previous !== null && entering) root.querySelector<HTMLButtonElement>(`#tab-${selected}`)?.focus()
}

function header(model: PanelModel, status: string, disabled: boolean, onSync: () => void): HTMLElement {
  const bar = document.createElement('header')
  const brand = document.createElement('div')
  brand.className = 'brand'
  const mark = document.createElement('img')
  mark.src = 'icons/icon32.png'
  mark.alt = ''
  mark.width = 28
  mark.height = 28
  const title = document.createElement('h1')
  title.textContent = 'Fentagram'
  brand.append(mark, title)

  const statusNode = document.createElement('p')
  statusNode.id = 'status'
  statusNode.textContent = status

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'sync'
  button.textContent = disabled ? 'Syncing…' : model.button
  button.disabled = disabled
  button.addEventListener('click', onSync)
  bar.append(brand, statusNode, button)
  return bar
}

function tablist(model: PanelModel): HTMLElement {
  const nav = document.createElement('div')
  nav.className = 'tabs'
  nav.setAttribute('role', 'tablist')
  nav.setAttribute('aria-label', 'Lists')
  for (const tab of model.tabs) {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = `tab-${tab.id}`
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-selected', String(tab.id === selected))
    button.setAttribute('aria-controls', 'people')
    button.tabIndex = tab.id === selected ? 0 : -1
    const label = document.createElement('span')
    label.textContent = tab.title
    const count = document.createElement('span')
    count.className = 'count'
    count.textContent = String(tab.entries.length)
    button.append(label, count)
    button.addEventListener('click', () => choose(tab.id))
    nav.append(button)
  }
  nav.addEventListener('keydown', (event) => {
    const names = model.tabs.map((tab) => tab.id)
    const index = names.indexOf(selected)
    if (event.key === 'ArrowRight') choose(names[(index + 1) % names.length] ?? selected)
    if (event.key === 'ArrowLeft') choose(names[(index - 1 + names.length) % names.length] ?? selected)
  })
  return nav
}

function pane(model: PanelModel, entering: boolean): HTMLElement {
  const tab = model.tabs.find((item) => item.id === selected) ?? model.tabs[0]
  const panel = document.createElement('section')
  panel.className = entering ? 'pane is-entering' : 'pane'
  panel.id = 'people'
  panel.setAttribute('role', 'tabpanel')
  panel.setAttribute('aria-labelledby', `tab-${tab?.id ?? selected}`)
  panel.dataset.tab = tab?.id ?? selected
  if (!tab) return panel

  if (tab.entries.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = tab.empty
    panel.append(empty)
  } else {
    const items = document.createElement('div')
    items.className = 'people'
    for (const entry of tab.entries) items.append(accountLink(entry.account, entry.at))
    panel.append(items)
  }
  panel.addEventListener('scroll', () => {
    scrollTops.set(panel.dataset.tab ?? selected, panel.scrollTop)
  })
  return panel
}

function choose(id: PanelTabId): void {
  if (id === selected) return
  selected = id
  redraw()
}

function rememberScroll(root: Element): void {
  const existing = root.querySelector<HTMLElement>('.pane')
  const id = existing?.dataset.tab
  if (existing && id) scrollTops.set(id, existing.scrollTop)
}

function accountLink(account: Account, at: string | null): HTMLAnchorElement {
  const link = document.createElement('a')
  link.className = 'person'
  link.href = account.href
  link.target = '_blank'
  link.rel = 'noreferrer'
  const mark = document.createElement('span')
  mark.className = 'mark'
  const photo = pictureBook[accountKey(account.username)]
  if (photo) {
    const img = document.createElement('img')
    img.src = photo
    img.alt = ''
    mark.append(img)
  } else {
    mark.textContent = initial(account.username)
  }
  const who = document.createElement('span')
  who.className = 'who'
  const name = document.createElement('span')
  name.className = 'name'
  name.textContent = account.username
  const url = document.createElement('span')
  url.className = 'url'
  url.textContent = urlLabel(account.href)
  who.append(name, url)
  link.append(mark, who)
  if (at) {
    const time = document.createElement('time')
    time.dateTime = at
    time.textContent = formatWhen(at)
    link.append(time)
  }
  return link
}

function initial(username: string): string {
  return (username.trim()[0] ?? '?').toLocaleUpperCase()
}

function urlLabel(href: string): string {
  try {
    const url = new URL(href)
    return `${url.host}${url.pathname}`.replace(/\/$/, '')
  } catch {
    return href
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function previewSnapshots(preview: string): Snapshot[] {
  const older = finished('older', '2026-11-01T00:00:00.000Z', ['ada', 'cy'], ['ada', 'bea', 'zeta'])
  const middle = finished('middle', '2026-11-08T00:00:00.000Z', ['cy', 'bea'], ['ada', 'bea', 'zeta'])
  const newer = finished('newer', '2026-11-15T00:00:00.000Z', ['bea'], ['ada', 'bea', 'zeta'])
  if (preview === 'second') return [older, middle, newer]
  if (preview === 'first') return [older]
  return []
}

function finished(id: string, startedAt: string, followers: string[], following: string[]): Snapshot {
  return {
    id,
    startedAt,
    finishedAt: startedAt,
    followers: followers.map(person),
    following: following.map(person),
    followersStatus: 'complete',
    followingStatus: 'complete',
    phase: 'done',
    stopReason: 'done',
  }
}

function person(username: string): Account {
  return { username, href: `https://www.instagram.com/${username}/` }
}
