import { accountKey } from '../domain/account.ts'
import { profileOwner, profilePlace } from '../instagram/ownProfile.ts'
import { openList } from '../instagram/openList.ts'
import { readAvatarSources, readHeaderCount } from '../instagram/readList.ts'
import { createDomListReader } from '../instagram/readList.ts'
import { isProfileNavLink } from '../instagram/profileNav.ts'
import { shrinkAvatar } from '../instagram/shrinkAvatar.ts'
import { createSnapshot, isFinished } from '../domain/snapshot.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { listLabel, t } from './i18n.ts'
import { lastSyncedStatus } from './status.ts'
import { chromeAvatarStore } from '../storage/avatarStore.ts'
import { chromeSnapshotStore } from '../storage/chromeStore.ts'
import { productionCollectOptions } from '../sync/types.ts'
import { runSync } from '../sync/runSync.ts'

let running = false

watchOwnProfile()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'fentagram-sync') return
  if (running) {
    sendResponse({ ok: false, error: t('syncAlreadyRunning') })
    return
  }
  running = true
  syncFromPage()
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : t('syncFailed')
      sendResponse({ ok: false, error: text })
    })
    .finally(() => {
      running = false
    })
  return true
})

async function syncFromPage(): Promise<Snapshot> {
  const owner = profileOwner(document.location.pathname)
  if (profilePlace(document, document.location.pathname, owner) !== 'own') {
    throw new Error(t('errOpenProfile'))
  }

  const store = chromeSnapshotStore()
  const snapshots = await store.list()
  const latest = snapshots.at(-1) ?? null
  let current = latest && !isFinished(latest) ? latest : createSnapshot(crypto.randomUUID(), new Date().toISOString())
  let writes = Promise.resolve()
  const remember = (snapshot: Snapshot, status: string) => {
    current = snapshot
    writes = writes.then(() => store.save(snapshot))
    publish(snapshot, status)
  }
  remember(current, statusLine(current, owner))

  const result = await runSync(
    current,
    {
      followers: createDomListReader(document, 'followers', owner),
      following: createDomListReader(document, 'following', owner),
    },
    productionCollectOptions,
    () => new Date().toISOString(),
    {
      beforeList: (list) => openList(document, list),
      onProgress: (snapshot) => {
        remember(snapshot, statusLine(snapshot, owner))
        enqueueAvatars(document)
      },
    },
  )
  await writes
  await store.save(result)
  publish(result, statusLine(result, owner))
  return result
}

function publish(snapshot: Snapshot, status: string): void {
  chrome.runtime.sendMessage({ type: 'fentagram-progress', snapshot, status }).catch(() => {})
}

const queued = new Set<string>()
let avatarWrites = Promise.resolve()

function enqueueAvatars(doc: Document): void {
  const found = [...readAvatarSources(doc, 'followers'), ...readAvatarSources(doc, 'following')].filter((item) => {
    const key = accountKey(item.username)
    if (!item.src || queued.has(key)) return false
    queued.add(key)
    return true
  })
  if (found.length === 0) return
  avatarWrites = avatarWrites.then(() => persistAvatars(found)).catch(() => {})
}

async function persistAvatars(found: Array<{ username: string; src: string }>): Promise<void> {
  const store = chromeAvatarStore()
  const existing = await store.list()
  const writes: Record<string, string> = {}
  for (let index = 0; index < found.length; index += 4) {
    await Promise.all(found.slice(index, index + 4).map(async (item) => {
      const key = accountKey(item.username)
      if (existing[key]) return
      const dataUrl = await shrinkAvatar(item.src)
      if (dataUrl) writes[key] = dataUrl
      else queued.delete(key)
    }))
  }
  if (Object.keys(writes).length > 0) await store.save(writes)
}

function watchOwnProfile(): void {
  let path = ''
  let owner: string | null = null
  let place: 'own' | 'other' | null = null
  const publish = () => {
    if (location.pathname !== path) {
      path = location.pathname
      place = null
    }
    const next = profilePlace(document, location.pathname, owner)
    if (next === 'loading' || next === place) return
    place = next
    if (next === 'own') owner = profileOwner(location.pathname) ?? owner
    chrome.runtime.sendMessage({ type: 'fentagram-profile', own: next === 'own' }).catch(() => {})
  }
  let pending = false
  const schedule = () => {
    if (pending) return
    pending = true
    window.setTimeout(() => {
      pending = false
      publish()
    }, 200)
  }
  for (const name of ['pushState', 'replaceState'] as const) {
    const original = history[name]
    history[name] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args)
      schedule()
      return result
    }
  }
  window.addEventListener('popstate', schedule)
  const onProfileLink = (event: Event, type: 'fentagram-arm-panel' | 'fentagram-open-panel') => {
    const target = event.target
    if (!(target instanceof Element)) return
    const link = target.closest('a')
    if (!(link instanceof HTMLAnchorElement)) return
    if (!isProfileNavLink(link, owner)) return
    chrome.runtime.sendMessage({ type }).catch(() => {})
  }
  document.addEventListener('mousedown', (event) => onProfileLink(event, 'fentagram-arm-panel'), true)
  document.addEventListener('click', (event) => onProfileLink(event, 'fentagram-open-panel'), true)
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  publish()
}

function statusLine(snapshot: Snapshot, owner: string | null): string {
  if (snapshot.phase === 'done') return lastSyncedStatus(snapshot)
  const list = snapshot.phase === 'following' ? 'following' : 'followers'
  const collected = list === 'following' ? snapshot.following.length : snapshot.followers.length
  const header = readHeaderCount(document, list, owner)
  const noun = listLabel(list)
  if (snapshot.stopReason === 'paused') return t('statusPausedShort', [noun, String(collected)])
  if (header) return t('statusProgressOf', [noun, String(collected), header.value.toLocaleString()])
  return t('statusProgressSaved', [noun, String(collected)])
}
