import { t } from './i18n.ts'

function configureSidePanel(): void {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
  chrome.sidePanel.setOptions({ path: 'panel.html', enabled: true }).catch(() => {})
}

configureSidePanel()
chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel()
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'fentagram-start-sync') {
    void startSyncOnInstagram()
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : t('syncFailed') })
      })
    return true
  }

  const tabId = sender.tab?.id
  if (tabId == null) return
  if (message?.type === 'fentagram-arm-panel') {
    chrome.sidePanel.setOptions({ tabId, path: 'panel.html', enabled: true }).catch(() => {})
    return
  }
  if (message?.type === 'fentagram-open-panel') {
    chrome.sidePanel.open({ tabId }).catch(() => {})
    return
  }
  if (message?.type === 'fentagram-profile' && message.own === true) {
    chrome.sidePanel.setOptions({ tabId, path: 'panel.html', enabled: true })
      .then(() => chrome.sidePanel.open({ tabId }))
      .catch(() => {})
  }
})

async function startSyncOnInstagram(): Promise<{ ok: boolean; error?: string }> {
  const tab = await findInstagramTab()
  if (!tab?.id) return { ok: false, error: t('syncNoTab') }
  await ensureContentScript(tab.id)
  const response = (await chrome.tabs.sendMessage(tab.id, { type: 'fentagram-sync' })) as
    | { ok?: boolean; error?: string }
    | undefined
  if (response?.ok) return { ok: true }
  return { ok: false, error: response?.error ?? t('syncRefreshTab') }
}

async function findInstagramTab(): Promise<chrome.tabs.Tab | undefined> {
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (active?.url?.includes('instagram.com')) return active
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' })
  return tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0]
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const pong = (await chrome.tabs.sendMessage(tabId, { type: 'fentagram-ping' })) as { ok?: boolean } | undefined
    if (pong?.ok) return
  } catch {
    // Tab was open before install, or the page is a bfcache snapshot — reload once so manifest scripts attach.
  }
  await chrome.tabs.reload(tabId)
  await waitForTabComplete(tabId)
}

function waitForTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('timeout'))
    }, 45_000)
    const onUpdated = (updatedId: number, info: chrome.tabs.TabChangeInfo) => {
      if (updatedId !== tabId || info.status !== 'complete') return
      globalThis.clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve()
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
  })
}
