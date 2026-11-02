import type { Snapshot } from './snapshot.ts'

const WHEN: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

export function formatSyncedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Last synced'
  return `Last synced at ${date.toLocaleString(undefined, WHEN)}`
}

export function lastSyncedStatus(snapshot: Snapshot): string {
  const when = formatSyncedAt(snapshot.finishedAt ?? snapshot.startedAt)
  const short = snapshot.followersStatus === 'estimated' || snapshot.followingStatus === 'estimated'
  return short ? `${when}. A list was short of the profile count.` : when
}
