import type { Account } from '../domain/account.ts'
import { newFollowers, notFollowingBack, unfollowed } from '../domain/diff.ts'
import type { Snapshot } from '../domain/snapshot.ts'
import { isFinished, unfollowDiffIsTrusted } from '../domain/snapshot.ts'
import { previousComplete } from '../storage/store.ts'

export interface PanelList {
  title: string
  detail: string
  accounts: Account[]
}

export interface PanelModel {
  status: string
  button: string
  lists: PanelList[]
}

export function panelModel(snapshots: Snapshot[]): PanelModel {
  const latest = [...snapshots].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
  const previous = latest ? previousComplete(snapshots, latest.id) : null
  const bothReady = latest !== null && isListReady(latest.followersStatus) && isListReady(latest.followingStatus)
  const followerDiffReady = latest !== null && previous !== null && unfollowDiffIsTrusted(previous, latest)

  return {
    status: statusText(latest),
    button: latest && !isFinished(latest) ? 'Resume' : latest ? 'Sync again' : 'Sync',
    lists: [
      {
        title: 'Not following back',
        detail: bothReady ? '' : 'Shows when both lists finish.',
        accounts: bothReady && latest ? notFollowingBack(latest.followers, latest.following) : [],
      },
      {
        title: 'Unfollowed',
        detail: followerDiffReady ? '' : 'Shows after a second finished sync.',
        accounts: followerDiffReady && previous && latest ? unfollowed(previous.followers, latest.followers) : [],
      },
      {
        title: 'New followers',
        detail: followerDiffReady ? '' : 'Shows after a second finished sync.',
        accounts: followerDiffReady && previous && latest ? newFollowers(previous.followers, latest.followers) : [],
      },
    ],
  }
}

function isListReady(status: Snapshot['followersStatus']): boolean {
  return status === 'complete' || status === 'estimated'
}

function statusText(snapshot: Snapshot | null): string {
  if (!snapshot) return 'Open your Instagram profile, then press Sync. Leave that tab in front.'
  const list = snapshot.phase === 'following' ? 'following' : 'followers'
  const count = list === 'following' ? snapshot.following.length : snapshot.followers.length
  if (snapshot.stopReason === 'paused') return `Paused during ${list}. ${count} saved. Come back to the Instagram tab and press Resume.`
  if (snapshot.stopReason === 'blocked') return 'Instagram asked you to try again later. What was collected is saved.'
  if (snapshot.stopReason === 'stalled') return `Instagram stopped sending ${list}. ${count} saved. Press Resume later.`
  if (isFinished(snapshot)) {
    const estimate = snapshot.followersStatus === 'estimated' || snapshot.followingStatus === 'estimated'
    return estimate ? 'Sync finished. A list was short of the profile count.' : 'Sync finished.'
  }
  return `${list === 'following' ? 'Following' : 'Followers'} · ${count} saved`
}
