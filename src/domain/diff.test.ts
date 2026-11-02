import { describe, expect, test } from 'vitest'
import { account } from './account.ts'
import { newFollowers, notFollowingBack, unfollowed } from './diff.ts'

describe('relationship diffs', () => {
  test('lists accounts you follow that do not follow you back', () => {
    const followers = [account('b'), account('d')]
    const following = [account('b'), account('e')]

    expect(notFollowingBack(followers, following).map((item) => item.username)).toEqual(['e'])
  })

  test('diffs two follower snapshots', () => {
    const previous = [account('a'), account('b'), account('c')]
    const current = [account('b'), account('C'), account('d')]

    expect(unfollowed(previous, current).map((item) => item.username)).toEqual(['a'])
    expect(newFollowers(previous, current).map((item) => item.username)).toEqual(['d'])
  })
})
