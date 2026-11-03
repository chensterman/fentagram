import { CLOSE_ARIA_LABELS } from './localeUi.ts'

function closeClickTarget(labeled: Element, dialog: Element): HTMLElement | null {
  if (labeled instanceof HTMLElement && typeof labeled.click === 'function') return labeled
  const parent = labeled.parentElement
  if (parent instanceof HTMLElement && parent !== dialog && typeof parent.click === 'function') return parent
  const button = labeled.closest('button')
  if (button instanceof HTMLElement && typeof button.click === 'function') return button
  return null
}

export function closeDialog(root: ParentNode): void {
  const dialog = root.querySelector('[role="dialog"]')
  if (!dialog) return
  for (const label of CLOSE_ARIA_LABELS) {
    const labeled = dialog.querySelector(`[aria-label="${label}"]`)
    if (!labeled) continue
    const target = closeClickTarget(labeled, dialog)
    if (!target) continue
    target.click()
    return
  }
}
