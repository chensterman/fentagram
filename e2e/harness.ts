import { profileOwner, profilePlace } from '../src/instagram/ownProfile.ts'
import { openList } from '../src/instagram/openList.ts'
import { isProfileNavLink } from '../src/instagram/profileNav.ts'
import { findDialog, markOpenList, readAccounts, readHeaderCount } from '../src/instagram/readList.ts'

export interface E2EResult {
  ok: boolean
  locale: string
  checks: string[]
  errors: string[]
}

export async function runFlow(doc: Document, owner: string, locale: string): Promise<E2EResult> {
  const checks: string[] = []
  const errors: string[] = []
  const pathname = `/${owner}/`
  Object.defineProperty(doc, 'location', { value: { pathname }, configurable: true })

  markOpenList(null)

  const place = profilePlace(doc, pathname, owner)
  if (place !== 'own') errors.push(`profilePlace expected own, got ${place}`)
  else checks.push('profilePlace:own')

  const nav = doc.querySelector('nav a')
  if (!(nav instanceof HTMLAnchorElement) || !isProfileNavLink(nav, owner)) {
    errors.push('profile nav link not recognized')
  } else checks.push('profileNav')

  const followersHeader = readHeaderCount(doc, 'followers', owner)
  if (!followersHeader) errors.push('followers header missing')
  else checks.push(`followersCount:${followersHeader.value}`)

  const followingHeader = readHeaderCount(doc, 'following', owner)
  if (!followingHeader) errors.push('following header missing')
  else checks.push(`followingCount:${followingHeader.value}`)

  try {
    await openList(doc, 'followers', async () => {})
    if (!findDialog(doc, 'followers')) errors.push('followers dialog missing after openList')
    else checks.push('openList:followers')
    const accounts = readAccounts(doc, 'followers')
    if (!accounts.some((item) => item.username === 'ada')) errors.push('followers list missing ada')
    else checks.push('readAccounts:followers')

    await openList(doc, 'following', async () => {})
    if (!findDialog(doc, 'following')) errors.push('following dialog missing after openList')
    else checks.push('openList:following')
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { ok: errors.length === 0, locale, checks, errors }
}

function publish(result: E2EResult): void {
  const node = document.createElement('pre')
  node.id = 'e2e-result'
  node.textContent = JSON.stringify(result)
  document.body.append(node)
}

const owner = document.body.dataset.owner
const locale = document.documentElement.lang || 'unknown'
if (!owner) {
  publish({ ok: false, locale, checks: [], errors: ['missing data-owner'] })
} else {
  void runFlow(document, owner, locale).then(publish)
}
