import type { ListReader } from './types.ts'
import type { CollectOptions } from './types.ts'
import { collectList } from './machine.ts'
import type { Snapshot } from '../domain/snapshot.ts'

export interface SyncHooks {
  onProgress?: (snapshot: Snapshot) => void
  beforeList?: (list: 'followers' | 'following') => Promise<void> | void
}

export async function runSync(
  snapshot: Snapshot,
  readers: { followers: ListReader; following: ListReader },
  options: CollectOptions,
  now: () => string,
  hooks?: SyncHooks,
): Promise<Snapshot> {
  let current = cloneSnapshot(snapshot)

  if (current.phase === 'followers') {
    await hooks?.beforeList?.('followers')
    const result = await collectList(readers.followers, current.followers, withProgress(options, (accounts) => {
      current = { ...current, followers: accounts, followersStatus: 'partial', phase: 'followers', stopReason: null }
      hooks?.onProgress?.(current)
    }))
    const advanced = result.status === 'complete' || result.status === 'estimated'
    current = {
      ...current,
      followers: result.accounts,
      followersStatus: result.status,
      stopReason: advanced ? null : result.stopReason,
      phase: advanced ? 'following' : 'followers',
    }
    hooks?.onProgress?.(current)
    if (!advanced) return current
  }

  if (current.phase === 'following') {
    await hooks?.beforeList?.('following')
    const result = await collectList(readers.following, current.following, withProgress(options, (accounts) => {
      current = { ...current, following: accounts, followingStatus: 'partial', phase: 'following', stopReason: null }
      hooks?.onProgress?.(current)
    }))
    const advanced = result.status === 'complete' || result.status === 'estimated'
    current = {
      ...current,
      following: result.accounts,
      followingStatus: result.status,
      stopReason: advanced ? 'done' : result.stopReason,
      phase: advanced ? 'done' : 'following',
      finishedAt: advanced ? now() : null,
    }
    hooks?.onProgress?.(current)
  }

  return current
}

function withProgress(options: CollectOptions, onAccounts: (accounts: Snapshot['followers']) => void): CollectOptions {
  return {
    ...options,
    onProgress(update) {
      onAccounts([...update.accounts].sort((a, b) => a.username.localeCompare(b.username)))
    },
  }
}

function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    followers: [...snapshot.followers],
    following: [...snapshot.following],
  }
}
