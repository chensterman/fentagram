import type { Account } from '../domain/account.ts'
import { notFollowingBack } from '../domain/diff.ts'
import { followerHistory } from '../domain/history.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { isFinished } from '../domain/snapshot.ts'
import { lastSyncedStatus } from '../domain/syncedAt.ts'

export type PanelTabId = 'not-following-back' | 'unfollowed' | 'followed'

export interface PanelEntry {
  account: Account
  at: string | null
}

export interface PanelTab {
  id: PanelTabId
  title: string
  empty: string
  entries: PanelEntry[]
}

export interface PanelModel {
  status: string
  button: string
  tabs: PanelTab[]
}

export function panelModel(snapshots: Snapshot[]): PanelModel {
  const latest = [...snapshots].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
  const ready = [...snapshots]
    .filter((snapshot) => isListReady(snapshot.followersStatus) && isListReady(snapshot.followingStatus))
    .sort((a, b) => stamp(b).localeCompare(stamp(a)))[0] ?? null
  const history = followerHistory(snapshots)
  const completeFollowers = snapshots.filter((snapshot) => snapshot.followersStatus === 'complete').length
  const notFollowing = ready ? notFollowingBack(ready.followers, ready.following) : []

  return {
    status: statusText(latest),
    button: latest && !isFinished(latest) ? 'Resume' : latest ? 'Sync again' : 'Sync',
    tabs: [
      {
        id: 'not-following-back',
        title: 'Not following back',
        empty: ready ? 'Everyone you follow follows you back.' : 'Shows when both lists finish.',
        entries: notFollowing.map((account) => ({ account, at: null })),
      },
      {
        id: 'unfollowed',
        title: 'Unfollowed',
        empty: completeFollowers >= 2 ? 'No unfollows yet.' : 'Shows after two finished syncs.',
        entries: history.unfollowed.map((event) => ({ account: event.account, at: event.at })),
      },
      {
        id: 'followed',
        title: 'Followed',
        empty: completeFollowers >= 2 ? 'No new follows yet.' : 'Shows after two finished syncs.',
        entries: history.followed.map((event) => ({ account: event.account, at: event.at })),
      },
    ],
  }
}

function isListReady(status: Snapshot['followersStatus']): boolean {
  return status === 'complete' || status === 'estimated'
}

function stamp(snapshot: Snapshot): string {
  return snapshot.finishedAt ?? snapshot.startedAt
}

function statusText(snapshot: Snapshot | null): string {
  if (!snapshot) return 'Open your Instagram profile, then press Sync. Leave that tab in front.'
  const list = snapshot.phase === 'following' ? 'following' : 'followers'
  const count = list === 'following' ? snapshot.following.length : snapshot.followers.length
  if (snapshot.stopReason === 'paused') return `Paused during ${list}. ${count} saved. Come back to the Instagram tab and press Resume.`
  if (snapshot.stopReason === 'blocked') return 'Instagram asked you to try again later. What was collected is saved.'
  if (snapshot.stopReason === 'stalled') return `Instagram stopped sending ${list}. ${count} saved. Press Resume later.`
  if (isFinished(snapshot)) return lastSyncedStatus(snapshot)
  return `${list === 'following' ? 'Following' : 'Followers'} · ${count} saved`
}
