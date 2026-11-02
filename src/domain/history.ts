import type { Account } from './account.ts'
import { newFollowers, unfollowed } from './diff.ts'
import type { Snapshot } from './snapshot.ts'

export interface FollowerEvent {
  account: Account
  at: string
}

export function followerHistory(snapshots: Snapshot[]): { unfollowed: FollowerEvent[]; followed: FollowerEvent[] } {
  const trusted = snapshots
    .filter((snapshot) => snapshot.followersStatus === 'complete')
    .sort((a, b) => stamp(a).localeCompare(stamp(b)))
  const lost: FollowerEvent[] = []
  const gained: FollowerEvent[] = []
  for (let index = 1; index < trusted.length; index += 1) {
    const previous = trusted[index - 1]
    const current = trusted[index]
    if (!previous || !current) continue
    const at = stamp(current)
    for (const account of unfollowed(previous.followers, current.followers)) lost.push({ account, at })
    for (const account of newFollowers(previous.followers, current.followers)) gained.push({ account, at })
  }
  return {
    unfollowed: lost.sort(byRecent),
    followed: gained.sort(byRecent),
  }
}

function stamp(snapshot: Snapshot): string {
  return snapshot.finishedAt ?? snapshot.startedAt
}

function byRecent(a: FollowerEvent, b: FollowerEvent): number {
  const byTime = b.at.localeCompare(a.at)
  if (byTime !== 0) return byTime
  return a.account.username.localeCompare(b.account.username, undefined, { sensitivity: 'base' })
}
