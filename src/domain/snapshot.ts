import type { Account } from './account.ts'

export type ListStatus = 'pending' | 'partial' | 'complete' | 'estimated'

export type StopReason = 'done' | 'blocked' | 'paused' | 'stalled'

export interface Snapshot {
  id: string
  startedAt: string
  finishedAt: string | null
  followers: Account[]
  following: Account[]
  followersStatus: ListStatus
  followingStatus: ListStatus
  phase: 'followers' | 'following' | 'done'
  stopReason: StopReason | null
}

export function createSnapshot(id: string, startedAt: string): Snapshot {
  return {
    id,
    startedAt,
    finishedAt: null,
    followers: [],
    following: [],
    followersStatus: 'pending',
    followingStatus: 'pending',
    phase: 'followers',
    stopReason: null,
  }
}

export function isFinished(snapshot: Snapshot): boolean {
  return snapshot.phase === 'done' && snapshot.stopReason === 'done'
}

export function unfollowDiffIsTrusted(previous: Snapshot, current: Snapshot): boolean {
  return previous.followersStatus === 'complete' && current.followersStatus === 'complete'
}
