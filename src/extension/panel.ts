import type { Account } from '../domain/account.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { chromeSnapshotStore } from '../storage/chromeStore.ts'
import { panelModel, type PanelModel } from './model.ts'

const app = document.querySelector('#app')
if (!app) throw new Error('Missing #app')

let liveStatus: string | null = null
let busy = false

void boot(app)

async function boot(root: Element): Promise<void> {
  const preview = new URLSearchParams(location.search).get('preview')
  if (preview) {
    render(root, panelModel(previewSnapshots(preview)), previewStatus(preview), false, () => {})
    return
  }

  const store = chromeSnapshotStore()
  const draw = async () => {
    const model = panelModel(await store.list())
    render(root, model, liveStatus ?? model.status, busy, () => void startSync(draw))
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
  root.innerHTML = ''
  const header = document.createElement('header')
  const title = document.createElement('h1')
  title.textContent = 'Fentagram'
  const statusNode = document.createElement('p')
  statusNode.id = 'status'
  statusNode.textContent = status
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = disabled ? 'Syncing…' : model.button
  button.disabled = disabled
  button.addEventListener('click', onSync)
  header.append(title, statusNode, button)

  const lists = document.createElement('div')
  lists.id = 'lists'
  for (const list of model.lists) {
    const section = document.createElement('section')
    const heading = document.createElement('h2')
    heading.textContent = list.accounts.length > 0 ? `${list.title} · ${list.accounts.length}` : list.title
    section.append(heading)
    if (list.accounts.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = list.detail
      section.append(empty)
    } else {
      const items = document.createElement('ul')
      for (const account of list.accounts) items.append(accountItem(account))
      section.append(items)
    }
    lists.append(section)
  }
  root.append(header, lists)
}

function accountItem(account: Account): HTMLLIElement {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = account.href
  link.textContent = account.username
  link.target = '_blank'
  link.rel = 'noreferrer'
  item.append(link)
  return item
}

function previewSnapshots(preview: string): Snapshot[] {
  const older = finished('older', '2026-11-01T00:00:00.000Z', ['ada', 'cy'], ['ada', 'bea'])
  const newer = finished('newer', '2026-11-02T00:00:00.000Z', ['cy', 'bea'], ['ada', 'bea'])
  if (preview === 'second') return [older, newer]
  if (preview === 'first') return [older]
  return []
}

function previewStatus(preview: string): string {
  if (preview === 'second') return 'Sync finished.'
  if (preview === 'first') return 'Sync finished.'
  return 'Open your Instagram profile, then press Sync. Leave that tab in front.'
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
