const KEY = 'avatars'

interface AvatarStorage {
  storage: {
    local: {
      get: (key: string) => Promise<Record<string, unknown>>
      set: (items: Record<string, Record<string, string>>) => Promise<void>
    }
  }
}

export function chromeAvatarStore(storage: AvatarStorage['storage'] = chrome.storage): {
  list: () => Promise<Record<string, string>>
  save: (entries: Record<string, string>) => Promise<void>
} {
  return {
    async list() {
      const data = await storage.local.get(KEY)
      const value = data[KEY]
      if (!value || typeof value !== 'object') return {}
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => {
          return typeof entry[1] === 'string' && entry[1].startsWith('data:image/')
        }),
      )
    },
    async save(entries) {
      if (Object.keys(entries).length === 0) return
      const current = await this.list()
      await storage.local.set({ [KEY]: { ...current, ...entries } })
    },
  }
}
