import { findDialog, readHeaderCount, type ListName } from './readList.ts'

export function findProfileLink(root: ParentNode): HTMLAnchorElement | null {
  for (const link of root.querySelectorAll('a')) {
    if ((link.textContent ?? '').replace(/\s+/g, ' ').trim() === 'Profile') return link
  }
  return null
}

export function findCountLink(root: ParentNode, list: ListName): HTMLAnchorElement | null {
  const pattern = list === 'followers' ? /^\d[\d,.\skKmM]*followers$/i : /^\d[\d,.\skKmM]*following$/i
  for (const link of root.querySelectorAll('a')) {
    if (link.closest('[role="dialog"]')) continue
    const text = (link.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (pattern.test(text)) return link
  }
  return null
}

export function closeDialog(root: ParentNode): void {
  const dialog = root.querySelector('[role="dialog"]')
  if (!dialog) return
  const close = dialog.querySelector<HTMLElement>('[aria-label="Close"]')
  if (!close) return
  const parent = close.parentElement
  const target = parent instanceof HTMLElement && parent !== dialog ? parent : close
  target.click()
}

export async function openList(
  doc: Document,
  list: ListName,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  if (findDialog(doc, list)) return
  if (!readHeaderCount(doc, list)) {
    const profile = findProfileLink(doc)
    if (!profile) throw new Error('Open your Instagram profile, then press Sync.')
    profile.click()
    await waitUntil(() => readHeaderCount(doc, list) !== null, sleep, 'Instagram did not open your profile.')
  }
  if (doc.querySelector('[role="dialog"]')) {
    closeDialog(doc)
    await waitUntil(
      () => doc.querySelector('[role="dialog"]') === null,
      sleep,
      'Could not close the open list. Close it, then press Sync again.',
    )
  }
  const link = findCountLink(doc, list)
  if (!link) throw new Error(`Could not find the ${list} count on your profile.`)
  link.click()
  await waitUntil(() => findDialog(doc, list) !== null, sleep, 'Instagram did not open the list. Refresh the page and try again.')
}

async function waitUntil(
  ready: () => boolean,
  sleep: (ms: number) => Promise<void>,
  message: string,
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (ready()) return
    await sleep(250)
  }
  throw new Error(message)
}
