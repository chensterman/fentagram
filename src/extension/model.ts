import type { Account } from '../domain/account.ts'
import { notFollowingBack } from '../domain/diff.ts'
import { followerHistory } from '../domain/history.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { isFinished } from '../domain/snapshot.ts'
import { t, listLabel } from './i18n.ts'
import { lastSyncedStatus } from './status.ts'

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
    button: latest && !isFinished(latest) ? t('buttonResume') : latest ? t('buttonSyncAgain') : t('buttonSync'),
    tabs: [
      {
        id: 'not-following-back',
        title: t('tabNotFollowingBack'),
        empty: ready ? t('emptyNotFollowingReady') : t('emptyNotFollowingWaiting'),
        entries: notFollowing.map((account) => ({ account, at: null })),
      },
      {
        id: 'unfollowed',
        title: t('tabUnfollowed'),
        empty: completeFollowers >= 2 ? t('emptyUnfollowsReady') : t('emptyUnfollowsWaiting'),
        entries: history.unfollowed.map((event) => ({ account: event.account, at: event.at })),
      },
      {
        id: 'followed',
        title: t('tabFollowed'),
        empty: completeFollowers >= 2 ? t('emptyFollowsReady') : t('emptyFollowsWaiting'),
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
  if (!snapshot) return t('statusIdle')
  const list = snapshot.phase === 'following' ? 'following' : 'followers'
  const count = list === 'following' ? snapshot.following.length : snapshot.followers.length
  const noun = listLabel(list)
  if (snapshot.stopReason === 'paused') return t('statusPaused', [noun, String(count)])
  if (snapshot.stopReason === 'blocked') return t('statusBlocked')
  if (snapshot.stopReason === 'stalled') return t('statusStalled', [noun, String(count)])
  if (isFinished(snapshot)) return lastSyncedStatus(snapshot)
  return t('statusProgressSaved', [noun, String(count)])
}
