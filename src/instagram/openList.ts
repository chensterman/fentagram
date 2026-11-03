import { listLabel, t } from '../extension/i18n.ts'
import { profileOwner } from './ownProfile.ts'
import { findProfileLink } from './profileNav.ts'
import { closeDialog as closeListDialog } from './dialog.ts'
import { findCountLink, findDialog, markOpenList, readHeaderCount, type ListName } from './readList.ts'

export { findCountLink } from './readList.ts'
export { findProfileLink } from './profileNav.ts'

export function closeDialog(root: ParentNode): void {
  closeListDialog(root)
  markOpenList(null)
}

export async function openList(
  doc: Document,
  list: ListName,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  const owner = profileOwner(doc.location.pathname)
  if (findDialog(doc, list)) return
  if (!readHeaderCount(doc, list, owner)) {
    const profile = findProfileLink(doc, owner)
    if (!profile) throw new Error(t('errOpenProfile'))
    profile.click()
    await waitUntil(() => readHeaderCount(doc, list, owner) !== null, sleep, t('errProfileTimeout'))
  }
  if (doc.querySelector('[role="dialog"]')) {
    closeDialog(doc)
    await waitUntil(
      () => doc.querySelector('[role="dialog"]') === null,
      sleep,
      t('errCloseDialog'),
    )
  }
  const link = findCountLink(doc, list, owner)
  if (!link) throw new Error(t('errCountNotFound', [listLabel(list)]))
  link.click()
  await waitUntil(() => findDialog(doc, list) !== null, sleep, t('errListNotOpen'))
  markOpenList(list)
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
