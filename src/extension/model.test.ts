import { describe, expect, test } from 'vitest'
import { account } from '../domain/account.ts'
import { createSnapshot } from '../domain/snapshot.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { formatSyncedAt } from '../domain/syncedAt.ts'
import { panelModel } from './model.ts'

function done(id: string, startedAt: string, followers: Snapshot['followers'], following: Snapshot['following']): Snapshot {
  return {
    ...createSnapshot(id, startedAt),
    finishedAt: startedAt,
    followers,
    following,
    followersStatus: 'complete',
    followingStatus: 'complete',
    phase: 'done',
    stopReason: 'done',
  }
}

describe('panelModel', () => {
  test('starts empty', () => {
    const model = panelModel([])
    expect(model.button).toBe('Sync')
    expect(model.tabs.map((tab) => tab.empty)).toEqual([
      'Shows when both lists finish.',
      'Shows after two finished syncs.',
      'Shows after two finished syncs.',
    ])
  })

  test('sorts people who do not follow back from A to Z', () => {
    const model = panelModel([
      done('one', '2026-11-01T00:00:00.000Z', [account('ada')], [account('zeta'), account('Ada'), account('mike'), account('bea')]),
    ])
    expect(model.button).toBe('Sync again')
    expect(model.status).toBe(formatSyncedAt('2026-11-01T00:00:00.000Z'))
    expect(model.tabs[0]?.entries.map((entry) => entry.account.username)).toEqual(['bea', 'mike', 'zeta'])
    expect(model.tabs[0]?.entries.every((entry) => entry.account.href.startsWith('https://www.instagram.com/'))).toBe(true)
    expect(model.tabs[1]?.entries).toEqual([])
    expect(model.tabs[1]?.empty).toBe('Shows after two finished syncs.')
  })

  test('shows unfollow changes after a second sync', () => {
    const model = panelModel([
      done('one', '2026-11-01T00:00:00.000Z', [account('ada'), account('cy')], [account('ada')]),
      done('two', '2026-11-02T00:00:00.000Z', [account('cy'), account('bea')], [account('ada')]),
    ])
    expect(model.tabs[1]?.entries.map((entry) => entry.account.username)).toEqual(['ada'])
    expect(model.tabs[1]?.entries[0]?.at).toBe('2026-11-02T00:00:00.000Z')
    expect(model.tabs[2]?.entries.map((entry) => entry.account.username)).toEqual(['bea'])
  })

  test('keeps unfollow history from earlier syncs', () => {
    const model = panelModel([
      done('one', '2026-11-01T00:00:00.000Z', [account('ada'), account('bea')], [account('ada')]),
      done('two', '2026-11-02T00:00:00.000Z', [account('bea'), account('cy')], [account('ada')]),
      done('three', '2026-11-03T00:00:00.000Z', [account('cy')], [account('ada')]),
    ])
    expect(model.tabs[1]?.entries.map((entry) => entry.account.username)).toEqual(['bea', 'ada'])
    expect(model.tabs[2]?.entries.map((entry) => entry.account.username)).toEqual(['cy'])
  })

  test('asks for resume when a run is paused', () => {
    const paused: Snapshot = {
      ...createSnapshot('partial', '2026-11-01T00:00:00.000Z'),
      followers: [account('ada')],
      followersStatus: 'partial',
      stopReason: 'paused',
    }
    const model = panelModel([paused])
    expect(model.button).toBe('Resume')
    expect(model.status).toContain('Paused')
    expect(model.tabs[0]?.entries).toEqual([])
  })
})
