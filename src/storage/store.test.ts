import { describe, expect, test } from 'vitest'
import { account } from '../domain/account.ts'
import { unfollowed } from '../domain/diff.ts'
import { createSnapshot, unfollowDiffIsTrusted } from '../domain/snapshot.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { MemoryStore, previousComplete } from './store.ts'

function finished(id: string, startedAt: string, finishedAt: string, followers: Snapshot['followers']): Snapshot {
  return {
    ...createSnapshot(id, startedAt),
    finishedAt,
    followers,
    following: [account('kept')],
    followersStatus: 'complete',
    followingStatus: 'complete',
    phase: 'done',
    stopReason: 'done',
  }
}

describe('MemoryStore', () => {
  test('reloads a partial run', async () => {
    const store = new MemoryStore()
    const partial: Snapshot = {
      ...createSnapshot('partial', '2026-11-01T00:00:00.000Z'),
      followers: [account('ada')],
      followersStatus: 'partial',
      phase: 'followers',
      stopReason: 'paused',
    }

    await store.save(partial)
    partial.followers.push(account('changed-after-save'))

    expect(await store.get('partial')).toEqual({
      ...createSnapshot('partial', '2026-11-01T00:00:00.000Z'),
      followers: [account('ada')],
      followersStatus: 'partial',
      phase: 'followers',
      stopReason: 'paused',
    })
  })

  test('diffs against the previous finished snapshot, not a newer partial', async () => {
    const store = new MemoryStore()
    const older = finished('older', '2026-11-01T00:00:00.000Z', '2026-11-01T00:05:00.000Z', [
      account('a'),
      account('b'),
    ])
    const newerPartial: Snapshot = {
      ...createSnapshot('newer', '2026-11-02T00:00:00.000Z'),
      followers: [account('b')],
      followersStatus: 'partial',
      stopReason: 'paused',
    }
    const current = finished('current', '2026-11-03T00:00:00.000Z', '2026-11-03T00:05:00.000Z', [
      account('b'),
      account('c'),
    ])

    await store.save(older)
    await store.save(newerPartial)
    await store.save(current)

    const previous = previousComplete(await store.list(), current.id)
    expect(previous?.id).toBe('older')
    expect(unfollowed(previous?.followers ?? [], current.followers).map((item) => item.username)).toEqual(['a'])
    expect(previous && unfollowDiffIsTrusted(previous, current)).toBe(true)
  })
})
