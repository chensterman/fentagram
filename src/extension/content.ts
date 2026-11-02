import { openList } from '../instagram/openList.ts'
import { readHeaderCount } from '../instagram/readList.ts'
import { createDomListReader } from '../instagram/readList.ts'
import { createSnapshot, isFinished } from '../domain/snapshot.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { chromeSnapshotStore } from '../storage/chromeStore.ts'
import { productionCollectOptions } from '../sync/types.ts'
import { runSync } from '../sync/runSync.ts'

let running = false

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'fentagram-sync') return
  if (running) {
    sendResponse({ ok: false, error: 'A sync is already running in this tab.' })
    return
  }
  running = true
  syncFromPage()
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : 'Sync failed.'
      sendResponse({ ok: false, error: text })
    })
    .finally(() => {
      running = false
    })
  return true
})

async function syncFromPage(): Promise<Snapshot> {
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
  remember(current, statusLine(current))

  const result = await runSync(
    current,
    {
      followers: createDomListReader(document, 'followers'),
      following: createDomListReader(document, 'following'),
    },
    productionCollectOptions,
    () => new Date().toISOString(),
    {
      beforeList: (list) => openList(document, list),
      onProgress: (snapshot) => remember(snapshot, statusLine(snapshot)),
    },
  )
  await writes
  await store.save(result)
  publish(result, statusLine(result))
  return result
}

function publish(snapshot: Snapshot, status: string): void {
  chrome.runtime.sendMessage({ type: 'fentagram-progress', snapshot, status }).catch(() => {})
}

function statusLine(snapshot: Snapshot): string {
  if (snapshot.phase === 'done') return 'Sync finished.'
  const list = snapshot.phase === 'following' ? 'following' : 'followers'
  const collected = list === 'following' ? snapshot.following.length : snapshot.followers.length
  const header = readHeaderCount(document, list)
  const noun = list === 'following' ? 'Following' : 'Followers'
  if (snapshot.stopReason === 'paused') return `Paused during ${list}. ${collected} saved.`
  if (header) return `${noun} · ${collected} of ${header.value.toLocaleString()}`
  return `${noun} · ${collected} saved`
}
