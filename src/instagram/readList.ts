import type { Account } from '../domain/account.ts'
import { parseCount, type CountReading } from '../domain/count.ts'
import type { ListReader, PageSignal } from '../sync/types.ts'

const PROFILE_HREF = /^\/([A-Za-z0-9._]{1,30})\/$/
const RESERVED = new Set(['explore', 'reels', 'direct', 'accounts', 'about', 'legal', 'p', 'stories'])

export type ListName = 'followers' | 'following'

const LIST_TITLE: Record<ListName, string> = {
  followers: 'Followers',
  following: 'Following',
}

export function readAccounts(root: ParentNode, list: ListName): Account[] {
  const dialog = findDialog(root, list)
  if (!dialog) return []
  const scope = findScroller(dialog) ?? dialog
  const links = [
    ...scope.querySelectorAll('a.notranslate[href]'),
    ...scope.querySelectorAll('a[href]'),
  ]
  const seen = new Map<string, Account>()
  for (const link of links) {
    const account = accountFromHref(link.getAttribute('href'))
    if (!account || seen.has(account.username.toLowerCase())) continue
    seen.set(account.username.toLowerCase(), account)
  }
  return [...seen.values()]
}

export function readHeaderCount(root: ParentNode, list: ListName): CountReading | null {
  const label = list === 'followers' ? /followers/i : /following/i
  for (const link of root.querySelectorAll('a')) {
    if (link.closest('[role="dialog"]')) continue
    const text = link.textContent ?? ''
    if (!label.test(text)) continue
    const count = parseCount(text)
    if (count) return count
  }
  return null
}

export function isListLoading(root: ParentNode, list: ListName): boolean {
  const dialog = findDialog(root, list)
  return Boolean(dialog?.querySelector('[role="progressbar"]'))
}

export function isListBlocked(root: ParentNode): boolean {
  const text = root.textContent ?? ''
  return /try again later|confirm it['’]s you|suspicious login/i.test(text)
}

export function findDialog(root: ParentNode, list: ListName): HTMLElement | null {
  const title = LIST_TITLE[list]
  for (const dialog of root.querySelectorAll<HTMLElement>('[role="dialog"]')) {
    const heading = dialog.querySelector('h1, h2, [role="heading"]')
    if (heading?.textContent?.trim() === title) return dialog
  }
  return null
}

export function findScroller(dialog: ParentNode): HTMLElement | null {
  const styled = [...dialog.querySelectorAll<HTMLElement>('div')].filter((element) => {
    const overflow = getComputedStyle(element).overflowY
    return overflow === 'scroll' || overflow === 'auto'
  })
  const withLinks = styled.filter((element) => element.querySelector('a[href]'))
  const candidates = withLinks.length > 0 ? withLinks : styled
  if (candidates.length === 0) return null
  const overflowing = candidates.filter((element) => scrollRange(element) > 8)
  if (overflowing.length > 0) {
    return overflowing.reduce((best, element) => (scrollRange(element) > scrollRange(best) ? element : best))
  }
  return candidates.find((element) => getComputedStyle(element).overflowY === 'scroll') ?? candidates.at(-1) ?? null
}

export function createDomListReader(doc: Document, list: ListName): ListReader {
  return {
    readAccounts: () => readAccounts(doc, list),
    readHeaderCount: () => readHeaderCount(doc, list),
    scrollToEnd() {
      const dialog = findDialog(doc, list)
      const scroller = dialog && findScroller(dialog)
      if (!scroller) return
      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      if (remaining < 4 && scroller.scrollTop > 0) {
        scroller.scrollTop = Math.max(0, scroller.scrollTop - 48)
      }
      scroller.scrollTop = scroller.scrollHeight
    },
    async waitForPage(): Promise<PageSignal> {
      const before = signature(readAccounts(doc, list))
      let stable = 0
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (doc.visibilityState === 'hidden') return 'hidden'
        if (isListBlocked(doc)) return 'blocked'
        await wait(300)
        if (doc.visibilityState === 'hidden') return 'hidden'
        if (isListBlocked(doc)) return 'blocked'
        if (signature(readAccounts(doc, list)) !== before) return 'grew'
        if (isListLoading(doc, list)) {
          stable = 0
          continue
        }
        stable += 1
        if (stable >= 3) return 'settled'
      }
      return 'settled'
    },
    poll() {
      if (doc.visibilityState === 'hidden') return 'hidden'
      if (isListBlocked(doc)) return 'blocked'
      return 'ok'
    },
  }
}

function accountFromHref(href: string | null): Account | null {
  const match = href?.match(PROFILE_HREF)
  const username = match?.[1]
  if (!username || RESERVED.has(username.toLowerCase())) return null
  return {
    username,
    href: `https://www.instagram.com/${username}/`,
  }
}

function scrollRange(element: HTMLElement): number {
  return element.scrollHeight - element.clientHeight
}

function signature(accounts: Account[]): string {
  return accounts
    .map((account) => account.username.toLowerCase())
    .sort()
    .join('\n')
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
