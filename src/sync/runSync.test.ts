import { describe, expect, test } from 'vitest'
import { account } from '../domain/account.ts'
import { newFollowers, notFollowingBack, unfollowed } from '../domain/diff.ts'
import { createSnapshot, unfollowDiffIsTrusted } from '../domain/snapshot.ts'
import { parseCount } from '../domain/count.ts'
import { FakeList, names, pageOf } from './fakeList.ts'
import { runSync } from './runSync.ts'
import type { CollectOptions } from './types.ts'

const options: CollectOptions = {
  delayMs: 0,
  backoffMs: 0,
  settleStrikes: 3,
  maxStallRetries: 3,
  maxSteps: 100,
  sleep: async () => {},
}

function exact(value: number) {
  const reading = parseCount(String(value))
  if (!reading) throw new Error('expected a count')
  return reading
}

describe('runSync', () => {
  test('resumes following when followers already finished', async () => {
    const followers = [pageOf(0, 10, 'fan')]
    const following = [pageOf(0, 10, 'follow')]
    const followerList = new FakeList(followers, exact(10))
    const followingList = new FakeList(following, exact(10))
    const snapshot = {
      ...createSnapshot('run-1', '2026-11-01T00:00:00.000Z'),
      followers: followers.flat(),
      followersStatus: 'complete' as const,
      phase: 'following' as const,
    }

    const result = await runSync(
      snapshot,
      { followers: followerList, following: followingList },
      options,
      () => '2026-11-01T00:05:00.000Z',
    )

    expect(followerList.scrolls).toBe(0)
    expect(result.phase).toBe('done')
    expect(names(result.followers)).toEqual(names(followers.flat()))
    expect(names(result.following)).toEqual(names(following.flat()))
  })

  test('a resumed run collects the same followers as a straight run', async () => {
    const pages = [pageOf(0, 10), pageOf(10, 10), pageOf(20, 10)]
    const followingPages = [pageOf(0, 4, 'follow')]

    const interrupted = new FakeList(pages, exact(30), { hideAfterScrolls: 2 })
    const partial = await runSync(
      createSnapshot('run-2', '2026-11-01T00:00:00.000Z'),
      {
        followers: interrupted,
        following: new FakeList(followingPages, exact(4)),
      },
      options,
      () => '2026-11-01T00:05:00.000Z',
    )

    expect(partial.phase).toBe('followers')
    expect(partial.stopReason).toBe('paused')
    expect(names(partial.followers)).toEqual(names([...pages[0], ...pages[1]]))

    const resumed = await runSync(
      partial,
      {
        followers: new FakeList(pages, exact(30)),
        following: new FakeList(followingPages, exact(4)),
      },
      options,
      () => '2026-11-01T00:10:00.000Z',
    )
    const straight = await runSync(
      createSnapshot('run-3', '2026-11-01T00:00:00.000Z'),
      {
        followers: new FakeList(pages, exact(30)),
        following: new FakeList(followingPages, exact(4)),
      },
      options,
      () => '2026-11-01T00:10:00.000Z',
    )

    expect(names(resumed.followers)).toEqual(names(straight.followers))
    expect(names(resumed.following)).toEqual(names(straight.following))
    expect(resumed.phase).toBe('done')
  })

  test('opens followers before following', async () => {
    const opened: string[] = []
    const followers = new FakeList([pageOf(0, 4, 'fan')], exact(4))
    const following = new FakeList([pageOf(0, 3, 'follow')], exact(3))

    await runSync(
      createSnapshot('run-4', '2026-11-01T00:00:00.000Z'),
      { followers, following },
      options,
      () => '2026-11-01T00:05:00.000Z',
      { beforeList: (list) => { opened.push(list) } },
    )

    expect(opened).toEqual(['followers', 'following'])
  })

  test('diffs two finished snapshots', async () => {
    const previousFollowers = [account('a'), account('b'), account('c')]
    const currentFollowers = [account('b'), account('c'), account('d')]
    const currentFollowing = [account('b'), account('e')]

    expect(notFollowingBack(currentFollowers, currentFollowing).map((item) => item.username)).toEqual(['e'])
    expect(unfollowed(previousFollowers, currentFollowers).map((item) => item.username)).toEqual(['a'])
    expect(newFollowers(previousFollowers, currentFollowers).map((item) => item.username)).toEqual(['d'])
  })
})
