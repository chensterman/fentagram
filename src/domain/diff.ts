import { accountKey, type Account } from './account.ts'

export function subtract(source: Account[], removed: Account[]): Account[] {
  const gone = new Set(removed.map((item) => accountKey(item.username)))
  return source
    .filter((item) => item.username.trim() && !gone.has(accountKey(item.username)))
    .sort(byUsername)
}

export function notFollowingBack(followers: Account[], following: Account[]): Account[] {
  return subtract(following, followers)
}

export function unfollowed(previousFollowers: Account[], currentFollowers: Account[]): Account[] {
  return subtract(previousFollowers, currentFollowers)
}

export function newFollowers(previousFollowers: Account[], currentFollowers: Account[]): Account[] {
  return subtract(currentFollowers, previousFollowers)
}

function byUsername(a: Account, b: Account): number {
  return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
}
