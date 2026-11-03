import { PROFILE_NAV_LABELS } from './localeUi.ts'

const PROFILE_PATH = /^\/([A-Za-z0-9._]{1,30})\/?$/

export function normalizeProfilePath(href: string | null): string | null {
  if (!href) return null
  try {
    const path = (href.startsWith('http') ? new URL(href).pathname : href).split('?')[0] ?? ''
    const match = path.match(PROFILE_PATH)
    if (!match?.[1]) return null
    return `/${match[1].toLowerCase()}/`
  } catch {
    return null
  }
}

export function isProfileNavLink(link: HTMLAnchorElement, owner: string | null): boolean {
  const path = normalizeProfilePath(link.getAttribute('href'))
  if (owner && path === `/${owner.toLowerCase()}/`) return true
  const label = (link.textContent ?? '').replace(/\s+/g, ' ').trim()
  return PROFILE_NAV_LABELS.has(label)
}

export function findProfileLink(root: ParentNode, owner: string | null): HTMLAnchorElement | null {
  if (owner) {
    const want = `/${owner.toLowerCase()}/`
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (normalizeProfilePath(link.getAttribute('href')) === want) return link
    }
  }
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a')) {
    const label = (link.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (PROFILE_NAV_LABELS.has(label)) return link
  }
  return null
}
