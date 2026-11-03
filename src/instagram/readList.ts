import type { Account } from '../domain/account.ts'
import { parseCount, type CountReading } from '../domain/count.ts'
import { countLinkPattern, DIALOG_TITLES, isBlockedPageText } from './localeUi.ts'
import type { ListReader, PageSignal } from '../sync/types.ts'

const PROFILE_HREF = /^\/([A-Za-z0-9._]{1,30})\/$/
const RESERVED = new Set(['explore', 'reels', 'direct', 'accounts', 'about', 'legal', 'p', 'stories'])

export type ListName = 'followers' | 'following'

let activeDialogList: ListName | null = null

export function markOpenList(list: ListName | null): void {
  activeDialogList = list
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

export function readAvatarSources(root: ParentNode, list: ListName): Array<{ username: string; src: string }> {
  const dialog = findDialog(root, list)
  if (!dialog) return []
  const scope = findScroller(dialog) ?? dialog
  const seen = new Map<string, string>()
  for (const link of scope.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const parsed = accountFromHref(link.getAttribute('href'))
    if (!parsed) continue
    const key = parsed.username.toLowerCase()
    if (seen.has(key)) continue
    const src = avatarSrc(link, scope)
    if (src) seen.set(key, src)
  }
  return [...seen.entries()].map(([username, src]) => ({ username, src }))
}

export function findCountLink(root: ParentNode, list: ListName, owner: string | null = null): HTMLAnchorElement | null {
  const segment = `/${list}`
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (link.closest('[role="dialog"]')) continue
    const href = (link.getAttribute('href') ?? '').split('?')[0] ?? ''
    if (!href.toLowerCase().includes(segment)) continue
    if (owner && !href.toLowerCase().includes(`/${owner.toLowerCase()}${segment}`)) continue
    if (parseCount(link.textContent ?? '')) return link
  }
  const pattern = countLinkPattern(list)
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a')) {
    if (link.closest('[role="dialog"]')) continue
    const text = (link.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (pattern.test(text)) return link
  }
  return null
}

export function readHeaderCount(root: ParentNode, list: ListName, owner: string | null = null): CountReading | null {
  const link = findCountLink(root, list, owner)
  if (!link) return null
  return parseCount(link.textContent ?? '')
}

export function isListLoading(root: ParentNode, list: ListName): boolean {
  const dialog = findDialog(root, list)
  return Boolean(dialog?.querySelector('[role="progressbar"]'))
}

export function isListBlocked(root: ParentNode): boolean {
  return isBlockedPageText(root.textContent ?? '')
}

export function findDialog(root: ParentNode, list: ListName): HTMLElement | null {
  const dialogs = [...root.querySelectorAll<HTMLElement>('[role="dialog"]')]
  if (dialogs.length === 1 && activeDialogList === list) return dialogs[0] ?? null
  const titles = DIALOG_TITLES[list]
  for (const dialog of dialogs) {
    const heading = dialog.querySelector('h1, h2, [role="heading"]')
    const text = heading?.textContent?.trim()
    if (text && titles.has(text)) return dialog
  }
  for (const dialog of dialogs) {
    if (activeDialogList !== list) continue
    if (findScroller(dialog) && dialog.querySelector('a[href]')) return dialog
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

export function createDomListReader(doc: Document, list: ListName, owner: string | null = null): ListReader {
  return {
    readAccounts: () => readAccounts(doc, list),
    readHeaderCount: () => readHeaderCount(doc, list, owner),
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

function avatarSrc(link: HTMLElement, scope: HTMLElement): string | null {
  let node: HTMLElement | null = link
  while (node && node !== scope) {
    const images = [...node.querySelectorAll('img')].filter((img) => (img.currentSrc || img.getAttribute('src') || '').length > 0)
    const profiles = [...node.querySelectorAll('a[href]')].filter((anchor) => accountFromHref(anchor.getAttribute('href')))
    if (images.length > 0 && profiles.length <= 2) {
      const img = images.find((item) => /profile/i.test(item.alt)) ?? images[0]
      return img?.currentSrc || img?.getAttribute('src') || null
    }
    node = node.parentElement
  }
  return null
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
