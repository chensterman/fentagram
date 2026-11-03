import { EDIT_PROFILE_LABELS, MESSAGE_LABELS } from './localeUi.ts'

export type ProfilePlace = 'own' | 'other' | 'loading'

const RESERVED = new Set(['explore', 'reels', 'direct', 'accounts', 'about', 'legal', 'p', 'stories'])
const OWN_SECTIONS = new Set(['followers', 'following'])

export function profilePlace(root: ParentNode, pathname: string, owner: string | null): ProfilePlace {
  const parts = pathname.split('/').filter(Boolean)
  const name = parts[0]?.toLowerCase() ?? ''
  if (!name || RESERVED.has(name)) return 'other'
  if (parts.length > 2) return 'other'
  if (parts.length === 2 && !OWN_SECTIONS.has(parts[1]?.toLowerCase() ?? '')) return 'other'
  if (owner && name === owner.toLowerCase()) {
    if (parts.length === 1 || (parts.length === 2 && OWN_SECTIONS.has(parts[1]?.toLowerCase() ?? ''))) return 'own'
  }
  if (hasLabel(root, EDIT_PROFILE_LABELS)) return 'own'
  if (hasLabel(root, MESSAGE_LABELS)) return 'other'
  if (parts.length === 1) return 'loading'
  return 'other'
}

export function profileOwner(pathname: string): string | null {
  const name = pathname.split('/').filter(Boolean)[0]
  if (!name || RESERVED.has(name.toLowerCase())) return null
  return name
}

function hasLabel(root: ParentNode, labels: Set<string>): boolean {
  for (const node of root.querySelectorAll('a, button, [role="button"], [role="link"]')) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (labels.has(text)) return true
  }
  return false
}
