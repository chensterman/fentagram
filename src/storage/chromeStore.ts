import type { Snapshot } from '../domain/snapshot.ts'
import type { SnapshotStore } from '../storage/store.ts'

const KEY = 'snapshots'

interface ChromeStorage {
  storage: {
    local: {
      get: (key: string) => Promise<Record<string, Snapshot[] | undefined>>
      set: (items: Record<string, Snapshot[]>) => Promise<void>
    }
  }
}

export function chromeSnapshotStore(storage: ChromeStorage['storage'] = chrome.storage): SnapshotStore {
  return {
    async list() {
      const data = await storage.local.get(KEY)
      return [...(data[KEY] ?? [])].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    },
    async get(id) {
      const snapshots = await this.list()
      return snapshots.find((snapshot) => snapshot.id === id) ?? null
    },
    async save(snapshot) {
      const snapshots = await this.list()
      const next = snapshots.filter((item) => item.id !== snapshot.id)
      next.push(snapshot)
      await storage.local.set({ [KEY]: next })
    },
  }
}
