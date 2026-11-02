import { describe, expect, test } from 'vitest'
import { account } from './account.ts'
import { followerHistory } from './history.ts'
import { createSnapshot, type Snapshot } from './snapshot.ts'

function complete(id: string, at: string, followers: string[]): Snapshot {
  return {
    ...createSnapshot(id, at),
    finishedAt: at,
    followers: followers.map((username) => account(username)),
    followersStatus: 'complete',
    followingStatus: 'complete',
    phase: 'done',
    stopReason: 'done',
  }
}

describe('followerHistory', () => {
  test('keeps earlier unfollows after later syncs', () => {
    const history = followerHistory([
      complete('one', '2026-11-01T00:00:00.000Z', ['ada', 'bea']),
      complete('two', '2026-11-02T00:00:00.000Z', ['bea', 'cy']),
      complete('three', '2026-11-03T00:00:00.000Z', ['cy']),
    ])

    expect(history.unfollowed.map((event) => event.account.username)).toEqual(['bea', 'ada'])
    expect(history.unfollowed.map((event) => event.at)).toEqual([
      '2026-11-03T00:00:00.000Z',
      '2026-11-02T00:00:00.000Z',
    ])
    expect(history.followed.map((event) => event.account.username)).toEqual(['cy'])
    expect(history.unfollowed[1]?.account.href).toBe('https://www.instagram.com/ada/')
  })

  test('ignores an incomplete list between two complete syncs', () => {
    const estimated: Snapshot = {
      ...complete('gap', '2026-11-02T00:00:00.000Z', ['bea']),
      followersStatus: 'estimated',
    }
    const history = followerHistory([
      complete('one', '2026-11-01T00:00:00.000Z', ['ada', 'bea']),
      estimated,
      complete('three', '2026-11-03T00:00:00.000Z', ['ada', 'bea']),
    ])

    expect(history.unfollowed).toEqual([])
    expect(history.followed).toEqual([])
  })
})
