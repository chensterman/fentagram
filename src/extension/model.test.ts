import { describe, expect, test } from 'vitest'
import { account } from '../domain/account.ts'
import { createSnapshot } from '../domain/snapshot.ts'
import type { Snapshot } from '../domain/snapshot.ts'
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
    expect(model.lists.map((list) => list.detail)).toEqual([
      'Shows when both lists finish.',
      'Shows after a second finished sync.',
      'Shows after a second finished sync.',
    ])
  })

  test('shows who does not follow back after one sync', () => {
    const model = panelModel([
      done('one', '2026-11-01T00:00:00.000Z', [account('ada')], [account('ada'), account('bea')]),
    ])
    expect(model.button).toBe('Sync again')
    expect(model.lists[0]?.accounts.map((item) => item.username)).toEqual(['bea'])
    expect(model.lists[1]?.accounts).toEqual([])
    expect(model.lists[1]?.detail).toBe('Shows after a second finished sync.')
  })

  test('shows unfollow changes after a second sync', () => {
    const model = panelModel([
      done('one', '2026-11-01T00:00:00.000Z', [account('ada'), account('cy')], [account('ada')]),
      done('two', '2026-11-02T00:00:00.000Z', [account('cy'), account('bea')], [account('ada')]),
    ])
    expect(model.lists[1]?.accounts.map((item) => item.username)).toEqual(['ada'])
    expect(model.lists[2]?.accounts.map((item) => item.username)).toEqual(['bea'])
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
    expect(model.lists[0]?.accounts).toEqual([])
  })
})
